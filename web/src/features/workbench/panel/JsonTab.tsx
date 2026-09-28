import type { QueryResponse } from '@/features/ask/schemas';
import { JSON_TOKEN_CLASSES, tokenizeJson } from '@/lib/jsonHighlight';
import { cn } from '@/lib/utils';

export interface JsonTabProps {
  /** The focused turn's raw backend response. */
  data: QueryResponse;
}

/** Scrollable "JSON crudo" tab: the raw response, pretty-printed and
 * syntax-highlighted with `tokenizeJson` — no JSON parser dependency. */
export function JsonTab({ data }: JsonTabProps) {
  const text = JSON.stringify(data, null, 2);
  const tokens = tokenizeJson(text);

  return (
    <div className="h-full overflow-y-auto">
      <pre className="whitespace-pre-wrap break-words px-9 py-7 font-mono text-sm leading-relaxed">
        {tokens.map((token, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens never reorder within a static stringified blob
          <span key={index} className={cn(JSON_TOKEN_CLASSES[token.kind])}>
            {token.value}
          </span>
        ))}
      </pre>
    </div>
  );
}
