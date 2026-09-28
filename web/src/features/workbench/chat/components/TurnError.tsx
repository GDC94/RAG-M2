import { ERROR_MESSAGES } from '@/features/ask/errorMessages';

export interface TurnErrorProps {
  state: 'error' | 'stopped';
  error?: { code: string; message: string };
}

/** Small inline message for an `error`/`stopped` turn — no bubble, no icon,
 * just the mapped Spanish copy (see `errorMessages.ts`). */
export function TurnError({ state, error }: TurnErrorProps) {
  const code = state === 'stopped' ? 'stopped' : (error?.code ?? 'unknown_error');
  const message = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown_error;

  return <p className="text-sm text-fg-muted">{message}</p>;
}
