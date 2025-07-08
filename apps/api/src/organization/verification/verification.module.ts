import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../../user/user.module';
import { OrganizationInvitationToken } from '@repo/db/entities/organization/organization-invitation-token';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrganizationInvitationToken]),
    UserModule,
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
