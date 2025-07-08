import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationMember } from '@repo/db/entities/organization/organization-member';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationMember])],
  providers: [MemberService],
  exports: [MemberService],
})
export class MemberModule {}
