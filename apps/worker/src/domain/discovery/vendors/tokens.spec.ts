import { candidateTokens, tokenFromInput } from './tokens';

describe('candidateTokens', () => {
  it('uses the whole name, joined and hyphenated, plus the original spelling', () => {
    expect(candidateTokens('Cosmic Robotics')).toEqual([
      'cosmicrobotics',
      'cosmic-robotics',
      'CosmicRobotics',
    ]);
  });

  it('never shortens a name to its first word', () => {
    expect(candidateTokens('Cosmic Robotics')).not.toContain('cosmic');
  });

  it('drops legal suffixes before joining', () => {
    expect(candidateTokens('Acme Inc')).toEqual(['acme', 'AcmeInc']);
  });

  it('folds accents and spells out an ampersand', () => {
    expect(candidateTokens('Crème & Co')).toEqual([
      'cremeandco',
      'creme-and-co',
      'CrmeCo',
    ]);
  });

  it.each(['Atlas', 'Impact', 'Data', 'Labs'])(
    'refuses %j — a single generic word finds somebody else’s board',
    (name) => {
      expect(candidateTokens(name)).toEqual([]);
    },
  );

  it('keeps a generic word when it is part of a longer name', () => {
    expect(candidateTokens('Northwind Data')).toContain('northwinddata');
  });

  it('drops tokens shorter than three characters', () => {
    expect(candidateTokens('AI')).toEqual([]);
  });

  it('returns nothing for a name with no usable characters', () => {
    expect(candidateTokens('!!!')).toEqual([]);
  });
});

describe('tokenFromInput', () => {
  it.each([
    ['https://jobs.ashbyhq.com/acme', 'acme'],
    ['https://job-boards.greenhouse.io/acme', 'acme'],
    ['https://jobs.lever.co/acme/', 'acme'],
    ['https://careers.smartrecruiters.com/AcmeInc', 'AcmeInc'],
    ['acme', 'acme'],
  ])('reads %s as %s', (input, expected) => {
    expect(tokenFromInput(input)).toBe(expected);
  });

  it.each(['', '# a comment', 'two words'])('ignores %j', (input) => {
    expect(tokenFromInput(input)).toBeNull();
  });
});
