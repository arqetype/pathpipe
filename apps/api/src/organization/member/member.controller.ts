import { Controller } from '@nestjs/common';
import { MemberService } from './member.service';

@Controller('organization/members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}
}
