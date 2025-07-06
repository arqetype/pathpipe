import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { OrganizationInvitationToken } from '@repo/db/entities/organization/organization-invitation-token';
import { Organization } from '@repo/db/entities/organization/organization';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';

/**
 * Service responsible for managing authentication verification processes in the application.
 *
 * Handles email verification tokens, one-time passwords (OTP), and
 * reset password tokens for user authentication and verification workflows.
 */
@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(OrganizationInvitationToken)
    private readonly organizationInvitationTokenRepository: Repository<OrganizationInvitationToken>,
  ) {}

  // EMAIL VERIFICATION METHODS
  /**
   * Creates a new invitation token for an organization.
   *
   * Deletes any existing invitation tokens for the user before creating a new one.
   * The token expires after 24 hours.
   *
   * @param userEmail - The email of the user to invite
   * @param organization - The organization to invite the user to
   * @param role - The role of the user in the organization
   * @returns The plaintext invitation token (before hashing)
   */
  async createInvitationToken(
    userEmail: string,
    organization: Organization,
    role: OrganizationRole,
  ): Promise<string> {
    await this.organizationInvitationTokenRepository.delete({
      email: userEmail,
      organization,
    });

    const token = randomUUID();
    const emailInvitationToken =
      this.organizationInvitationTokenRepository.create({
        token: createHash('sha256').update(token).digest('hex'),
        organization,
        email: userEmail,
        role,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastSent: new Date(),
      });
    await this.organizationInvitationTokenRepository.save(emailInvitationToken);
    return token;
  }

  /**
   * Verifies an invitation token and returns the associated user.
   *
   * The token is removed after verification, whether successful or not.
   *
   * @param token - The invitation token to verify
   * @returns The user if the token is valid, null otherwise
   */
  async verifyInvitationToken(
    token: string,
  ): Promise<OrganizationInvitationToken> {
    const invitationToken =
      await this.organizationInvitationTokenRepository.findOne({
        where: { token: createHash('sha256').update(token).digest('hex') },
        relations: ['organization', 'role'],
      });

    if (!invitationToken || invitationToken.expires_at < new Date()) {
      return null;
    }

    await this.organizationInvitationTokenRepository.remove(invitationToken);
    return invitationToken;
  }
}
