import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JobPreferenceService } from './job-preference.service';
import { extractResumeFile } from './resume/file';
import { UpdateJobPreferenceDto } from '@repo/db/dto/job-preference/update-job-preference.dto';
import {
  JobPreferenceResponse,
  ResumeProfileApplied,
} from '@repo/db/query/job-preference';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';

@Controller('job-preferences')
export class JobPreferenceController {
  constructor(private readonly jobPreferenceService: JobPreferenceService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  async find(@CurrentUser() user: User): Promise<JobPreferenceResponse> {
    return this.jobPreferenceService.find(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Put()
  async update(
    @CurrentUser() user: User,
    @Body() dto: UpdateJobPreferenceDto,
  ): Promise<JobPreferenceResponse> {
    return this.jobPreferenceService.update(user.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resume')
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<JobPreferenceResponse> {
    if (!file) throw new BadRequestException('No file was uploaded.');
    const text = await extractResumeFile(file);
    return this.jobPreferenceService.replaceResume(user.id, text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resume/apply')
  async applyResume(@CurrentUser() user: User): Promise<ResumeProfileApplied> {
    return this.jobPreferenceService.applyResume(user.id);
  }
}
