import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Organization } from '@repo/db/entities/organization/organization';
import { Repository } from 'typeorm';

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
  ) {}
}
