import { describe, expect, it } from 'vitest';
import answeredFixture from './__fixtures__/query-response.answered.json';
import notInManualFixture from './__fixtures__/query-response.not-in-manual.json';
import { QueryResponseSchema } from './schemas';
import { fragmentListLabel, toViewModel } from './viewModel';

function parse(raw: unknown) {
  return QueryResponseSchema.parse(raw);
}

describe('toViewModel', () => {
  it('maps question/answer/status/isAnswered from the response', () => {
    const vm = toViewModel(parse(answeredFixture));

    expect(vm.question).toBe(answeredFixture.user_question);
    expect(vm.answer).toBe(answeredFixture.system_answer);
    expect(vm.status).toBe('answered');
    expect(vm.isAnswered).toBe(true);
  });

  it('marks not_in_manual as not answered, with no chunks and no docLabel', () => {
    const vm = toViewModel(parse(notInManualFixture));

    expect(vm.isAnswered).toBe(false);
    expect(vm.chunks).toEqual([]);
    expect(vm.citedChunks).toEqual([]);
    expect(vm.docLabel).toBeNull();
    expect(vm.verdict).toBeNull();
    expect(vm.timings).toBeNull();
  });

  it('derives id/docLabel/number/shortTitle/sectionTitle/score/rank/tone/cited per chunk', () => {
    const vm = toViewModel(
      parse({
        ...answeredFixture,
        sources: ['19. Cómo solicitar vacaciones'],
      }),
    );

    expect(vm.chunks).toHaveLength(2);

    const [first, second] = vm.chunks;
    expect(first.id).toBe('alba-manual::19');
    expect(first.docLabel).toBe('alba-manual@4.2');
    expect(first.number).toBe(19);
    expect(first.shortTitle).toBe('Cómo solicitar vacaciones');
    expect(first.sectionTitle).toBe('19. Cómo solicitar vacaciones');
    expect(first.score).toBeCloseTo(0.6923636198043823);
    expect(first.cited).toBe(true);
    expect(first.rank).toBe(1);
    expect(first.tone).toBe(0);

    expect(second.id).toBe('alba-manual::22');
    expect(second.number).toBe(22);
    expect(second.shortTitle).toBe('Licencias por enfermedad y licencias parentales');
    expect(second.cited).toBe(false);
    expect(second.rank).toBe(2);
    expect(second.tone).toBe(1);

    expect(vm.docLabel).toBe('alba-manual@4.2');
  });

  it('strips the leading "## heading" line from a chunk body and trims it', () => {
    const vm = toViewModel(parse(answeredFixture));

    expect(vm.chunks[0].body).toBe(
      'La plantilla de Alba tiene veintidós días hábiles de vacaciones por año calendario, ' +
        'que se devengan a razón de 1,83 días por mes cumplido.',
    );
    expect(vm.chunks[0].body.startsWith('##')).toBe(false);
  });

  it('previews only the first ~2 lines of a multi-line body', () => {
    const vm = toViewModel(
      parse({
        ...answeredFixture,
        chunks_related: [
          {
            ...answeredFixture.chunks_related[0],
            text: '## 19. Título\n\nLínea uno.\nLínea dos.\nLínea tres que no debe entrar.',
          },
        ],
      }),
    );

    expect(vm.chunks[0].preview).toBe('Línea uno.\nLínea dos.');
    expect(vm.chunks[0].preview).not.toContain('tres');
  });

  it('leaves a single-line body as its own preview', () => {
    const vm = toViewModel(parse(answeredFixture));

    expect(vm.chunks[0].preview).toBe(vm.chunks[0].body);
  });

  it('orders citedChunks by the sources list, independent of retrieval rank', () => {
    const vm = toViewModel(
      parse({
        ...answeredFixture,
        sources: [
          '22. Licencias por enfermedad y licencias parentales',
          '19. Cómo solicitar vacaciones',
        ],
      }),
    );

    expect(vm.citedChunks.map((c) => c.id)).toEqual(['alba-manual::22', 'alba-manual::19']);
  });

  it('maps a null verification to a null verdict', () => {
    const vm = toViewModel(parse(answeredFixture));

    expect(vm.verdict).toBeNull();
  });

  it('maps verification labels to Spanish verdict keys/labels', () => {
    const cases: Array<[string, string, string]> = [
      ['supported', 'supported', 'Respaldada'],
      ['incomplete', 'partial', 'Parcial'],
      ['unsupported', 'unsupported', 'No respaldada'],
      ['wrong_status', 'wrong_status', 'Estado incorrecto'],
    ];

    for (const [backendLabel, key, label] of cases) {
      const vm = toViewModel(
        parse({
          ...answeredFixture,
          verification: { label: backendLabel, reason: 'porque sí' },
        }),
      );

      expect(vm.verdict).toEqual({ key, label, explanation: 'porque sí' });
    }
  });

  it('builds ordered, cumulative stage timings and totalMs from full timings', () => {
    const vm = toViewModel(parse(answeredFixture));

    expect(vm.timings).toEqual({
      stages: [
        { stage: 'embed', ms: 42, startMs: 0 },
        { stage: 'search', ms: 109, startMs: 42 },
        { stage: 'generate', ms: 412, startMs: 151 },
      ],
      totalMs: 563,
    });
  });

  it('omits a stage missing from timings (e.g. verifier disabled) but keeps the rest in order', () => {
    const vm = toViewModel(
      parse({
        ...answeredFixture,
        timings: { embed: 0.01, search: 0.02, generate: 0.03, verify: 0.04, total: 0.1 },
      }),
    );

    expect(vm.timings?.stages.map((s) => s.stage)).toEqual([
      'embed',
      'search',
      'generate',
      'verify',
    ]);
    expect(vm.timings?.stages[3]).toEqual({ stage: 'verify', ms: 40, startMs: 60 });
    expect(vm.timings?.totalMs).toBe(100);
  });

  it('handles 0 chunks', () => {
    const vm = toViewModel(parse(notInManualFixture));
    expect(vm.chunks).toEqual([]);
  });
});

describe('fragmentListLabel', () => {
  it('returns an empty string for no chunks', () => {
    expect(fragmentListLabel([])).toBe('');
  });

  it('formats a single fragment', () => {
    expect(fragmentListLabel([{ number: 11 }])).toBe('Frag. 11');
  });

  it('joins two fragments with "y"', () => {
    expect(fragmentListLabel([{ number: 11 }, { number: 26 }])).toBe('Frag. 11 y 26');
  });

  it('joins three fragments with a comma list and a final "y"', () => {
    expect(fragmentListLabel([{ number: 11 }, { number: 26 }, { number: 25 }])).toBe(
      'Frag. 11, 26 y 25',
    );
  });
});
