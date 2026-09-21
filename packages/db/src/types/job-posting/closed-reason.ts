/** Why a posting stopped being offered. */
export enum JobPostingClosedReason {
  /** It disappeared from the board listing we discovered it on. */
  REMOVED_FROM_LISTING = 'REMOVED_FROM_LISTING',
  /** Its detail page answers 404/410, or redirects back to the board. */
  DEAD_LINK = 'DEAD_LINK',
  /** The page says the role is filled / no longer accepting applications. */
  MARKED_CLOSED = 'MARKED_CLOSED',
  /** Its own `validThrough` date has passed. */
  EXPIRED = 'EXPIRED',
}
