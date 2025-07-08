import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '@repo/db/entities/organization/organization';
import { User } from '@repo/db/entities/user';
import { Repository } from 'typeorm';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';
import { OrganizationMember } from '@repo/db/entities/organization/organization-member';
import { MailerService } from '../mailer/mailer.service';
import { VerificationService } from './verification/verification.service';
import { StringUtils } from '../common/utils/string.utils';
import { MemberService } from './member/member.service';
import { RoleService } from './role/role.service';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationsRepository: Repository<Organization>,
    private readonly verificationService: VerificationService,
    private readonly memberService: MemberService,
    private readonly roleService: RoleService,
    private readonly mailerService: MailerService,
  ) {}

  async findOneById(id: string): Promise<Organization | null> {
    try {
      const organization: Organization =
        await this.organizationsRepository.findOne({
          where: { id },
          relations: ['members', 'roles'],
        });
      return organization;
    } catch {
      return null;
    }
  }

  async findAll(): Promise<Organization[]> {
    try {
      const organizations: Organization[] =
        await this.organizationsRepository.find({
          relations: ['members', 'roles'],
        });
      return organizations;
    } catch {
      return [];
    }
  }

  async delete(organization: Organization): Promise<boolean> {
    try {
      await this.organizationsRepository.remove(organization);
      return true;
    } catch {
      return false;
    }
  }

  async create(
    user: User,
    name: string,
    description?: string,
  ): Promise<Organization> {
    try {
      const organization = this.organizationsRepository.create({
        owner: user,
        name,
        description,
      });

      const savedOrganization =
        await this.organizationsRepository.save(organization);

      const defaultRoles =
        await this.roleService.createDefaultRoles(savedOrganization);

      await this.addMember(organization, user, defaultRoles[0]);

      return savedOrganization;
    } catch {
      return null;
    }
  }

  async addMember(
    organization: Organization,
    user: User,
    role: OrganizationRole,
  ): Promise<OrganizationMember> {
    try {
      const member = this.memberService.create(organization, user, role);
      return await this.memberService.save(member);
    } catch {
      return null;
    }
  }

  // EMAIL INVITATION FLOW
  async inviteUsers(
    userEmails: string[],
    organization: Organization,
    role: OrganizationRole,
  ): Promise<{ invitedEmails: string[]; failedEmails: string[] }> {
    const invitedEmails: string[] = [];
    const failedEmails: string[] = [];

    for (const email of userEmails) {
      try {
        if (!StringUtils.isEmail(email)) {
          failedEmails.push(email);
          continue;
        }

        const token = await this.verificationService.createInvitationToken(
          email,
          organization,
          role,
        );

        const invitation = this.memberService.create(organization, null, role);
        await this.memberService.save(invitation);

        await this.mailerService.sendOrganizationInvitationEmail(email, token, {
          name: organization.name,
          profilePictureUrl: organization.avatar_url || '',
        });

        invitedEmails.push(email);
      } catch {
        failedEmails.push(email);
      }
    }

    return { invitedEmails, failedEmails };
  }

  async acceptInvitation(
    user: User,
    token: string,
  ): Promise<OrganizationMember> {
    const invitation =
      await this.verificationService.verifyInvitationToken(token);

    if (!invitation) {
      throw new UnauthorizedException('Invalid or expired invitation');
    }

    const existingMember =
      await this.memberService.findOneByUserAndOrganization(
        invitation.organization,
        user,
      );

    if (existingMember) {
      return existingMember;
    }

    const member = this.memberService.create(
      invitation.organization,
      user,
      invitation.role,
    );

    return this.memberService.save(member);
  }
}
