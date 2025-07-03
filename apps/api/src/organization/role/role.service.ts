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
}
