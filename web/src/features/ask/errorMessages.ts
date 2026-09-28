/** Spanish copy for backend error codes, shared by the chat `TurnError` UI. */
export const ERROR_MESSAGES: Record<string, string> = {
  invalid_question: 'La pregunta no es válida.',
  invalid_request: 'La solicitud no es válida.',
  index_empty: 'El índice está vacío: corré `pnpm run bootstrap`.',
  provider_error: 'El proveedor del modelo devolvió un error.',
  provider_timeout: 'El proveedor del modelo tardó demasiado en responder.',
  config_error: 'Hay un error de configuración en el servidor.',
  index_model_mismatch: 'El índice no coincide con el modelo configurado.',
  network_error: 'No se pudo conectar con la API. ¿Está corriendo el backend en :8000?',
  invalid_response: 'La respuesta del servidor no tiene el formato esperado.',
  unknown_error: 'Ocurrió un error inesperado.',
  stopped: 'Consulta detenida.',
};
