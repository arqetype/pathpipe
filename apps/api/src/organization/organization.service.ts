import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '@repo/db/entities/organization/organization';
import { User } from '@repo/db/entities/user';
import { Repository } from 'typeorm';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';
import { OrganizationMember } from '@repo/db/entities/organization/organization-member';
import { MailerService } from '../mailer/mailer.service';
import { VerificationService } from './verification/verification.service';
import { StringUtils } from '../common/utils/string.utils';

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
    @InjectRepository(OrganizationMember)
    private readonly organizationMembersRepository: Repository<OrganizationMember>,
    private readonly mailerService: MailerService,
    private readonly verificationService: VerificationService,
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
        });
      return organization;
    } catch {
      return null;
    }
  }

  /**
   * Finds the role of a user within a specific organization.
   *
   * @param organization - The organization.
   * @param userId - The ID of the user.
   * @returns A promise that resolves to the user's role in the organization, or null if not found.
   */
  async findUserRole(
    organization: Organization,
    user: User,
  ): Promise<OrganizationRole | null> {
    const member = await this.organizationMembersRepository.findOne({
      where: {
        organization: { id: organization.id },
        user: { id: user.id },
      },
      relations: ['role'],
    });

    return member?.role || null;
  }

  /**
   * Creates a new organization with the specified name and optional description.
   *
   * @param user - The user who is creating the organization, typically the owner.
   * @param name - The name of the organization.
   * @param description - An optional description of the organization.
   * @returns A promise that resolves to the created organization.
   */
  create(
    user: User,
    name: string,
    description?: string,
  ): Promise<Organization> {
    const organization = this.organizationsRepository.create({
      owner: user,
      name,
      description,
    });
    return this.organizationsRepository.save(organization);
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

        const invitation = this.organizationMembersRepository.create({
          organization,
          user: null,
          role: role,
        });
        await this.organizationMembersRepository.save(invitation);

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
      throw new Error('Invalid or expired invitation');
    }

    const existingMember = await this.organizationMembersRepository.findOne({
      where: {
        organization: { id: invitation.organization.id },
        user: { id: user.id },
      },
    });

    if (existingMember) {
      return existingMember;
    }

    const member = this.organizationMembersRepository.create({
      organization: invitation.organization,
      user,
      role: invitation.role,
    });

    return this.organizationMembersRepository.save(member);
  }
}
