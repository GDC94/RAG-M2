/** Served from `public/`; also used as the favicon in `index.html`. */
const LOGO_SRC = '/alba-logo.jpg';

/** The "Alba RAG" wordmark shown at the top of `ProjectSidebar`: the Alba
 * logo plus the name. Must stay on one line at the sidebar's fixed 272px
 * width — hence `whitespace-nowrap`. */
export function Wordmark() {
  return (
    <div className="flex items-center gap-2.5 whitespace-nowrap">
      <img
        src={LOGO_SRC}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-[9px] border border-ink-350"
      />
      <span className="font-semibold text-2xl text-fg-strong tracking-[-0.045em]">Alba RAG</span>
    </div>
  );
}
