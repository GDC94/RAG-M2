# RAG-M2

RAG autocontenido que responde preguntas del equipo de soporte usando el
manual interno de Alba People (`data/faq_document.txt`) como única fuente.

Estado: fase 0 (estructura y dependencias). El plan completo está en `plan.md`.

## Requisitos

- Python 3.14
- Una clave de API de OpenAI

## Instalación

```bash
python3.14 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # completar OPENAI_API_KEY
```

## Comandos (se agregan en las próximas fases)

```bash
python src/build_index.py                  # indexa el manual
python src/query.py "¿Cómo solicito vacaciones?"
python src/evaluate.py outputs/sample_queries.json
pytest
```

## Estructura

```
src/build_index.py      entrada de indexación
src/query.py            entrada de consulta
src/evaluate.py         evaluación y juez
src/rag/                paquete con las etapas del pipeline
tests/                  tests deterministas, sin llamadas reales a la API
data/faq_document.txt   manual fuente
outputs/                ejemplos de consultas
```
