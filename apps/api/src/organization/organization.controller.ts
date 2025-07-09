import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Param,
  Delete,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { CreateOrganizationDto } from '@repo/db/dto/organization/create-organization.dto';
import { InviteUsersDto } from '@repo/db/dto/organization/invite-users.dto';
import { AcceptInvitationDto } from '@repo/db/dto/organization/accept-invitation.dto';
import { OrganizationService } from './organization.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';
import { RoleService } from './role/role.service';
import { AdminOrganizationGuard } from './guards/admin-organization.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@repo/db/types/user/roles';

@ApiTags('Organizations')
@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly roleService: RoleService,
  ) {}

  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  @ApiOperation({
    summary: 'Get all organizations',
    description: 'Retrieve a list of all organizations. Admin access required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all organizations',
  })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions. Admin role required.',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  getAll() {
    return this.organizationService.findAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get(':organizationId')
  @ApiOperation({
    summary: 'Get organization by ID',
    description: 'Retrieve a specific organization by its ID',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'The unique identifier of the organization',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved organization',
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async getById(
    @CurrentUser() user: User,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizationService.findOneById(organizationId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminOrganizationGuard)
  @Delete(':organizationId')
  @ApiOperation({
    summary: 'Delete organization',
    description:
      'Delete an organization. Only the organization owner can perform this action.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'The unique identifier of the organization to delete',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Organization deleted successfully',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Organization not found',
  })
  @ApiUnauthorizedResponse({
    description: 'Only organization owner can delete the organization',
  })
  async delete(
    @CurrentUser() user: User,
    @Param('organizationId') organizationId: string,
  ) {
    const organization =
      await this.organizationService.findOneById(organizationId);
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.owner?.id !== user.id) {
      throw new UnauthorizedException(
        'You are not authorized to delete this organization',
      );
    }

    const deleted = await this.organizationService.delete(organization);
    if (!deleted) {
      throw new UnauthorizedException('Failed to delete organization');
    }

    return { success: true, message: 'Organization deleted successfully' };
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  @ApiOperation({
    summary: 'Create organization',
    description:
      'Create a new organization with the authenticated user as owner',
  })
  @ApiBody({
    type: CreateOrganizationDto,
    description: 'Organization creation details',
  })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required or organization creation failed',
  })
  @ApiBadRequestResponse({
    description: 'Invalid organization data provided',
  })
  async create(
    @CurrentUser() user: User,
    @Body() createOrganizationDto: CreateOrganizationDto,
  ) {
    const organization = await this.organizationService.create(
      user,
      createOrganizationDto.name,
      createOrganizationDto.description,
    );
    if (!organization) {
      throw new UnauthorizedException('Organization creation failed');
    }

    return organization;
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminOrganizationGuard)
  @Post('invite')
  @ApiOperation({
    summary: 'Invite users to organization',
    description:
      'Send invitations to users to join an organization. Admin access required.',
  })
  @ApiBody({
    type: InviteUsersDto,
    description: 'User invitation details including emails and role',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitations sent successfully',
  })
  @ApiNotFoundResponse({
    description: 'Organization or role not found',
  })
  @ApiForbiddenResponse({
    description: 'Admin access required for the organization',
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required',
  })
  async inviteUser(@Body() inviteUsersDto: InviteUsersDto) {
    const organization = await this.organizationService.findOneById(
      inviteUsersDto.organizationId,
    );
    const role = await this.roleService.findOneById(inviteUsersDto.roleId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.organizationService.inviteUsers(
      inviteUsersDto.userEmails,
      organization,
      role,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('accept-invitation')
  @ApiOperation({
    summary: 'Accept organization invitation',
    description: 'Accept an invitation to join an organization using a token',
  })
  @ApiBody({
    type: AcceptInvitationDto,
    description: 'Invitation acceptance details including the token',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully, user added to organization',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid token or failed to accept invitation',
  })
  @ApiBadRequestResponse({
    description: 'Invalid invitation token provided',
  })
  async acceptInvitation(
    @CurrentUser() user: User,
    @Body() acceptInvitationDto: AcceptInvitationDto,
  ) {
    const member = await this.organizationService.acceptInvitation(
      user,
      acceptInvitationDto.token,
    );

    if (!member) {
      throw new UnauthorizedException('Failed to accept invitation');
    }

    return member;
  }
}
