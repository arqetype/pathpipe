import { ACTIVITY_DAYS } from '@repo/db/query/dashboard';
import { buildActivity, isoDay, streakOf } from './activity';

const TODAY = new Date('2026-09-21T10:00:00Z');
const DAY_MS = 86_400_000;

/** `ago(0)` is today, `ago(1)` yesterday. */
const ago = (days: number) => isoDay(new Date(TODAY.getTime() - days * DAY_MS));

const activityOf = (sent: Record<number, number>) =>
  buildActivity(
    new Map(
      Object.entries(sent).map(([days, count]) => [ago(Number(days)), count]),
    ),
    TODAY,
  );

describe('buildActivity', () => {
  it('returns one row per day, oldest first', () => {
    const activity = activityOf({});

    expect(activity).toHaveLength(ACTIVITY_DAYS);
    expect(activity[0]?.date).toBe(ago(ACTIVITY_DAYS - 1));
    expect(activity.at(-1)?.date).toBe(ago(0));
  });

  it('fills the days nothing was sent with zero', () => {
    const activity = activityOf({ 0: 3, 2: 1 });

    expect(activity.at(-1)).toEqual({ date: ago(0), sent: 3 });
    expect(activity.at(-2)).toEqual({ date: ago(1), sent: 0 });
    expect(activity.at(-3)).toEqual({ date: ago(2), sent: 1 });
  });

  it('ignores counts outside the window', () => {
    const activity = activityOf({ [ACTIVITY_DAYS + 5]: 9 });

    expect(activity.every((day) => day.sent === 0)).toBe(true);
  });
});

describe('streakOf', () => {
  it('counts consecutive days back from today', () => {
    expect(streakOf(activityOf({ 0: 1, 1: 2, 2: 1 }))).toBe(3);
  });

  it('keeps the streak alive while today is still empty', () => {
    expect(streakOf(activityOf({ 1: 2, 2: 1 }))).toBe(2);
  });

  it('breaks on a gap rather than skipping it', () => {
    expect(streakOf(activityOf({ 0: 1, 2: 5, 3: 5 }))).toBe(1);
  });

  it('is zero when nothing was ever sent', () => {
    expect(streakOf(activityOf({}))).toBe(0);
  });
});
