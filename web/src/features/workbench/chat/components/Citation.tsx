export interface CitationProps {
  /** 1-based position among the cited chunks (citation order, not retrieval rank). */
  number: number;
  onClick: () => void;
}

/** Inline superscript-like marker appended after a cited sentence/answer;
 * opens the matching fragment tab in the detail panel. */
export function Citation({ number, onClick }: CitationProps) {
  return (
    <button
      type="button"
      aria-label={`Ver fragmento ${number}`}
      title={`Ver fragmento ${number}`}
      onClick={onClick}
      className="ml-1 inline-grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-ink-300 align-middle text-[11px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {number}
    </button>
  );
}
