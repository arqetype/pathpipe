import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@repo/db/entities/organization/organization';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { MemberModule } from './member/member.module';
import { RoleModule } from './role/role.module';
import { OrganizationMember } from '@repo/db/entities/organization/organization-member';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';
import { MailerModule } from '../mailer/mailer.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMember,
      OrganizationRole,
    ]),
    MemberModule,
    RoleModule,
    MailerModule,
    VerificationModule,
  ],
  providers: [OrganizationService],
  exports: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
