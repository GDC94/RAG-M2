import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
} from '@/components/agents/message';

export interface ErrorMessageProps {
  error: { code: string; message: string };
}

const ERROR_MESSAGES: Record<string, string> = {
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

const FALLBACK_MESSAGE = ERROR_MESSAGES.unknown_error;

export function ErrorMessage({ error }: ErrorMessageProps) {
  const message = ERROR_MESSAGES[error.code] ?? FALLBACK_MESSAGE;

  return (
    <Message from="assistant" animateIn>
      {/* The pipeline progress row above already carries the assistant
       * avatar for this turn; keep an invisible placeholder for alignment. */}
      <MessageAvatar placeholder />
      <MessageContent>
        <MessageBubble variant="danger">
          <MessageBubbleContent>
            <p>{message}</p>
            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              {error.code}: {error.message}
            </p>
          </MessageBubbleContent>
        </MessageBubble>
      </MessageContent>
    </Message>
  );
}
