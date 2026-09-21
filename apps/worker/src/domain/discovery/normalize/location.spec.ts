import { cleanLocation, isRemote, normalizeRemoteType } from './location';

describe('isRemote', () => {
  it('reads any of the values given', () => {
    expect(isRemote(undefined, 'Paris, télétravail')).toBe(true);
    expect(isRemote('Work from home')).toBe(true);
    expect(isRemote('Paris', 'Full-time')).toBe(false);
  });
});

describe('cleanLocation', () => {
  it('collapses whitespace and strips edge punctuation', () => {
    expect(cleanLocation(' - Paris,  France • ')).toBe('Paris, France');
  });

  it('drops a field label a board left in its own slot', () => {
    expect(cleanLocation('Location')).toBeUndefined();
  });

  it('drops anything longer than 120 characters', () => {
    expect(cleanLocation('x'.repeat(121))).toBeUndefined();
  });
});

describe('normalizeRemoteType', () => {
  it('reads hybrid first, however the board worded it', () => {
    expect(normalizeRemoteType(true, 'Hybrid remote')).toBe('HYBRID');
    expect(normalizeRemoteType(undefined, '2 days a week in the office')).toBe(
      'HYBRID',
    );
  });

  it('reads an explicit fully-remote wording', () => {
    expect(normalizeRemoteType(undefined, '100% remote')).toBe('REMOTE');
  });

  it('trusts the flag once no wording decided it', () => {
    expect(normalizeRemoteType(true, 'Paris')).toBe('REMOTE');
  });

  it('reads on-site wording when the flag is not set', () => {
    expect(normalizeRemoteType(undefined, 'On-site in Berlin')).toBe('ON_SITE');
  });

  it('falls back to a bare "remote" anywhere in the text', () => {
    expect(normalizeRemoteType(false, 'Paris (Remote friendly)')).toBe(
      'HYBRID',
    );
    expect(normalizeRemoteType(false, 'Remote, France')).toBe('REMOTE');
  });

  it('returns nothing when no signal says anything', () => {
    expect(normalizeRemoteType(undefined, 'Paris')).toBeUndefined();
  });

  it('treats a false flag as no signal rather than as on-site', () => {
    expect(normalizeRemoteType(false, 'Paris office')).toBeUndefined();
  });
});
