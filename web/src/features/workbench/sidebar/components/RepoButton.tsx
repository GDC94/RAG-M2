import { Star } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';

const REPO_URL = 'https://github.com/GDC94/RAG-M2';

const ICON_SPRING = { type: 'spring', stiffness: 600, damping: 25 } as const;
const FADE = { duration: 0.15 } as const;

/** Inline marks kept local to `RepoButton` — they're decorative render
 * helpers, not reusable components, so they don't get their own files. */
function GithubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 fill-current">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function SparkleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-2.5 fill-current text-star-soft">
      <path d="M12 2l2.4 7.6H22l-6.2 4.5 2.4 7.6-6.2-4.5-6.2 4.5 2.4-7.6L2 9.6h7.6z" />
    </svg>
  );
}

/** GitHub repo link for `ProjectSidebar`. Idle shows the GitHub mark;
 * on hover it rises out while a star springs up from below, with a small
 * sparkle popping in at its top-right corner. */
export function RepoButton() {
  const [hovered, setHovered] = useState(false);
  const reducedMotion = useReducedMotion();

  // Reduced motion keeps the swap but drops travel, scale and rotation.
  const github = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: FADE }
    : {
        initial: { y: -15, opacity: 0, scale: 0.8 },
        animate: { y: 0, opacity: 1, scale: 1 },
        exit: { y: -15, opacity: 0, scale: 0.8 },
        transition: ICON_SPRING,
      };
  const star = reducedMotion
    ? github
    : {
        initial: { y: 15, opacity: 0, scale: 0.8 },
        animate: { y: 0, opacity: 1, scale: 1 },
        exit: { y: 15, opacity: 0, scale: 0.8 },
        transition: ICON_SPRING,
      };
  const sparkle = reducedMotion
    ? github
    : {
        initial: { opacity: 0, scale: 0, rotate: -45, y: 10 },
        animate: { opacity: 1, scale: 1, rotate: 0, y: 0 },
        exit: { opacity: 0, scale: 0, rotate: 45, y: 10 },
        transition: { ...ICON_SPRING, delay: 0.05 },
      };

  return (
    <motion.a
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={reducedMotion ? undefined : { scale: 1.02 }}
      whileTap={reducedMotion ? undefined : { scale: 0.96 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="relative inline-flex items-center self-start whitespace-nowrap rounded-sm text-fg-soft outline-none transition-colors duration-150 hover:text-fg-strong focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          {hovered ? (
            <motion.span
              key="star"
              data-testid="repo-icon-star"
              className="absolute inset-0 flex items-center justify-center"
              {...star}
            >
              <Star aria-hidden="true" className="size-4 text-star" />
              <motion.span className="absolute -top-3 -right-2 flex" {...sparkle}>
                <SparkleMark />
              </motion.span>
            </motion.span>
          ) : (
            <motion.span
              key="github"
              data-testid="repo-icon-github"
              className="absolute inset-0 flex items-center justify-center"
              {...github}
            >
              <GithubMark />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="ml-2.5 font-medium text-[13px] tracking-tight">RAG-M2</span>
    </motion.a>
  );
}
