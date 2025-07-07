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

/**
 * Service responsible for managing organization data in the application.
 *
 * Provides methods for organization creation, retrieval, and updates to organization properties
 */
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

  /**
   * Finds an organization by its ID.
   *
   * @param id - The ID of the organization to find.
   * @returns A promise that resolves to the organization if found, or null if not found.
   */
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

  /**
   * Creates a new organization with the specified name and optional description.
   *
   * @param user - The user who is creating the organization, typically the owner.
   * @param name - The name of the organization.
   * @param description - An optional description of the organization.
   * @returns A promise that resolves to the created organization.
   */
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

  /**
   * Adds a member to an organization with a specified role.
   *
   * @param organization - The organization to which the user is being added.
   * @param user - The user being added to the organization.
   * @param role - The role assigned to the user in the organization.
   * @returns A promise that resolves to the created organization member.
   */
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
  /**
   * Invites users to an organization by sending them an email invitation.
   *
   * @param userEmails - An array of email addresses to invite.
   * @param organization - The organization to which users are being invited.
   * @param role - The role assigned to the invited users in the organization.
   * @returns A promise that resolves to an object containing lists of successfully invited and failed emails.
   */
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

  /**
   * Accepts an invitation to join an organization.
   *
   * @param user - The user accepting the invitation.
   * @param token - The invitation token.
   * @returns A promise that resolves to the updated organization member or null if the invitation is invalid.
   */
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
