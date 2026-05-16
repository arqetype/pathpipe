import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiKeyProtected } from '../common/decorators/api-key-protected.decorator';

@ApiKeyProtected()
@Controller('internal/v1')
export class InternalController {
  @HttpCode(HttpStatus.OK)
  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
