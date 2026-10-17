import { Zap } from 'lucide-react';
import { TintTag } from '@/components/workbench-ui/TintTag';
import { CACHE_TONE } from '@/lib/palette';

/** Marks an answer replayed from the backend's cache: no model was called
 * for it and the timings shown are those of the original run. */
export function CachedBadge() {
  return (
    <span
      title="Respuesta guardada: no se volvió a consultar al modelo"
      className="inline-flex w-fit shrink-0"
    >
      <TintTag tone={CACHE_TONE.tint} size="xs">
        <Zap aria-hidden="true" className="size-3" />
        Desde caché
      </TintTag>
    </span>
  );
}
