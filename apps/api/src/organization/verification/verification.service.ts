import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import { OrganizationInvitationToken } from '@repo/db/entities/organization/organization-invitation-token';
import { Organization } from '@repo/db/entities/organization/organization';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(OrganizationInvitationToken)
    private readonly organizationInvitationTokenRepository: Repository<OrganizationInvitationToken>,
  ) {}

  // EMAIL VERIFICATION METHODS
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
