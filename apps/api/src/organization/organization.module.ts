import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '@repo/db/entities/organization/organization';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { MemberModule } from './member/member.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [TypeOrmModule.forFeature([Organization]), MemberModule, RoleModule],
  providers: [OrganizationService],
  exports: [OrganizationService],
  controllers: [OrganizationController],
})
export class OrganizationModule {}
