import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

/** One board found by a discovery run, ready to be crawled. */
export class SeedCompanyDto {
  @IsString()
  @Length(1, 200)
  name: string;

  @IsString()
  @Length(1, 500)
  careersUrl: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  website?: string;

  /** Where it was found, e.g. 'ashby'. Kept for the log, not stored. */
  @IsOptional()
  @IsString()
  @Length(1, 60)
  source?: string;
}

export class SeedCompaniesDto {
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => SeedCompanyDto)
  companies: SeedCompanyDto[];
}
