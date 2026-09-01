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
import { extractResumeFile } from './resume-file';
import { UpdateJobPreferenceDto } from '@repo/db/dto/job-preference/update-job-preference.dto';
import { JobPreferenceResponse } from '@repo/db/query/job-preference';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';

@Controller('job-preferences')
export class JobPreferenceController {
  constructor(private readonly service: JobPreferenceService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  async find(@CurrentUser() user: User): Promise<JobPreferenceResponse> {
    return this.service.find(user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Put()
  async update(
    @CurrentUser() user: User,
    @Body() dto: UpdateJobPreferenceDto,
  ): Promise<JobPreferenceResponse> {
    return this.service.update(user.id, dto);
  }

  /**
   * Replace the CV from an uploaded PDF, .docx or text file.
   *
   * The file is read in memory and discarded; only the text it yields is
   * stored, on the same row and under the same rules as pasted text.
   */
  @HttpCode(HttpStatus.OK)
  @Post('resume')
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<JobPreferenceResponse> {
    if (!file) throw new BadRequestException('No file was uploaded.');
    const text = await extractResumeFile(file);
    return this.service.replaceResume(user.id, text);
  }
}
