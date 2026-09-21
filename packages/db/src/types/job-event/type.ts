/**
 * Something that happened, named in the past tense.
 *
 * An event is a fact, so it is never edited and never deleted — which is the
 * whole reason to keep one. A mutable status answers "where is this now?" and
 * loses "when did I apply, and how long did they take to say no?" the moment it
 * is overwritten. The status columns still exist, but they are a cache derived
 * from this log, not the record itself.
 */
export enum JobEventType {
  /** The user opened an offer. */
  POSTING_VIEWED = 'POSTING_VIEWED',
  /** The user bookmarked an offer. */
  POSTING_SAVED = 'POSTING_SAVED',
  POSTING_UNSAVED = 'POSTING_UNSAVED',
  /** The user said this one is not for them. */
  POSTING_DISMISSED = 'POSTING_DISMISSED',
  /** An offer was pushed onto the applications board. */
  APPLICATION_CREATED = 'APPLICATION_CREATED',
  /**
   * The application went out. This is the event that carries the immutable
   * snapshot of the job description, because this is the moment the wording the
   * user answered stops being whatever the board shows today.
   */
  APPLICATION_SENT = 'APPLICATION_SENT',
  /** The user chased a silent application. */
  FOLLOW_UP_SENT = 'FOLLOW_UP_SENT',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  OFFER_RECEIVED = 'OFFER_RECEIVED',
  REJECTION_RECEIVED = 'REJECTION_RECEIVED',
  /** The user gave up on ever hearing back. */
  MARKED_GHOSTED = 'MARKED_GHOSTED',
}

/**
 * Events a user may record by hand.
 *
 * The rest are written by the code that owns the action — nobody should be able
 * to POST "I was sent an offer snapshot" or forge a view count.
 */
export const USER_RECORDABLE_EVENTS: readonly JobEventType[] = [
  JobEventType.FOLLOW_UP_SENT,
  JobEventType.INTERVIEW_SCHEDULED,
  JobEventType.OFFER_RECEIVED,
  JobEventType.REJECTION_RECEIVED,
  JobEventType.MARKED_GHOSTED,
];
