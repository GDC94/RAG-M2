import { PanelLeftClose } from 'lucide-react';
import { IconButton } from '@/components/workbench-ui/IconButton';
import { RepoButton } from './components/RepoButton';
import { StaffAvatars } from './components/StaffAvatars';
import { TechTags } from './components/TechTags';
import { Wordmark } from './components/Wordmark';

export interface ProjectSidebarProps {
  /** Collapses the sidebar (footer "Ocultar barra lateral" button). */
  onCollapse: () => void;
}

/** The project sidebar: wordmark, repo CTA, simulated staff, tech stack and
 * a footer with the manual version and the collapse control. */
export function ProjectSidebar({ onCollapse }: ProjectSidebarProps) {
  return (
    <div className="flex h-full w-[272px] flex-col gap-7 overflow-y-auto px-3.5 pt-[18px] pb-4">
      <div className="flex flex-col gap-3">
        <Wordmark />
        <div className="flex flex-col gap-2 text-sm text-fg-subtle leading-relaxed">
          <p>
            RAG sobre el manual interno de Alba People, una empresa ficticia. Responde las preguntas
            del equipo de soporte usando el manual como única fuente.
          </p>
          <p>
            Recupera las secciones más relevantes, redacta la respuesta citándolas y un segundo
            modelo verifica que esté respaldada. Si el manual no lo cubre, lo dice.
          </p>
        </div>
      </div>

      <StaffAvatars />

      <div className="h-px bg-ink-350" />

      <TechTags />

      <footer className="mt-auto flex flex-col gap-4">
        <RepoButton />
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-fg-ghost">alba-manual@4.2</span>
          <IconButton label="Ocultar barra lateral" onClick={onCollapse}>
            <PanelLeftClose className="size-[18px]" aria-hidden="true" />
          </IconButton>
        </div>
      </footer>
    </div>
  );
}
