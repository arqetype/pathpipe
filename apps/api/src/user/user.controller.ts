import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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

@ApiTags('Users')
@ApiBearerAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiOperation({
    summary: 'Get all users',
    description: 'Retrieve a list of all users. Admin access required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all users',
    type: [User],
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions. Admin role required.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  getAll() {
    return this.userService.findAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the profile information of the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user profile',
    type: User,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Post('avatar/preview')
  @ApiOperation({
    summary: 'Preview avatar customization',
    description:
      'Generate a preview of the avatar with custom settings without saving',
  })
  @ApiBody({
    type: AvatarCustomizationDto,
    description: 'Avatar customization settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar preview generated successfully',
    type: AvatarCustomizationResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
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
  @ApiOperation({
    summary: 'Save avatar customization',
    description: 'Save the avatar customization settings to user profile',
  })
  @ApiBody({
    type: AvatarCustomizationDto,
    description: 'Avatar customization settings to save',
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar customization saved successfully',
    type: AvatarCustomizationSaveResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
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
