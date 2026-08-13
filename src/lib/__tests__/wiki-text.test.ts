import { contentTokens, mentions, normalize, sameStem } from '@/lib/wiki/text';

describe('normalize', () => {
  it('lowercases and turns separators into single spaces', () => {
    expect(normalize('Gallery-SaaS  (multi_tenant)')).toBe(
      'gallery saas multi tenant',
    );
  });
});

describe('mentions', () => {
  it('matches a dotted name however the visitor spells it', () => {
    for (const question of ['a next.js app', 'a nextjs app', 'a next js app']) {
      expect(mentions(normalize(question), 'Next.js')).toBe(true);
    }
  });

  it('does not match inside a longer word', () => {
    expect(mentions('reactive streams', 'React')).toBe(false);
    expect(mentions('react streams', 'React')).toBe(true);
  });

  it('matches a multi-word name across a separator', () => {
    expect(mentions(normalize('any react-native work?'), 'React Native')).toBe(
      true,
    );
  });
});

describe('contentTokens', () => {
  it('drops stopwords and short words, and deduplicates', () => {
    expect(
      contentTokens('What projects use Redis for the Redis queue?'),
    ).toEqual(['redis', 'queue']);
  });
});

describe('sameStem', () => {
  it('sees through a regular plural', () => {
    expect(sameStem('libraries', 'library')).toBe(true);
    expect(sameStem('experiments', 'experiment')).toBe(true);
  });

  it('keeps a word that merely ends in s', () => {
    expect(sameStem('status', 'statu')).toBe(false);
  });

  it('does not conflate different words', () => {
    expect(sameStem('library', 'product')).toBe(false);
  });
});
