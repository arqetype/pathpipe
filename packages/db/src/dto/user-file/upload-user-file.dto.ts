import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserFileKind } from '../../types/user-file/kind';

/** The text fields that ride along with the uploaded PDF. */
export class UploadUserFileDto {
  @IsEnum(UserFileKind)
  kind: UserFileKind;

  /** Left out, the filename becomes the name. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
