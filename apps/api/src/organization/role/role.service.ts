import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';
import { Repository } from 'typeorm';

/**
 * Service responsible for managing organization role data in the application.
 *
 * Provides methods for assigning, retrieving, and updating organization member roles.
 */
@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(OrganizationRole)
    private readonly rolesRepository: Repository<OrganizationRole>,
  ) {}

  /**
   * Finds an organization role by its ID.
   *
   * @param id - The ID of the role to find.
   * @returns A promise that resolves to the organization role if found, or null if not found.
   */
  async findOneById(id: string): Promise<OrganizationRole | null> {
    try {
      return await this.rolesRepository.findOne({ where: { id } });
    } catch {
      return null;
    }
  }
}
