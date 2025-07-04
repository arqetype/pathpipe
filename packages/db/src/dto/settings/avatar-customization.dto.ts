import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';
import {
  AvatarHairStyleKeys,
  AvatarMoodKeys,
  type AvatarHairStyle,
  type AvatarMood,
} from '../../types/avatar';

export class AvatarCustomizationDto {
  @IsString()
  @IsIn(AvatarMoodKeys, {
    message: `Mood must be one of the following: ${AvatarMoodKeys.join(', ')}`,
  })
  mood: AvatarMood;

  @IsString()
  @IsIn(AvatarHairStyleKeys, {
    message: `Hair style must be one of the following: ${AvatarHairStyleKeys.join(', ')}`,
  })
  hairStyle?: AvatarHairStyle;

  @IsString()
  @Matches(/^[0-9a-fA-F]{6}$/, {
    message:
      'Hair color must be a valid 6-character hexadecimal color without the # prefix',
  })
  hairColor: string;

  @IsString()
  @Matches(/^[0-9a-fA-F]{6}$/, {
    message:
      'Skin color must be a valid 6-character hexadecimal color without the # prefix',
  })
  skinColor: string;

  @IsString()
  @Matches(/^[0-9a-fA-F]{6}$/, {
    message:
      'Background color must be a valid 6-character hexadecimal color without the # prefix',
  })
  backgroundColor: string;

  @IsBoolean()
  facialHair: boolean;
}

export class AvatarCustomizationResponseDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsNotEmpty()
  @IsString()
  image: string;
}

export class AvatarCustomizationSaveResponseDto {
  @IsBoolean()
  success: boolean;

  @IsNotEmpty()
  @IsString()
  message: string;
}
