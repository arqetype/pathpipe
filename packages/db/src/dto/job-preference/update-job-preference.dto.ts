import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { CompanyIndustry } from '../../types/company/industry';
import { EmploymentType } from '../../types/job-posting/employment-type';
import { RemoteType } from '../../types/job-posting/remote-type';
import {
  SeniorityLevel,
  WorkDomain,
} from '../../types/job-posting/work-domain';
import {
  MatchCriterion,
  MatchImportance,
  type MatchWeights,
} from '../../types/job-preference/importance';

/**
 * The weights map, checked key by key.
 *
 * It reaches the database as jsonb, so nothing else would stop an arbitrary
 * object from being stored under a user's profile and read back by the scorer.
 */
@ValidatorConstraint({ name: 'matchWeights' })
class IsMatchWeights implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.entries(value as Record<string, unknown>).every(
      ([key, level]) =>
        (Object.values(MatchCriterion) as string[]).includes(key) &&
        typeof level === 'string' &&
        (Object.values(MatchImportance) as string[]).includes(level),
    );
  }

  defaultMessage(): string {
    return 'weights must map a known criterion to a known importance';
  }
}

/**
 * The user's own description of what they are looking for.
 *
 * Every list may be empty, and an empty list means "no opinion" rather than
 * "nothing matches" — so a half-filled profile still ranks usefully instead of
 * emptying the board.
 */
export class UpdateJobPreferenceDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsEnum(EmploymentType, { each: true })
  employmentTypes?: EmploymentType[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsEnum(RemoteType, { each: true })
  remoteTypes?: RemoteType[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Length(2, 2, { each: true })
  countries?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @Length(1, 120, { each: true })
  cities?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(19)
  @IsEnum(WorkDomain, { each: true })
  domains?: WorkDomain[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsEnum(SeniorityLevel, { each: true })
  seniorities?: SeniorityLevel[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  motivations?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  keywords?: string[];

  /** Role titles, matched against the offer's title only. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(2, 80, { each: true })
  titles?: string[];

  /** Terms an offer must mention. The one part of a profile that can hide one. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  requiredKeywords?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(45)
  @IsEnum(CompanyIndustry, { each: true })
  industries?: CompanyIndustry[];

  /**
   * The CV as plain text. Skills are re-derived from it on every save, so
   * correcting the text is how a user corrects what we matched them on.
   */
  @IsOptional()
  @IsString()
  @MaxLength(40000)
  resumeText?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  excludedKeywords?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID(undefined, { each: true })
  excludedCompanyIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000000)
  minSalary?: number | null;

  /** ISO 4217, so the threshold means something outside one country. */
  @IsOptional()
  @IsString()
  @Length(3, 3)
  salaryCurrency?: string | null;

  /** Beyond this an offer stops earning freshness points; it is not hidden. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  maxAgeDays?: number | null;

  @IsOptional()
  @IsBoolean()
  openToRelocation?: boolean;

  @IsOptional()
  @IsObject()
  @Validate(IsMatchWeights)
  weights?: MatchWeights;

  @IsOptional()
  @IsBoolean()
  notifyMatches?: boolean;
}
