import Link from 'next/link';
import { ScrollArea } from '@repo/ui/components/scroll-area';
import {
  STALE_AFTER_DAYS,
  STRONG_MATCH_SCORE,
  type DashboardResponse,
} from '@repo/db/query/dashboard';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { APPLICATION_STATUS_OPTIONS } from '@/components/features/applications/constants/status';
import { ApplicationItem } from './application-item';
import {
  ALL_MATCHES_URL,
  APPLIED_URL,
  INTERVIEW_URL,
  JOB_PROFILE_URL,
  OFFER_URL,
  SAVED_UNDECIDED_URL,
  STRONG_MATCHES_URL,
  WISHLIST_URL,
} from './links';
import { OfferItem } from './offer-item';
import { Panel } from './panel';
import { StatTile } from './stat-tile';

/** The board's own colour for a column, so the figures match the kanban. */
const dotOf = (status: ApplicationStatus): string | undefined =>
  APPLICATION_STATUS_OPTIONS.find((option) => option.status === status)
    ?.dotClass;

export function HomeDashboard({ dashboard }: { dashboard: DashboardResponse }) {
  const { stats, topMatches, savedOffers, wishlistApplications } = dashboard;

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 pb-10">
        <div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            <StatTile
              label="Wishlist"
              value={stats.wishlist}
              href={WISHLIST_URL}
              dotClass={dotOf(ApplicationStatus.WISHLIST)}
            />
            <StatTile
              label="Applied"
              value={stats.applied}
              href={APPLIED_URL}
              dotClass={dotOf(ApplicationStatus.APPLIED)}
            />
            <StatTile
              label="Interview"
              value={stats.interview}
              href={INTERVIEW_URL}
              dotClass={dotOf(ApplicationStatus.INTERVIEW)}
            />
            <StatTile
              label="Offer"
              value={stats.offer}
              href={OFFER_URL}
              dotClass={dotOf(ApplicationStatus.OFFER)}
            />
            <StatTile
              label={`Match ≥ ${STRONG_MATCH_SCORE}%`}
              value={stats.strongMatches}
              href={STRONG_MATCHES_URL}
            />
            <StatTile
              label="Saved"
              value={stats.savedUndecided}
              href={SAVED_UNDECIDED_URL}
            />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Sent this week: {stats.appliedThisWeek} · Week before:{' '}
            {stats.appliedLastWeek} · Reply rate:{' '}
            {stats.responseRate === null ? 'n/a' : `${stats.responseRate}%`}
          </p>
        </div>

        {/* Only when it changes what the scores are worth. */}
        {(!stats.hasProfile || stats.profileCompleteness < 60) && (
          <p className="rounded-lg border px-4 py-2.5 text-sm text-muted-foreground">
            {stats.hasProfile
              ? `Job profile ${stats.profileCompleteness}% complete.`
              : 'No job profile set, so offers carry no match score.'}{' '}
            <Link
              href={JOB_PROFILE_URL}
              className="font-medium text-foreground hover:underline"
            >
              {stats.hasProfile ? 'Edit' : 'Set up'}
            </Link>
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel
            title="Wishlist"
            count={stats.wishlist}
            seeAllHref={WISHLIST_URL}
            isEmpty={wishlistApplications.length === 0}
            empty="Nothing in the wishlist."
          >
            {wishlistApplications.map((application) => (
              <ApplicationItem
                key={application.id}
                application={application}
                actionLabel="Open offer"
              />
            ))}
          </Panel>

          <Panel
            title={`Match ≥ ${STRONG_MATCH_SCORE}%`}
            count={stats.strongMatches}
            seeAllHref={
              topMatches.length ? STRONG_MATCHES_URL : ALL_MATCHES_URL
            }
            isEmpty={topMatches.length === 0}
            empty={
              stats.hasProfile
                ? `No open offer scores ${STRONG_MATCH_SCORE}% or more.`
                : 'Offers are scored against the job profile. None set.'
            }
          >
            {topMatches.map((job) => (
              <OfferItem key={job.id} job={job} />
            ))}
          </Panel>

          <Panel
            title={`No reply for ${STALE_AFTER_DAYS}+ days`}
            count={stats.staleApplied}
            seeAllHref={APPLIED_URL}
            isEmpty={dashboard.staleApplications.length === 0}
            empty="Nothing has been waiting that long."
          >
            {dashboard.staleApplications.map((application) => (
              <ApplicationItem
                key={application.id}
                application={application}
                actionLabel="Open offer"
              />
            ))}
          </Panel>

          <Panel
            title="Saved, not applied"
            count={stats.savedUndecided}
            seeAllHref={SAVED_UNDECIDED_URL}
            isEmpty={savedOffers.length === 0}
            empty="No saved offer is without an application."
          >
            {savedOffers.map((job) => (
              <OfferItem key={job.id} job={job} />
            ))}
          </Panel>
        </div>
      </div>
    </ScrollArea>
  );
}
