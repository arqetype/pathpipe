import { contentHash } from './content-hash';

const dto = (over: Record<string, unknown> = {}) =>
  ({
    title: 'Backend Engineer',
    url: 'https://boards.example.com/jobs/1',
    companyId: 'c',
    description: 'We are hiring.',
    ...over,
  }) as never;

describe('contentHash', () => {
  it('is stable across reads of an unchanged posting', () => {
    expect(contentHash(dto())).toBe(contentHash(dto()));
  });

  it('ignores the order a board lists cities in', () => {
    const one = dto({
      locations: [{ city: 'Paris' }, { city: 'Lyon' }],
    });
    const other = dto({
      locations: [{ city: 'Lyon' }, { city: 'Paris' }],
    });
    expect(contentHash(one)).toBe(contentHash(other));
  });

  it('ignores identity — same offer, URL rewritten by the board', () => {
    expect(
      contentHash(dto({ url: 'https://boards.example.com/j/renamed' })),
    ).toBe(contentHash(dto()));
  });

  // The one that must never regress: anything the merge writes has to move the
  // hash, or that edit is silently dropped for the life of the posting.
  it.each([
    ['title', { title: 'Staff Backend Engineer' }],
    ['description', { description: 'We are hiring two.' }],
    ['descriptionHtml', { descriptionHtml: '<p>new</p>' }],
    ['location', { location: 'Remote' }],
    ['department', { department: 'Platform' }],
    ['employmentType', { employmentType: 'CONTRACT' }],
    ['remoteType', { remoteType: 'REMOTE' }],
    ['salaryMin', { salaryMin: 60000 }],
    ['salaryMax', { salaryMax: 90000 }],
    ['salaryCurrency', { salaryCurrency: 'EUR' }],
    ['validThrough', { validThrough: '2026-01-01' }],
    ['a new city', { locations: [{ city: 'Berlin' }] }],
  ])('moves when %s changes', (_field, patch) => {
    expect(contentHash(dto(patch))).not.toBe(contentHash(dto()));
  });
});
