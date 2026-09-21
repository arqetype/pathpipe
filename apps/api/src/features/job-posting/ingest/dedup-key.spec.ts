import { dedupKey } from './dedup-key';

const dto = (over: Record<string, unknown>) =>
  ({ title: 'Engineer', url: 'https://x', companyId: 'c', ...over }) as never;

describe('dedupKey', () => {
  it('folds case, accents and punctuation', () => {
    expect(dedupKey(dto({ title: 'Sr. Développeur (H/F)' }))).toBe(
      'sr developpeur h f|',
    );
  });

  it('matches the same role listed on two boards', () => {
    const greenhouse = dto({
      title: 'Senior Backend Engineer',
      location: 'Paris, France',
      locations: [{ city: 'Paris', country: 'FR' }],
    });
    const lever = dto({
      title: 'Senior Backend Engineer ',
      location: 'Paris, Île-de-France',
      locations: [{ city: 'Paris', country: null }],
    });
    expect(dedupKey(greenhouse)).toBe(dedupKey(lever));
  });

  it('falls back to the display label when no place was parsed', () => {
    expect(
      dedupKey(dto({ title: 'Engineer', location: 'Berlin, Germany' })),
    ).toBe('engineer|berlin');
  });

  it('keeps different cities apart', () => {
    expect(dedupKey(dto({ locations: [{ city: 'Lyon' }] }))).not.toBe(
      dedupKey(dto({ locations: [{ city: 'Nantes' }] })),
    );
  });
});
