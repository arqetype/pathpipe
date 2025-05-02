import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return await this.userService.findOneById(id);
  }
}
