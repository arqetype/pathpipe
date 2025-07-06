import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
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
  @Post('create')
  create(
    @CurrentUser() user: User,
    @Body() createOrganizationDto: CreateOrganizationDto,
  ) {
    return this.organizationService.create(
      user,
      createOrganizationDto.name,
      createOrganizationDto.description,
    );
  }

  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminOrganizationGuard)
  @Post('invite')
  async inviteUser(
    @CurrentUser() user: User,
    @Body() inviteUsersDto: InviteUsersDto,
  ) {
    const organization = await this.organizationService.findOneById(
      inviteUsersDto.organizationId,
    );
    const role = await this.roleService.findOneById(inviteUsersDto.roleId);

    if (!organization) throw new Error('Organization not found');
    if (!role) throw new Error('Role not found');

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
    return this.organizationService.acceptInvitation(
      user,
      acceptInvitationDto.token,
    );
  }
}
