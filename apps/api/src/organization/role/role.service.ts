import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '@repo/db/entities/organization/organization';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';
import { DEFAULT_ROLES } from '@repo/db/types/organization/default-roles';
import { Repository } from 'typeorm';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(OrganizationRole)
    private readonly rolesRepository: Repository<OrganizationRole>,
  ) {}

  async findOneById(id: string): Promise<OrganizationRole | null> {
    try {
      return await this.rolesRepository.findOne({
        where: { id },
        relations: ['organization'],
      });
    } catch {
      return null;
    }
  }

  async createDefaultRoles(
    organization: Organization,
  ): Promise<OrganizationRole[]> {
    const defaultRoles = [
      {
        name: DEFAULT_ROLES.OWNER,
        organization: organization,
        isAdmin: true,
        isOwner: true,
        description: 'The owner of the organization, has full access.',
      },
      {
        name: DEFAULT_ROLES.ADMIN,
        organization: organization,
        isAdmin: true,
        isOwner: false,
        description: 'An admin of the organization, has elevated access.',
      },
      {
        name: DEFAULT_ROLES.MEMBER,
        organization: organization,
        isAdmin: false,
        isOwner: false,
        description: 'A member of the organization, has standard access.',
      },
    ];

    try {
      const roleEntities = defaultRoles.map((role) =>
        this.rolesRepository.create(role),
      );
      return await this.rolesRepository.save(roleEntities);
    } catch {
      return null;
    }
  }
}
