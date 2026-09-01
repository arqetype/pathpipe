/**
 * The part of software somebody actually wants to work on.
 *
 * Kept as a small closed list rather than free text: this is the question
 * people answer most confidently about themselves, and a fixed set is what lets
 * it be matched against an offer's title and team instead of hoping two
 * spellings of "back-end" line up.
 */
export enum WorkDomain {
  FRONTEND = 'FRONTEND',
  BACKEND = 'BACKEND',
  FULLSTACK = 'FULLSTACK',
  MOBILE = 'MOBILE',
  DATA = 'DATA',
  MACHINE_LEARNING = 'MACHINE_LEARNING',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  SECURITY = 'SECURITY',
  EMBEDDED = 'EMBEDDED',
  QA = 'QA',
  PRODUCT = 'PRODUCT',
  DESIGN = 'DESIGN',
  RESEARCH = 'RESEARCH',
  DEVREL = 'DEVREL',
  SALES = 'SALES',
  MARKETING = 'MARKETING',
  OPERATIONS = 'OPERATIONS',
  FINANCE = 'FINANCE',
  OTHER = 'OTHER',
}

/**
 * How senior a role is, as boards actually title them.
 *
 * Deliberately coarse: the difference between "Senior" and "Staff" is a company
 * convention, but the difference between an internship and a lead role is not.
 */
export enum SeniorityLevel {
  INTERN = 'INTERN',
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
  MANAGER = 'MANAGER',
  DIRECTOR = 'DIRECTOR',
}
