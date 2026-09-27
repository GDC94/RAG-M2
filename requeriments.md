# Qué hay que construir

Un sistema RAG autocontenido para una empresa de HR SaaS. El soporte recibe más de 200 preguntas repetitivas al día sobre políticas, funcionalidades y procedimientos que ya están en FAQs. El chatbot responde recuperando fragmentos de esa documentación, sin búsqueda manual ni un agente humano.

# Entregables

Van en este orden.

| Entregable | Archivo | Contenido mínimo |
| --- | --- | --- |
| Documento fuente | `data/faq_document.txt` | Texto plano de al menos 1000 palabras, suficiente para 20 o más chunks con sentido |
| Pipeline de indexación | `src/build_index.py` (o notebook) | Cargar el documento, dividirlo en 20 o más chunks, generar embeddings y guardarlos |
| Pipeline de consulta | `src/query.py` (o notebook) | Pregunta, embedding, búsqueda vectorial, chunks, respuesta con un LLM y JSON |
| Ejemplos | `outputs/sample_queries.json` | Al menos 3 pares de pregunta y respuesta, de punta a punta |
| README | `README.md` | Versión de Python, instalación, API key, cómo ejecutar ambos pipelines, estructura del proyecto y decisiones técnicas |
| Configuración | `.env.example` | `OPENAI_API_KEY`, `EMBEDDING_MODEL=text-embedding-3-small` y el resto de variables que use el proyecto |

El JSON de cada consulta debe incluir `user_question`, `system_answer` y `chunks_related`.

# Lo que el módulo pide aplicar

Chunking, embeddings (OpenAI o Sentence-Transformers), búsqueda por similitud (k-NN, ANN, por rango o híbrida) y arquitectura RAG de recuperación más generación. El README tiene que justificar por qué se eligió ese método de chunking y ese método de búsqueda.

El código tiene que ser modular, con manejo de errores y dependencias en `requirements.txt`. El repositorio debe poder ejecutarse sin piezas externas no documentadas.

# Bonus

Un agente evaluador que reciba `user_question`, `system_answer` y `chunks_related`, y devuelva un puntaje de 0 a 10 con una justificación. La justificación cubre la relevancia de los chunks, la precisión y la completitud.
