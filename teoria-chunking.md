# Fragmentación de texto (chunking) para RAG

> Teoría y ejemplos reconstruidos de las imágenes 1 a 15, en ese orden. Los fragmentos repetidos entre capturas se presentan una sola vez. Los ejemplos de código se formatearon para facilitar su lectura; al final se señalan sus limitaciones.

## Por qué fragmentar documentos

Antes de generar embeddings de documentos aparece un problema práctico: la mayoría de los modelos de embeddings tienen límites de longitud de entrada. Incluso cuando un documento completo entra en ese límite, representarlo con un único vector puede diluir su especificidad semántica. Si un manual de diez páginas se embebe como un solo vector, después resulta difícil encontrar el párrafo concreto que responde una consulta.

**Chunking** es el proceso de dividir documentos en piezas más pequeñas y semánticamente coherentes que quepan dentro del contexto del modelo. Permite recuperar y combinar varios fragmentos relevantes sin superar las restricciones de tamaño. La estrategia elegida afecta la precisión de recuperación, la preservación del contexto y el rendimiento del sistema.

## Objetivos y parámetros

Una estrategia de chunking equilibra tres objetivos:

1. **Preservación de contexto:** cada fragmento debe contener suficiente información para entenderse por sí mismo.
2. **Precisión de recuperación:** fragmentos más pequeños permiten localizar pasajes específicos.
3. **Eficiencia computacional:** más fragmentos implican más embeddings que generar, almacenar y buscar.

Los parámetros principales son:

- **Tamaño de chunk:** longitud objetivo, típicamente entre **200 y 500 tokens** según el material. Los fragmentos grandes aportan contexto, pero pueden diluir la relevancia; los pequeños aumentan la precisión, aunque pueden perder información necesaria.
- **Solapamiento (*overlap*):** cantidad de contenido final de un fragmento que se repite al comienzo del siguiente; como referencia, **10–30 % del tamaño**. Reduce la pérdida de información en los cortes y preserva la continuidad.
- **Preservación de límites:** decidir si los cortes respetan oraciones o párrafos. Los límites lingüísticos naturales mejoran la coherencia, aunque producen tamaños variables.

## Estrategia 1: tamaño fijo

Divide el texto en fragmentos de longitud predeterminada, normalmente medida en tokens o caracteres.

- **Ventajas:** implementación sencilla y control del tamaño máximo de cada fragmento.
- **Desventajas:** puede cortar oraciones o párrafos y perder significado o contexto.
- **Uso adecuado:** textos donde la coherencia semántica no es tan crítica o cuyo contenido se ajusta naturalmente al tamaño elegido.

Ejemplo de las capturas, presentado con una indentación legible:

```python
def fixed_size_chunking(text, max_tokens):
    words = text.split()
    chunks = []
    current_chunk = []
    current_tokens = 0

    for word in words:
        current_tokens += len(word.split())
        if current_tokens <= max_tokens:
            current_chunk.append(word)
        else:
            chunks.append(' '.join(current_chunk))
            current_chunk = [word]
            current_tokens = len(word.split())

    if current_chunk:
        chunks.append(' '.join(current_chunk))
    return chunks

text = "Your long text here..."
max_tokens = 100
chunks = fixed_size_chunking(text, max_tokens)

for i, chunk in enumerate(chunks):
    print(f"Chunk {i + 1}:\n{chunk}\n")
```

## Estrategia 2: ventana deslizante (*sliding window*)

Genera fragmentos parcialmente solapados para mantener contexto entre segmentos consecutivos. Por ejemplo, con fragmentos de **512** unidades, el siguiente puede comenzar en la unidad **256** del anterior: el solapamiento es de 256 unidades.

- **Ventajas:** mantiene continuidad y reduce el riesgo de perder información situada en un límite.
- **Desventajas:** aumenta la redundancia, los datos almacenados y el costo de procesamiento.
- **Uso adecuado:** tareas en las que conservar el contexto entre fragmentos es crucial, como generación de diálogo o resumen de textos largos.

```python
def sliding_window_chunking(text, chunk_size, overlap_size):
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunks.append(' '.join(words[start:end]))
        start += chunk_size - overlap_size

    return chunks

text = "Your long text here..."
chunk_size = 100
overlap_size = 50
chunks = sliding_window_chunking(text, chunk_size, overlap_size)

for i, chunk in enumerate(chunks):
    print(f"Chunk {i + 1}:\n{chunk}\n")
```

En el ejemplo ilustrado, una frase como «Somos una academia especializada en carreras tecnológicas» aparece parcialmente en dos fragmentos consecutivos para que la transición conserve contexto.

## Estrategia 3: división recursiva (*recursive splitting*)

Parte de unidades grandes, como párrafos, y las subdivide cuando superan el tamaño permitido. La intención es preservar unidades semánticas naturales, como párrafos y oraciones.

- **Ventajas:** mantiene la coherencia del texto y facilita la recuperación de pasajes con sentido completo.
- **Desventajas:** requiere una implementación más compleja y puede producir fragmentos de tamaños desparejos.
- **Uso adecuado:** tareas que requieren precisión semántica, por ejemplo análisis de documentos legales o investigación académica.

El ejemplo mostrado en las imágenes agrupa oraciones hasta alcanzar un límite:

```python
def recursive_splitting(text, max_tokens):
    import nltk

    nltk.download('punkt')
    sentences = nltk.sent_tokenize(text)
    chunks = []
    current_chunk = []
    current_tokens = 0

    for sentence in sentences:
        sentence_tokens = len(sentence.split())
        if current_tokens + sentence_tokens <= max_tokens:
            current_chunk.append(sentence)
            current_tokens += sentence_tokens
        else:
            chunks.append(' '.join(current_chunk))
            current_chunk = [sentence]
            current_tokens = sentence_tokens

    if current_chunk:
        chunks.append(' '.join(current_chunk))
    return chunks

text = "Your long text here..."
max_tokens = 100
chunks = recursive_splitting(text, max_tokens)

for i, chunk in enumerate(chunks):
    print(f"Chunk {i + 1}:\n{chunk}\n")
```

## Metadatos y procedencia (*provenance*)

En sistemas de producción, cada chunk debe llevar metadatos para poder rastrear su origen. En RAG, esto permite vincular una respuesta con el documento y el pasaje que la respaldan.

La estructura ilustrativa de las capturas incluye:

```python
{
    "chunk_id": "doc_42_chunk_0001",  # Identificador único del fragmento
    "source_doc_id": "doc_42",        # Documento de origen
    "chunk_index": 0,                 # Orden en el documento
    "text": "The text content of the chunk...",
    "char_start": 1024,
    "char_end": 1523,
    "token_count": 99,                # Tamaño para presupuestar la entrada
}
```

El material también muestra cómo envolver una función de fragmentación para generar esos objetos:

```python
from datetime import datetime
import uuid

def create_chunks_with_metadata(document_id, document_text, chunk_fn):
    chunks = chunk_fn(document_text)
    chunk_objects = []

    for idx, chunk_text in enumerate(chunks):
        chunk_obj = {
            "chunk_id": str(uuid.uuid4()),
            "document_id": document_id,
            "chunk_index": idx,
            "text": chunk_text,
            "char_start": document_text.find(chunk_text),
            "char_end": document_text.find(chunk_text) + len(chunk_text),
            "token_count": len(chunk_text.split()),
            "created_at": datetime.utcnow().isoformat(),
        }
        chunk_objects.append(chunk_obj)

    return chunk_objects

# Ejemplo ilustrativo de invocación de las imágenes:
chunks = create_chunks_with_metadata(
    document_id="manual_v2.3",
    document_text=document,
    chunk_fn=lambda text: boundary_aware_chunk(text, 500, 2),
)
```

El campo `document_id` del segundo ejemplo cumple la función de `source_doc_id` en la estructura anterior. Estos metadatos permiten:

- **Auditoría:** saber qué versión del documento respaldó una respuesta.
- **Citación:** enlazar la respuesta del LLM con un pasaje específico.
- **Actualizaciones incrementales:** volver a fragmentar solo los documentos modificados.
- **Depuración:** identificar fragmentos que empeoran la recuperación.

## Resumen

Dividir documentos largos en fragmentos de tamaño apropiado permite respetar los límites de entrada y recuperar pasajes precisos. El tamaño, el solapamiento y el respeto de los límites de oraciones o párrafos deben ajustarse según las consultas esperadas y las restricciones del modelo. En RAG, acompañar cada fragmento con metadatos hace posibles la trazabilidad, la citación y la depuración.

### Aclaraciones sobre los ejemplos de las capturas

- Los ejemplos usan `split()` y `len(...split())`: **cuentan palabras separadas por espacios, no tokens reales** del modelo. Para imponer límites en tokens hace falta usar el tokenizador correspondiente.
- El ejemplo denominado `recursive_splitting` **agrupa oraciones, pero no subdivide recursivamente** las oraciones que superen el límite. Si una oración es demasiado larga, podría crear un chunk excesivo e incluso uno vacío antes de ella.
- `document_text.find(chunk_text)` devuelve la **primera** coincidencia, o `-1` si el texto reconstruido no coincide exactamente con el original. Con texto repetido, espacios normalizados o solapamiento puede dar posiciones incorrectas. Los offsets deben conservarse durante el corte original.
- `boundary_aware_chunk` y `document` aparecen en la invocación ilustrativa, pero **no están definidos** en las capturas.
- En la ventana deslizante, `overlap_size` debe ser menor que `chunk_size` para que el recorrido avance.
