import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { type CandidatesQuery } from '@repo/db/query/candidate';
import { CandidateStage } from '@repo/db/types/candidate/stage';
import { UserRole } from '@repo/db/types/user/roles';
import { Candidate } from '@repo/db/entities/candidate';
import { CreateCandidateDto } from '@repo/db/dto/candidate/create-candidate.dto';
import { User } from '@repo/db/entities/user';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  getAll(@CurrentUser() user: User, @Query() query: CandidatesQuery) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.findMany(query);
    }
    return this.applicationService.findMany(query);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.findById(id);
    }
    return this.applicationService.findByIdAndUser(id);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@CurrentUser() user: User, @Body() candidateDto: CreateCandidateDto) {
    return this.applicationService.create(user, candidateDto);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() data: Partial<Candidate>,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.update(id, data);
    }
    return this.applicationService.updateByUser(id, data);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id/status')
  updateStage(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') stage: CandidateStage,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.updateStage(id, stage);
    }
    return this.applicationService.updateStageByUser(id, stage);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.remove(id);
    }
    return this.applicationService.removeByUser(id);
  }
}
