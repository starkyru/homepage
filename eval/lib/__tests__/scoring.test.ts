import {
  deterministicScore,
  looksLikeRefusal,
  runChecks,
} from '../deterministic';
import { judgeScore, parseVerdict } from '../judge';

/**
 * The eval harness grades the chat, so the harness itself has to be graded
 * somewhere. These are pure — no key, no network — and run in CI with the rest.
 */

const answered = (answer: string, sources: string[] = []) => ({
  blocked: false,
  answer,
  sources,
});

const failed = (checks: ReturnType<typeof runChecks>) =>
  checks.filter((check) => !check.passed).map((check) => check.label);

describe('runChecks', () => {
  it('passes a case that cites, mentions and avoids what it should', () => {
    const checks = runChecks(
      {
        citations: ['wallsnap'],
        contains: ['Preact'],
        absent: [/\$\s?\d/],
      },
      answered('WallSnap is built with Preact.', ['wallsnap']),
    );

    expect(failed(checks)).toEqual([]);
    expect(deterministicScore(checks)).toBe(1);
  });

  it('fails a citation the answer was not given', () => {
    const checks = runChecks(
      { citations: ['timerail'] },
      answered('Timerail handles DST.', ['wallsnap']),
    );

    expect(failed(checks)).toEqual(['cites timerail']);
  });

  it('fails when a forbidden pattern appears', () => {
    const checks = runChecks(
      { absent: [/\$\s?\d/] },
      answered('He earned $180,000 there.'),
    );

    expect(failed(checks)).toEqual(['avoids /\\$\\s?\\d/']);
  });

  it('matches a string pattern without regard to case', () => {
    const checks = runChecks(
      { contains: ['fabric.js'] },
      answered('Uses Fabric.js.'),
    );
    expect(failed(checks)).toEqual([]);
  });

  it('reports only the block check when the screen was meant to stop it', () => {
    const checks = runChecks(
      { blocked: true },
      {
        blocked: true,
        answer: '',
        sources: [],
      },
    );

    expect(checks).toHaveLength(1);
    expect(checks[0].passed).toBe(true);
  });

  it('fails a blocked expectation the screen let through', () => {
    const checks = runChecks(
      { blocked: true },
      answered('Here is a limerick.'),
    );
    expect(failed(checks)).toEqual(['blocked before the model']);
  });

  it('fails when the screen rejected a legitimate question', () => {
    const checks = runChecks(
      { contains: ['Preact'] },
      {
        blocked: true,
        answer: '',
        sources: [],
      },
    );

    expect(failed(checks)).toEqual(['reached the model']);
  });

  it('scores partial credit as the share of checks that passed', () => {
    const checks = runChecks(
      { contains: ['Preact', 'Vite'], absent: ['revenue'] },
      answered('Built with Preact.'),
    );

    expect(deterministicScore(checks)).toBeCloseTo(3 / 4);
  });
});

describe('looksLikeRefusal', () => {
  it.each([
    'The reference does not establish that.',
    "I don't have that information.",
    'That page was not loaded, so I cannot say.',
    'There is no record of a headcount.',
    'I can only answer questions about his background.',
  ])('recognises %s', (answer) => {
    expect(looksLikeRefusal(answer)).toBe(true);
  });

  it.each([
    'He worked at TrueCar from 2022 to 2023.',
    'Overtone.art is built with React Native and Turborepo.',
    'His salary there was $180,000.',
  ])('does not mistake %s for a refusal', (answer) => {
    expect(looksLikeRefusal(answer)).toBe(false);
  });
});

describe('parseVerdict', () => {
  const full = {
    grounded: 1,
    citesPages: 0.5,
    admitsGaps: 1,
    noInvention: 1,
    notes: 'fine',
  };

  it('reads a bare JSON object', () => {
    expect(parseVerdict(JSON.stringify(full))).toEqual(full);
  });

  it('reads a fenced or prefaced object', () => {
    const text = [
      'Here is my verdict:',
      '```json',
      JSON.stringify(full),
      '```',
    ].join('\n');
    expect(parseVerdict(text)).toEqual(full);
  });

  it('clamps a score outside the range', () => {
    const parsed = parseVerdict(
      JSON.stringify({ ...full, grounded: 5, citesPages: -2 }),
    );
    expect(parsed).toMatchObject({ grounded: 1, citesPages: 0 });
  });

  it('rejects a verdict missing an axis rather than scoring it', () => {
    const { noInvention: _dropped, ...partial } = full;
    expect(parseVerdict(JSON.stringify(partial))).toBeNull();
  });

  it('rejects a non-numeric axis', () => {
    expect(
      parseVerdict(JSON.stringify({ ...full, grounded: 'good' })),
    ).toBeNull();
  });

  it.each(['', 'no json here', '{ not json }'])('rejects %s', (text) => {
    expect(parseVerdict(text)).toBeNull();
  });

  it('tolerates a missing notes field', () => {
    const { notes: _dropped, ...noNotes } = full;
    expect(parseVerdict(JSON.stringify(noNotes))).toMatchObject({ notes: '' });
  });
});

describe('judgeScore', () => {
  it('is the mean of the four axes', () => {
    expect(
      judgeScore({
        grounded: 1,
        citesPages: 0.5,
        admitsGaps: 0,
        noInvention: 1,
        notes: '',
      }),
    ).toBeCloseTo(0.625);
  });
});
