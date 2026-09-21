/**
 * Employment types, normalised across boards.
 *
 * Every ATS spells this differently ("FullTime", "full_time", "CDI", "Temps
 * plein"); the worker folds them into this set so the UI can filter on it.
 */
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  TEMPORARY = 'TEMPORARY',
  INTERNSHIP = 'INTERNSHIP',
  APPRENTICESHIP = 'APPRENTICESHIP',
  FREELANCE = 'FREELANCE',
  VOLUNTEER = 'VOLUNTEER',
  OTHER = 'OTHER',
}
