import { TintTag } from '@/components/workbench-ui/TintTag';
import { TECH_NAMES, TECH_TONES, type TechName } from '@/lib/palette';
import { cn } from '@/lib/utils';

const TECH_LABELS: Record<TechName, string> = {
  python: 'Python',
  pydantic: 'Pydantic',
  openai: 'OpenAI API',
  chroma: 'Chroma',
  fastapi: 'FastAPI',
  typescript: 'TypeScript',
  react: 'React',
  vite: 'Vite',
  tailwind: 'Tailwind',
  zod: 'Zod',
};

/** The project's tech stack under a "Tecnologías utilizadas" heading, one `TintTag` per technology, colored via
 * `TECH_TONES` (see `@/lib/palette`). */
export function TechTags() {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-base text-fg-soft">Tecnologías utilizadas</h2>
      <div className="flex flex-wrap gap-1.5">
        {TECH_NAMES.map((name) => (
          <TintTag
            key={name}
            tone={cn(TECH_TONES[name].tint, TECH_TONES[name].hover)}
            className="transition-transform duration-150 hover:-translate-y-px"
          >
            {TECH_LABELS[name]}
          </TintTag>
        ))}
      </div>
    </div>
  );
}
