import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * The full set of offers a board still advertises, for one company.
 *
 * Anything stored for that company and source which is *not* in the set has
 * been taken down, so the API closes it. Only ever sent after a complete crawl
 * — a partial listing would close half a board by mistake.
 */
export class ReconcileJobPostingsDto {
  @IsUUID()
  companyId: string;

  /** Normalised careers URL the offers came from. */
  @IsString()
  source: string;

  /** Normalised URLs of every offer still on the board. */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20000)
  urls: string[];

  /** ATS ids of the same offers, when the platform exposes them. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20000)
  externalIds?: string[];
}
