import { cleanTitle, isPlausibleTitle } from './title';

describe('cleanTitle', () => {
  it.each([
    ['  Senior   Backend   Engineer ', 'Senior Backend Engineer'],
    ['- Backend Engineer •', 'Backend Engineer'],
    ['Backend Engineer NEW', 'Backend Engineer'],
    ['Backend Engineer new!', 'Backend Engineer'],
    ['Backend Engineer (3)', 'Backend Engineer'],
    ['D&#233;veloppeur Backend', 'Développeur Backend'],
  ])('%j becomes %j', (input, expected) => {
    expect(cleanTitle(input)).toBe(expected);
  });
});

describe('isPlausibleTitle', () => {
  it.each([
    'Senior Backend Engineer',
    'Head of Product',
    'Développeur Fullstack (H/F)',
  ])('accepts %j', (title) => {
    expect(isPlausibleTitle(title)).toBe(true);
  });

  it.each([
    ['too short', 'QA'],
    ['no letters', '12345'],
    ['a nav label, matched exactly', 'Apply now'],
    ['an accented nav label, folded', 'Mentions légales'],
    ['a short nav-prefixed label', 'View all jobs'],
    ['a sentence of copy', 'We are looking for a great engineer to join us.'],
    ['a verb boards use for links', 'Share this job with a friend'],
  ])('rejects %s: %j', (_reason, title) => {
    expect(isPlausibleTitle(title)).toBe(false);
  });

  it('accepts a nav-prefixed title once it is long enough (5+ words)', () => {
    expect(isPlausibleTitle('Search Quality Engineer, Ads Platform')).toBe(
      true,
    );
  });
});
