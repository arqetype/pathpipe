import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '@repo/db/entities/organization/organization';
import { OrganizationMember } from '@repo/db/entities/organization/organization-member';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';
import { User } from '@repo/db/entities/user';
import { Repository } from 'typeorm';

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(OrganizationMember)
    private readonly organizationMembersRepository: Repository<OrganizationMember>,
  ) {}

  create(
    organization: Organization,
    user: User,
    role: OrganizationRole,
  ): OrganizationMember {
    try {
      return this.organizationMembersRepository.create({
        organization,
        user,
        role,
      });
    } catch {
      return null;
    }
  }

  async save(member: OrganizationMember): Promise<OrganizationMember> {
    try {
      return await this.organizationMembersRepository.save(member);
    } catch {
      return null;
    }
  }

  async findOneByUserAndOrganization(
    organization: Organization,
    user: User,
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
