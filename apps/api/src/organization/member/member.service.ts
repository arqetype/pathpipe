import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '@repo/db/entities/organization/organization';
import { OrganizationMember } from '@repo/db/entities/organization/organization-member';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';
import { User } from '@repo/db/entities/user';
import { Repository } from 'typeorm';

/**
 * Service responsible for managing organization member data in the application.
 *
 * Provides methods for adding, retrieving, and updating organization members.
 */
@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly organizationMembersRepository: Repository<OrganizationMember>,
  ) {}

  /**
   * Creates a new organization member instance.
   *
   * @param organization - The organization to which the member belongs.
   * @param user - The user who is a member of the organization.
   * @param role - The role of the user in the organization.
   * @returns A new instance of OrganizationMember.
   */
  create(
    organization: Organization,
    user: User,
    role: OrganizationRole,
  ): OrganizationMember {
    return this.organizationMembersRepository.create({
      organization,
      user,
      role,
    });
  }

  /**
   * Saves an organization member instance.
   *
   * @param member - The organization member to save.
   * @returns A promise that resolves to the saved organization member.
   */
  async save(member: OrganizationMember): Promise<OrganizationMember> {
    return this.organizationMembersRepository.save(member);
  }

  /**
   * Finds an organization member by user and organization.
   *
   * @param organization - The organization to find the member in.
   * @param user - The user to find in the organization. If not provided, it will search for members without a user.
   * @returns A promise that resolves to the organization member if found, or null if not found.
   */
  async findOneByUserAndOrganization(
    organization: { id: string },
    user: { id: string },
  ): Promise<OrganizationMember | null> {
    try {
      return await this.organizationMembersRepository.findOne({
        where: {
          organization: { id: organization.id },
          user: user ? { id: user.id } : null,
        },
      });
    } catch {
      return null;
    }
  }
}
