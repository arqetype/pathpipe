import {
  ACTIVITY_DAYS,
  type DashboardActivityDay,
} from '@repo/db/query/dashboard';

const DAY_MS = 86_400_000;

// Naive timestamps, UTC both sides.
export const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

/**
 * A row per day, zeros included.
 *
 * A bar chart with holes in it reads as missing data rather than as a quiet
 * week, and the streak needs the empty days to know where it stops.
 */
export const buildActivity = (
  sentPerDay: Map<string, number>,
  today: Date,
): DashboardActivityDay[] =>
  Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
    const offset = ACTIVITY_DAYS - 1 - index;
    const date = isoDay(new Date(today.getTime() - offset * DAY_MS));
    return { date, sent: sentPerDay.get(date) ?? 0 };
  });

// ponytail: streak capped at ACTIVITY_DAYS.
export const streakOf = (activity: DashboardActivityDay[]): number => {
  let streak = 0;
  for (let index = activity.length - 1; index >= 0; index--) {
    const sent = activity[index]?.sent ?? 0;
    if (sent > 0) {
      streak++;
      continue;
    }
    // An empty today has not broken anything yet.
    if (index < activity.length - 1) break;
  }
  return streak;
};
