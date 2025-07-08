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

@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly roleService: RoleService,
  ) {}

  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Get()
  getAll() {
    return this.organizationService.findAll();
  }

  @HttpCode(HttpStatus.OK)
  @Get(':organizationId')
  async getById(
    @CurrentUser() user: User,
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizationService.findOneById(organizationId);
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminOrganizationGuard)
  @Delete(':organizationId')
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
