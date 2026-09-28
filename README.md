# RAG-M2

RAG autocontenido que responde preguntas del equipo de soporte usando el
manual interno de **Alba People** (empresa ficticia) como única fuente:
`data/faq_document.txt`, 10.408 palabras, versión 4.2 (leída de la línea 2
del manual). Repositorio público: https://github.com/GDC94/RAG-M2

El plan completo, con el diagnóstico y las decisiones fase a fase, está en
`plan.md`. Este README es el resumen operable: cómo instalarlo, correrlo,
evaluarlo y qué se midió.

## Diagramas de la arquitectura

https://claude.ai/artifact/TveBgKpULmTLYSxqePetpq

Esa página muestra el flujo de indexación, el flujo de consulta con
ejemplos paso a paso y el mapa de dependencias entre módulos.

## Requisitos

- Python 3.14
- Una clave de API de OpenAI (`OPENAI_API_KEY`)
- Para la interfaz web: Node.js 20+ y `pnpm`

## Instalación

Con `uv` (recomendado; `uv.lock` fija 96 paquetes):

```bash
uv sync
cp .env.example .env   # completar OPENAI_API_KEY
```

Con `pip`, en un entorno virtual:

```bash
python3.14 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # completar OPENAI_API_KEY
```

Dependencias fijadas: `openai` 3.19.2, `chromadb` 1.5.9, `tiktoken` 0.14.0,
`pydantic` 2.13.5, `python-dotenv` 1.2.3, `rich` 15.0.0, `fastapi` 0.141.1,
`uvicorn` 0.54.0, `pytest` 9.1.1, `httpx` 0.28.1 (solo tests).

## Configuración (`.env`)

Copiar `.env.example` a `.env` y completar la clave. El resto de las
variables tiene un valor por defecto (un valor vacío usa el default):

| Variable | Default | Qué controla |
| --- | --- | --- |
| `OPENAI_API_KEY` | (requerida) | clave de OpenAI, nunca se imprime (`SecretStr`) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | modelo de embeddings |
| `OPENAI_MODEL` | `gpt-4o-mini` | modelo de generación |
| `OPENAI_TIMEOUT` | `30` | timeout por llamada, en segundos |
| `OPENAI_MAX_RETRIES` | `2` | reintentos del SDK de OpenAI |
| `OPENAI_MAX_OUTPUT_TOKENS` | `800` | tope de tokens de salida |
| `RAG_TOP_K` | `3` | vecinos a recuperar |
| `RAG_SIMILARITY_THRESHOLD` | `0.42` | umbral de similitud coseno |
| `RAG_DB_PATH` | `./data/chromadb` | carpeta del índice de Chroma |
| `RAG_COLLECTION_NAME` | `alba-manual` | nombre de la colección |
| `RAG_MAX_CHUNK_TOKENS` | `800` | red de seguridad del chunking |
| `RAG_CHUNK_OVERLAP_RATIO` | `0.15` | solapamiento si una sección excede el tope |
| `RAG_MAX_QUESTION_CHARS` | `1000` | largo máximo de la pregunta |
| `RAG_MAX_CONCURRENT_STREAMS` | `4` | consultas NDJSON activas antes de responder `503` |
| `RAG_JUDGE_MODEL` | `gpt-4.1-mini` | modelo del verificador y del juez |
| `RAG_VERIFY_ANSWER` | `true` | activa el verificador inline |
| `RAG_DEBUG` | `false` | imprime tiempos por etapa en stderr |

## Cómo ejecutar los dos pipelines

Indexar el manual (pipeline de indexación):

```bash
python src/build_index.py                    # usa data/faq_document.txt
python src/build_index.py otro_manual.txt --doc-id otro-manual
```

Consultar (pipeline de consulta):

```bash
python src/query.py "¿Cómo solicito vacaciones?"
python src/query.py "¿Cómo solicito vacaciones?" --pretty
```

Con `uv`, anteponer `uv run` a cualquiera de los comandos anteriores.

## Interfaz web

Un "workbench" de 3 columnas para consultar el manual y ver cómo respondió el
RAG. Pensada para evaluar el sistema, así que muestra todo lo que devuelve el
pipeline, pero solo cuando se pide: fuentes citadas, fragmentos recuperados
con su score, veredicto del verificador, tiempos por etapa y el JSON crudo.

```bash
cd web
pnpm install
pnpm run bootstrap   # uv sync + build_index (solo la primera vez)
pnpm dev:all         # API en :8000 y Vite en :5173
```

Abrir http://localhost:5173. Requiere `OPENAI_API_KEY` en el `.env` de la
raíz. Cada pregunta llama a OpenAI igual que el CLI.

Cómo está armada:

- **API** (`src/api.py`, FastAPI): otro adaptador delgado sobre
  `answer_question`, igual que `query.py`. Abre OpenAI y Chroma una sola vez
  al arrancar.
  - `POST /api/query` devuelve el mismo `QueryResponse` que el CLI.
  - `POST /api/query/stream` devuelve NDJSON: un evento por etapa (`embed`,
    `search`, `generate`, `verify`) al empezar y al terminar, y al final la
    respuesta completa o un error. La respuesta no se transmite token a token:
    llega entera después del verificador, así nunca se muestra un texto que el
    verificador después reemplace.
  - `GET /api/health`.
  - Errores con el mismo formato `{"error": {"code", "message"}}`, mapeados a
    HTTP: `invalid_question`/`invalid_request` 422, `index_empty` 503,
    `provider_error` 502, `provider_timeout` 504, resto 500.
- **Front** (`web/`): Vite, React, TypeScript, Tailwind, Biome, Vitest y Zod.
  Tres columnas: barra lateral del proyecto (colapsable), columna de chat, y
  un panel de detalle que se abre a pedido (desde la tarjeta de resumen, una
  cita o una fuente) con pestañas `Detalle` / `Frag. N` (una por fragmento
  recuperado) / `JSON` (respuesta cruda con resaltado de sintaxis). En
  paneles angostos las pestañas inactivas colapsan a íconos.
  - **Adaptador de datos** (`src/features/ask/viewModel.ts`): traduce el
    `QueryResponse` del backend (`system_answer`, `chunks_related`,
    `verification`, `timings` en segundos, `sources` como títulos de
    sección) a un view-model de UI (ids, tonos de color, milisegundos
    redondeados, fragmentos citados en orden de cita). El backend no expone
    tramos citados dentro del texto (`cited_spans`), así que la UI no resalta
    pasajes citados: cada fragmento citado se marca con un número al final
    de la respuesta que abre su pestaña.
  - Toda respuesta de la API se valida con Zod antes de mostrarse. Cada
    pregunta es independiente; el historial vive solo en el navegador.
  - Componentes de [beUI](https://beui.dev) (MIT, ver
    `web/THIRD_PARTY_NOTICES.md`), vendorizados y adaptados a los tokens de
    la app: `Citations`/`CitationItem` (lista de fuentes), `MessageScroller`
    (transcripción con scroll y `role="log"` para lectores de pantalla),
    `AgentDisclosure` (colapsable) y `OverflowActions` (barra de pestañas
    del panel, extendida con pestaña activa, botón de cierre y modo
    icono-solo).
  - Accesibilidad: todo botón de solo-ícono lleva `aria-label` y `title`;
    focus ring visible en todo elemento interactivo; el estado "Trabajando"
    se anuncia una sola vez (no en cada segundo que corre el contador) vía
    el `role="log"` de la transcripción. Toda animación (springs, shimmer,
    stagger, hovers) respeta `prefers-reduced-motion`.

Scripts de `web/`: `pnpm dev` (solo Vite), `pnpm check` (Biome + tsc),
`pnpm test`, `pnpm build`.

## Contrato de salida (JSON)

`query.py` imprime siempre JSON por `stdout`, incluso en error, para que la
salida sea parseable por otro proceso:

```json
{
  "user_question": "¿Cómo solicito vacaciones?",
  "system_answer": "Desde Ausencias > Nueva solicitud...",
  "chunks_related": [
    {
      "chunk_id": "alba-manual::19",
      "doc_id": "alba-manual",
      "version": "4.2",
      "section_title": "19. Cómo solicitar vacaciones",
      "score": 0.62,
      "text": "..."
    }
  ],
  "status": "answered",
  "verification": { "label": "supported", "reason": "..." },
  "timings": { "embed": 0.041, "search": 0.003, "generate": 0.812, "verify": 0.734, "total": 1.59 }
}
```

- `status`: `answered`, `not_in_manual` o `client_policy`.
- `verification`: `null` si `RAG_VERIFY_ANSWER=false` o si no hubo fuentes
  sobre el umbral (no se llama al verificador); si no, el veredicto
  (`supported`, `unsupported`, `incomplete`, `wrong_status`) y el motivo.
- `timings`: segundos por etapa (`embed`, `search`, `generate`, `total`, y
  `verify` solo si el verificador corrió). Con `RAG_DEBUG=true` las mismas
  etapas también se escriben a `stderr` como `stage=<nombre> seconds=0.041`,
  nunca a `stdout`, para no romper el JSON.

En error, el JSON tiene esta forma y el proceso sale con código 1:

```json
{ "error": { "code": "index_empty", "message": "..." } }
```

Códigos posibles: `config_error`, `invalid_question`, `index_empty`,
`index_model_mismatch`, `ingestion_error`, `provider_error`,
`provider_timeout`, `io_error`, `gold_set_error`.

### `--pretty`

Con `--pretty`, `query.py` no imprime JSON: usa `rich` para mostrar la
pregunta, el estado, el veredicto del verificador (si corrió, con color
según el label) y una tabla con las fuentes recuperadas.

## Evaluación

```bash
python src/evaluate.py recall [--gold data/gold_set.json] [--out PATH]
python src/evaluate.py sweep  [--gold data/gold_set.json] [--out PATH]
python src/evaluate.py judge  [--gold data/gold_set.json] [--out PATH]
```

`data/gold_set.json` tiene 26 preguntas positivas y 8 negativas (fuera de
dominio, inyección y política de cliente).

## Estructura del proyecto

```
src/build_index.py       CLI de indexación
src/query.py             CLI de consulta
src/evaluate.py          CLI de evaluación (recall, sweep, judge)
src/api.py               API HTTP (FastAPI) para la interfaz web
src/rag/
  config.py              Settings, carga de .env
  models.py               modelos Pydantic (Chunk, Answer, QueryResponse, ...)
  errors.py               jerarquía de errores tipados
  client.py               cliente OpenAI, manejo de timeout/reintentos
  ingestion.py            split_manual: corte por sección, offsets, tokens
  embeddings.py           embed_texts
  index.py                ChunkIndex sobre Chroma
  generation.py           generate: prompt, salida estructurada, status
  verification.py         verify: segundo modelo revisa la respuesta
  pipeline.py              build_index, answer_question (la costura)
  evaluation.py            recall, sweep, judge
  render.py                presentación --pretty (sin lógica de negocio)
tests/                    tests deterministas, sin llamadas reales a la API
data/faq_document.txt     manual fuente
data/gold_set.json        lista de examen (26 positivas + 8 negativas)
data/chromadb/            índice persistente (ignorado por git)
outputs/*.json            reportes de recall, sweep, juez y ejemplos
plan.md                   plan detallado y diagnóstico
web/                      interfaz web (Vite + React)
  src/features/ask/        esquemas Zod, cliente de la API, hook y view-model
  src/features/workbench/  UI del workbench (sidebar, chat, panel de detalle)
  src/components/          primitivas propias + componentes vendorizados de beUI (MIT)
```

Dirección de dependencias: scripts y `api.py` → `pipeline` → módulos de etapa →
`config`/`models`/`errors`. OpenAI y Chroma se inyectan por parámetro;
ningún módulo los crea internamente.

## Decisiones técnicas

### Chunking: la sección es la unidad

Cada encabezado `##` del manual produce un chunk; el texto antes del primer
encabezado es el chunk 0. Medido con `tiktoken` (`cl100k_base`, la
codificación de `text-embedding-3-small`) el 2026-09-27:

| Métrica | Valor |
| --- | --- |
| Chunks (preámbulo + 38 secciones) | 39 |
| Tokens totales | 15.528 |
| Mínimo / máximo / media por chunk | 281 / 498 / 398 |
| Chunks por encima del tope | 0 |

Por qué secciones y no un tope fijo de caracteres: el manual está escrito
para citarse por artículo (sección 38, "citar el artículo correcto") y los
tamaños ya son uniformes (281–498 tokens). Partir por caracteres duplicaría
citas sin que ningún requisito lo pida. `RAG_MAX_CHUNK_TOKENS=800` es una
red de seguridad, no un objetivo: si alguna vez una sección lo supera, se
parte por párrafos con 15 % de solapamiento (`RAG_CHUNK_OVERLAP_RATIO`) y
cada fragmento conserva `section_title`. Hoy esto no ocurre. El título va
dentro del texto que se embebe, los offsets se calculan al cortar (nunca
con `str.find`), `chunk_id` es `alba-manual::N` y el `upsert` es idempotente
(reindexar actualiza, no duplica). La colección guarda en sus metadatos el
modelo de embeddings usado; si `EMBEDDING_MODEL` cambia sin reindexar,
`index_model_mismatch` lo dice explícitamente.

### Búsqueda: k-NN por coseno con umbral, calibrado con datos

`score = 1 - distance` sobre el índice HNSW de Chroma. Con 39 vectores esa
estructura equivale en la práctica a una búsqueda exhaustiva; no se vende
como una ventaja de escala que hoy no existe.

Calibración sobre la lista de examen (26 positivas, 8 negativas), medida el
2026-09-27 (`outputs/recall_report_top4_thr030.json`,
`outputs/threshold_sweep.json`):

- Recall 26/26 con `top_k >= 2` hasta umbral 0,44.
- Scores de las positivas en el primer puesto: 0,456–0,698.
- Negativas: fuera de dominio 0,13–0,31; inyección 0,36–0,39;
  política de cliente / tema no cubierto 0,53–0,56.

Elegido: `RAG_TOP_K=3` (ningún acierto pasó del segundo puesto, así que 3
deja un chunk de colchón) y `RAG_SIMILARITY_THRESHOLD=0.42` (margen de
~0,035 a ambos lados: por encima de las inyecciones, por debajo de la
positiva más floja). Con 0,42 el umbral solo frena 5 de las 8 negativas: las
3 restantes sí hablan del manual (cupos de cliente o un tema de RR. HH. que el manual no cubre), y
las resuelve el campo `status` de la generación, no el retrieval.

Búsqueda híbrida (léxica + vectorial): descartada por ahora. Las 4
preguntas de la lista con rutas de pantalla exactas ya acertaban dentro del
segundo puesto; se reconsidera si aparecen fallos atribuibles a vocabulario
exacto.

### Generación y verificador

`gpt-4o-mini`, temperatura 0, salida estructurada con `status` (`answered`,
`not_in_manual`, `client_policy`), `text` y `sources`. Sin chunks sobre el
umbral no se llama al modelo: `not_in_manual` fijo. El código, no el
modelo, redacta el texto final para los estados distintos de `answered`, y
descarta cualquier fuente que el modelo mencione fuera de las recuperadas.

El verificador (`gpt-4.1-mini`, encendido por defecto) revisa pregunta,
fuentes y respuesta, y devuelve `supported`, `unsupported`, `incomplete` o
`wrong_status`; si es `unsupported` o `wrong_status` la respuesta se
reemplaza por un escalamiento. Experimento sobre la lista de examen
(`outputs/judge_report_verify_off.json`, `outputs/judge_report_verify_on.json`):
con el verificador apagado, las 8 negativas ya tenían el `status` correcto,
pero una positiva (p19) se respondió mal ("Auditoría" en vez de
Administración de Nómina) y el juez igual la puntuó 10; el verificador
atrapó ese error. Costo: la latencia por pregunta dentro del pipeline sube
de ~1,3 s a ~2,3 s. Riesgo aceptado: en una de dos corridas también rechazó
una respuesta defendible (p13); el error barato es un escalamiento de más,
no una respuesta inventada. Se apaga con `RAG_VERIFY_ANSWER=false`.

### Juez (bonus)

`python src/evaluate.py judge` corre toda la lista de examen y puntúa 0–10
(relevancia de los chunks, precisión, completitud) con `gpt-4.1-mini`.
Medido: media 9,96 en positivas, 10 en negativas, 8/8 negativas con el
`status` esperado. Limitación observada: es indulgente (puntuó 10 la
respuesta incorrecta de p19); sirve para comparar versiones, no como
verdad, y varía entre corridas aun con temperatura 0.

## Resultados medidos

| Medición | Valor |
| --- | --- |
| Recall (positivas, `top_k=3`, umbral 0,42) | 26/26 |
| Negativas con `status` esperado | 8/8 |
| Nota media del juez (positivas / negativas) | 9,96 / 10 |
| Latencia por pregunta, sin verificador | ~1,3 s |
| Latencia por pregunta, con verificador | ~2,3 s |
| Latencia de una invocación completa de CLI | 4,7–6,8 s (incluye arranque de intérprete y Chroma) |
| Indexar 39 chunks (primera corrida / segunda) | 3,96 s / 1,89 s |

## Costos (precios de OpenAI leídos el 2026-09-27)

| Ítem | Costo |
| --- | --- |
| `text-embedding-3-small` | $0,02 / 1M tokens de entrada |
| `gpt-4o-mini` | $0,15 in / $0,60 out por 1M tokens |
| `gpt-4.1-mini` (verificador y juez) | $0,40 in / $1,60 out por 1M tokens |
| Indexar el manual completo (15.528 tokens) | ≈ $0,0003 |
| Una consulta (generación + verificador) | ≈ $0,001 |
| Una corrida de `judge` sobre las 34 preguntas | ≈ 2–4 centavos |

## Tests

```bash
pytest
```

113 tests, deterministas: Chroma corre en memoria y OpenAI se reemplaza por
fakes con la misma forma que el SDK. No hacen llamadas de red ni gastan
dinero. La API se prueba con el `TestClient` de FastAPI y los mismos fakes.

Front:

```bash
cd web && pnpm test
```

289 tests con Vitest y Testing Library; la API se reemplaza por fakes.

## Límites conocidos

- Si una versión nueva del manual elimina una sección, el chunk viejo queda
  en el índice hasta un reindex completo (no hay borrado incremental).
- El verificador y el juez son modelos: varían entre corridas y pueden
  fallar (ver la sección de generación y verificador).
- La calibración de umbral y `top_k` se hizo sobre 34 preguntas; un corpus
  más grande podría correr valores distintos.
- Sin concurrencia ni límites por usuario: un operador, local. La interfaz
  web corre en la máquina de quien la levanta, con su propia clave.
- Si se corta una consulta desde la web (botón de stop), el backend termina
  igual esa corrida y su costo; solo se descarta el resultado.
- Sin autenticación, multi-tenant ni rate limiting: alcance de un solo
  operador con una sola clave (ver modelo de amenazas en `plan.md`).

## Evolución

Cuando aparezca un segundo usuario, alguien pida acceso sin instalar Python,
o la factura supere el volumen de un operador solo, el siguiente paso es
publicar la API y el front que ya existen (ver "Interfaz web") y agregar
entonces autenticación, rate limiting, tope de gasto y cache de preguntas
repetidas. Con más de un proceso, Chroma pasa a
modo servidor o a pgvector.
