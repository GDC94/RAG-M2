import { describe, expect, it } from 'vitest';
import { JSON_TOKEN_CLASSES, tokenizeJson } from './jsonHighlight';

/** Every test asserts this invariant too: tokens must reconstruct the input losslessly. */
function reassemble(text: string): string {
  return tokenizeJson(text)
    .map((token) => token.value)
    .join('');
}

describe('tokenizeJson', () => {
  it('concatenating token values always reproduces the input exactly', () => {
    const text = '{\n  "score": 0.69,\n  "ok": true,\n  "note": null\n}';
    expect(reassemble(text)).toBe(text);
  });

  it('classifies an object key (string followed directly by a colon) as "key"', () => {
    const tokens = tokenizeJson('{"chunk_id":1}');
    const keyToken = tokens.find((t) => t.value === '"chunk_id"');

    expect(keyToken?.kind).toBe('key');
  });

  it('classifies a key even when whitespace separates it from the colon', () => {
    const tokens = tokenizeJson('{"chunk_id"   :1}');
    const keyToken = tokens.find((t) => t.value === '"chunk_id"');

    expect(keyToken?.kind).toBe('key');
  });

  it('classifies a string value (not followed by a colon) as "string"', () => {
    const tokens = tokenizeJson('{"section_title":"19. Cómo solicitar vacaciones"}');
    const valueToken = tokens.find((t) => t.value === '"19. Cómo solicitar vacaciones"');

    expect(valueToken?.kind).toBe('string');
  });

  it('classifies integers, decimals, negatives and exponents as "number"', () => {
    for (const literal of ['42', '0.69', '-3', '1.5e10', '-2.3E-4']) {
      const tokens = tokenizeJson(`[${literal}]`);
      const numberToken = tokens.find((t) => t.value === literal);
      expect(numberToken?.kind).toBe('number');
    }
  });

  it('classifies true/false/null as "literal"', () => {
    const tokens = tokenizeJson('[true,false,null]');
    expect(tokens.find((t) => t.value === 'true')?.kind).toBe('literal');
    expect(tokens.find((t) => t.value === 'false')?.kind).toBe('literal');
    expect(tokens.find((t) => t.value === 'null')?.kind).toBe('literal');
  });

  it('classifies structural characters as "punct", including the key colon', () => {
    const tokens = tokenizeJson('{"a":1,"b":[2]}');
    const punctValues = tokens.filter((t) => t.kind === 'punct').map((t) => t.value);

    expect(punctValues).toEqual(['{', ':', ',', ':', '[', ']', '}']);
  });

  it('classifies runs of whitespace as "space"', () => {
    const tokens = tokenizeJson('{\n  "a": 1\n}');
    const spaceValues = tokens.filter((t) => t.kind === 'space').map((t) => t.value);

    expect(spaceValues).toEqual(['\n  ', ' ', '\n']);
  });

  it('handles an empty string', () => {
    expect(tokenizeJson('')).toEqual([]);
  });
});

describe('JSON_TOKEN_CLASSES', () => {
  it('maps every token kind to a text-json-* class, literals sharing the number color', () => {
    expect(JSON_TOKEN_CLASSES.key).toBe('text-json-key');
    expect(JSON_TOKEN_CLASSES.string).toBe('text-json-string');
    expect(JSON_TOKEN_CLASSES.number).toBe('text-json-number');
    expect(JSON_TOKEN_CLASSES.literal).toBe('text-json-number');
    expect(JSON_TOKEN_CLASSES.punct).toBe('text-json-punct');
  });
});
