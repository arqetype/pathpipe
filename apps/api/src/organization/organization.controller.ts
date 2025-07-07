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
} from '@nestjs/common';
import { CreateOrganizationDto } from '@repo/db/dto/organization/create-organization.dto';
import { InviteUsersDto } from '@repo/db/dto/organization/invite-users.dto';
import { AcceptInvitationDto } from '@repo/db/dto/organization/accept-invitation.dto';
import { OrganizationService } from './organization.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';
import { AdminOrganizationGuard } from './guards/admin-organization.guard';
import { RoleService } from './role/role.service';

@Controller('organization')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly roleService: RoleService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminOrganizationGuard)
  @Get(':organizationId')
  async findOneById(
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
      throw new Error('Organization not found');
    }
    const deleted = await this.organizationService.delete(organization);
    if (!deleted) {
      throw new Error('Failed to delete organization');
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
      throw new Error('Organization creation failed');
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
      throw new Error('Organization not found');
    }
    if (!role) {
      throw new Error('Role not found');
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
      throw new Error('Failed to accept invitation');
    }

    return member;
  }
}
