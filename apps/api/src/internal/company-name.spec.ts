import { capitalize, isSlugCased } from './company-name';

describe('capitalize', () => {
  it('lifts the first letter of a board token', () => {
    expect(capitalize('nvidia')).toBe('Nvidia');
  });

  it('leaves the rest of the name alone', () => {
    expect(capitalize('sierra-space')).toBe('Sierra-space');
  });

  it('is a no-op on a name that starts with a digit', () => {
    expect(capitalize('1password')).toBe('1password');
  });
});

describe('isSlugCased', () => {
  // The pair that matters: these are how the companies spell themselves, and
  // rewriting either would be a worse name than the one on file.
  it.each(['NVIDIA', 'eBay', 'Stripe'])('leaves %s alone', (name) => {
    expect(isSlugCased(name)).toBe(false);
  });

  it('claims a slug', () => {
    expect(isSlugCased('nvidia')).toBe(true);
  });
});
