import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { OrganizationService } from '../organization.service';
import { User } from '@repo/db/entities/user';
import { MemberService } from '../member/member.service';

@Injectable()
export class AdminOrganizationGuard implements CanActivate {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly memberService: MemberService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: User;
      body: { organizationId?: string };
      params: { organizationId?: string };
    }>();

    const organizationId =
      request.body.organizationId || request.params.organizationId;

    if (!organizationId) {
      throw new ForbiddenException('Organization ID is required');
    }

    const organization =
      await this.organizationService.findOneById(organizationId);

    if (!organization) {
      throw new ForbiddenException(
        'You are not authorized to edit this organization',
      );
    }

    const userRole = await this.memberService
      .findOneByUserAndOrganization(organization, request.user)
      .then((member) => member?.role);

    if (organization.owner.id !== request.user.id && !userRole) {
      throw new ForbiddenException(
        'You are not authorized to edit this organization',
      );
    }

    return true;
  }
}
