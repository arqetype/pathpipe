import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { OrganizationMember } from '@repo/db/entities/organization/organization-member';
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
}
