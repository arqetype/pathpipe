import { IsBoolean, IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateJobSourceStateDto {
  @IsUrl({ require_tld: false })
  url: string;

  @IsOptional()
  @IsString()
  platform?: string | null;

  @IsOptional()
  @IsString()
  strategy?: string | null;

  @IsOptional()
  @IsString()
  etag?: string | null;

  @IsOptional()
  @IsString()
  lastModified?: string | null;

  @IsOptional()
  @IsString()
  contentHash?: string | null;

  @IsOptional()
  @IsInt()
  jobCount?: number | null;

  @IsOptional()
  @IsBoolean()
  requiresBrowser?: boolean;

  /** The job set differed from the previous run. */
  @IsOptional()
  @IsBoolean()
  changed?: boolean;

  /** Postings were written to the database in this run. */
  @IsOptional()
  @IsBoolean()
  synced?: boolean;

  @IsOptional()
  @IsString()
  error?: string | null;
}
