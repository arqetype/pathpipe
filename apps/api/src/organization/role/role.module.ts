import { Module } from '@nestjs/common';
import { RoleService } from './role.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationRole } from '@repo/db/entities/organization/organization-role';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationRole])],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
