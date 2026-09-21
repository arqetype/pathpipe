import { normalizeEmploymentType } from './employment';

describe('normalizeEmploymentType', () => {
  it.each([
    ['Full-time', 'FULL_TIME'],
    ['CDI', 'FULL_TIME'],
    ['Part time', 'PART_TIME'],
    ['Stage', 'INTERNSHIP'],
    ['Alternance', 'APPRENTICESHIP'],
    ['Freelance', 'FREELANCE'],
    ['CDD', 'TEMPORARY'],
    ['Contract', 'CONTRACT'],
    ['Service civique', 'VOLUNTEER'],
  ])('folds %j into %s', (input, expected) => {
    expect(normalizeEmploymentType(input)).toBe(expected);
  });

  it('folds accents before matching', () => {
    expect(normalizeEmploymentType('Stagiaîre')).toBe('INTERNSHIP');
  });

  it('is ordered by specificity: a full-time internship is an internship', () => {
    expect(normalizeEmploymentType('Full-time internship')).toBe('INTERNSHIP');
  });

  it('takes the first value that says anything', () => {
    expect(
      normalizeEmploymentType(undefined, 'nothing here', 'Part-time', 'CDI'),
    ).toBe('PART_TIME');
  });

  it('returns nothing when no value names a contract', () => {
    expect(normalizeEmploymentType('Engineering', null)).toBeUndefined();
  });
});
