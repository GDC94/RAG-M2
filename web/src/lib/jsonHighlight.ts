/**
 * Tiny regex tokenizer for syntax-highlighting a `JSON.stringify`d blob
 * (the "raw JSON" tab). No parser, no deps: concatenating every token's
 * `value` in order always reproduces the input string exactly.
 */

export type JsonTokenKind = 'key' | 'string' | 'number' | 'punct' | 'literal' | 'space';

export interface JsonToken {
  kind: JsonTokenKind;
  value: string;
}

/** Tailwind text-color class per token kind. `literal` (true/false/null)
 * shares the number color; whitespace carries no color of its own. */
export const JSON_TOKEN_CLASSES: Record<JsonTokenKind, string> = {
  key: 'text-json-key',
  string: 'text-json-string',
  number: 'text-json-number',
  literal: 'text-json-number',
  punct: 'text-json-punct',
  space: '',
};

const WHITESPACE_RE = /^\s+/;
const STRING_RE = /^"(?:\\.|[^"\\])*"/;
const NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
const LITERAL_RE = /^(?:true|false|null)/;
const PUNCT_RE = /^[{}[\],:]/;

/** True when the next non-whitespace character after `index` is `:`. */
function isFollowedByColon(text: string, index: number): boolean {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return text[i] === ':';
}

export function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let i = 0;

  while (i < text.length) {
    const rest = text.slice(i);

    const whitespace = rest.match(WHITESPACE_RE)?.[0];
    if (whitespace) {
      tokens.push({ kind: 'space', value: whitespace });
      i += whitespace.length;
      continue;
    }

    const string = rest.match(STRING_RE)?.[0];
    if (string) {
      const kind: JsonTokenKind = isFollowedByColon(text, i + string.length) ? 'key' : 'string';
      tokens.push({ kind, value: string });
      i += string.length;
      continue;
    }

    const literal = rest.match(LITERAL_RE)?.[0];
    if (literal) {
      tokens.push({ kind: 'literal', value: literal });
      i += literal.length;
      continue;
    }

    const number = rest.match(NUMBER_RE)?.[0];
    if (number) {
      tokens.push({ kind: 'number', value: number });
      i += number.length;
      continue;
    }

    const punct = rest.match(PUNCT_RE)?.[0];
    if (punct) {
      tokens.push({ kind: 'punct', value: punct });
      i += punct.length;
      continue;
    }

    // Unrecognized character (should not happen on valid JSON text): consume
    // one char as punct so the reconstruction invariant always holds.
    tokens.push({ kind: 'punct', value: rest[0] });
    i += 1;
  }

  return tokens;
}
