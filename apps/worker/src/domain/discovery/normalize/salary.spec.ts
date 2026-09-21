import { parseSalary } from './salary';

describe('parseSalary', () => {
  it('reads a euro range written with thousand separators', () => {
    expect(parseSalary('Salary: €45,000 - €55,000 per year')).toEqual({
      salaryMin: 45000,
      salaryMax: 55000,
      salaryCurrency: 'EUR',
    });
  });

  it('expands the k suffix', () => {
    expect(parseSalary('$120k–$150k')).toEqual({
      salaryMin: 120000,
      salaryMax: 150000,
      salaryCurrency: 'USD',
    });
  });

  it('takes the currency from either side of the range', () => {
    expect(parseSalary('between 45.000 and 55.000 £').salaryCurrency).toBe(
      undefined,
    );
    expect(parseSalary('45 000 to £55 000').salaryCurrency).toBe('GBP');
  });

  it.each([
    ['no range at all', 'Competitive salary'],
    ['an inverted range', '$150k - $120k'],
    ['numbers far too small to be pay', '2 - 5 years of experience'],
    ['nothing to read', undefined],
  ])('returns nothing for %s', (_reason, text) => {
    expect(parseSalary(text)).toEqual({});
  });

  it('leaves the currency undefined when no symbol is written', () => {
    expect(parseSalary('45,000 - 55,000')).toEqual({
      salaryMin: 45000,
      salaryMax: 55000,
      salaryCurrency: undefined,
    });
  });
});
