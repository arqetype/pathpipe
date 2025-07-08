import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';
import {
  AvatarCustomizationDto,
  AvatarCustomizationResponseDto,
  AvatarCustomizationSaveResponseDto,
} from '@repo/db/dto/settings/avatar-customization.dto';
import { UserService } from './user.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@repo/db/types/user/roles';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  getAll() {
    return this.userService.findAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Post('avatar/preview')
  getAvatarPreview(
    @CurrentUser() user: User,
    @Body() avatarCustomizationDto: AvatarCustomizationDto,
  ): AvatarCustomizationResponseDto {
    const image = this.userService.generateAvatarWithSettings(
      avatarCustomizationDto,
      user.email,
      96,
    );

    return {
      message: 'Avatar customization preview generated successfully',
      image,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('avatar/save')
  async saveAvatarCustomization(
    @CurrentUser() user: User,
    @Body() avatarCustomizationDto: AvatarCustomizationDto,
  ): Promise<AvatarCustomizationSaveResponseDto> {
    await this.userService.updateUserAvatar(user, avatarCustomizationDto);

    return {
      success: true,
      message: 'Avatar customization saved successfully',
    };
  }
}
