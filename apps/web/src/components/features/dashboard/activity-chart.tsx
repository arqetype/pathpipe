'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  RadialBar,
  RadialBarChart,
  XAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@repo/ui/components/chart';
import {
  WEEKLY_GOAL,
  type DashboardActivityDay,
} from '@repo/db/query/dashboard';

const config = {
  sent: { label: 'Sent', color: 'var(--chart-2)' },
} satisfies ChartConfig;

const dayLabel = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });

interface ActivityChartProps {
  activity: DashboardActivityDay[];
  thisWeek: number;
  streakDays: number;
}

export function ActivityChart({
  activity,
  thisWeek,
  streakDays,
}: ActivityChartProps) {
  const done = Math.min(thisWeek, WEEKLY_GOAL);
  // Clockwise from noon; full circle at the goal.
  const endAngle = 90 - (done / WEEKLY_GOAL) * 360;

  return (
    <div className="grid gap-4 p-4 sm:grid-cols-[10rem_1fr] sm:items-center">
      <div className="relative mx-auto">
        <ChartContainer config={config} className="aspect-square w-40">
          <RadialBarChart
            data={[{ sent: done, fill: 'var(--color-sent)' }]}
            startAngle={90}
            endAngle={endAngle}
            innerRadius={58}
            outerRadius={80}
          >
            <RadialBar dataKey="sent" background cornerRadius={8} />
          </RadialBarChart>
        </ChartContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-medium tabular-nums">{thisWeek}</span>
          <span className="text-xs text-muted-foreground">
            of {WEEKLY_GOAL} this week
          </span>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {streakDays > 0 ? (
            <>
              <span className="font-medium text-foreground tabular-nums">
                {streakDays} day{streakDays > 1 ? 's' : ''}
              </span>{' '}
              in a row.
            </>
          ) : (
            'No streak going. One application starts one.'
          )}
        </p>

        <ChartContainer config={config} className="aspect-auto h-32 w-full">
          <BarChart data={activity} margin={{ top: 4, left: 0, right: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={dayLabel}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => dayLabel(String(value))}
                />
              }
            />
            <Bar dataKey="sent" fill="var(--color-sent)" radius={3} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
