import {
  BadRequestException,
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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UserFileService } from './user-file.service';
import { downloadFilename, PDF_MAX_BYTES } from './pdf';
import { UserFileKind } from '@repo/db/types/user-file/kind';
import { UserFileSummary } from '@repo/db/query/user-file';
import { UploadUserFileDto } from '@repo/db/dto/user-file/upload-user-file.dto';
import { RenameUserFileDto } from '@repo/db/dto/user-file/rename-user-file.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';

@Controller('files')
export class UserFileController {
  constructor(private readonly userFileService: UserFileService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  findMany(
    @CurrentUser() user: User,
    @Query('kind') kind?: UserFileKind,
  ): Promise<UserFileSummary[]> {
    if (kind && !Object.values(UserFileKind).includes(kind)) {
      throw new BadRequestException(`Unknown document kind: ${kind}`);
    }
    return this.userFileService.findMany(user.id, kind);
  }

  // Limit re-checked in assertPdf
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: PDF_MAX_BYTES } }),
  )
  upload(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadUserFileDto,
  ): Promise<UserFileSummary> {
    if (!file) throw new BadRequestException('No file was uploaded.');
    return this.userFileService.create(user.id, dto.kind, file, dto.name);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id/download')
  async download(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Res() res: Response,
    @Query('download') download?: string,
  ): Promise<void> {
    const { pdf, filename } = await this.userFileService.read(id, user.id);
    // `?download` is the "keep a copy" case; without it the file opens in the
    // browser's own viewer, which is what checking what you sent actually needs.
    const disposition = download === undefined ? 'inline' : 'attachment';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(pdf.length),
      'Content-Disposition': `${disposition}; filename="${downloadFilename(filename)}"`,
      // The bytes never change once stored, but they are one user's private
      // documents — a shared cache must never hold them.
      'Cache-Control': 'private, max-age=3600',
    });
    res.end(pdf);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  rename(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: RenameUserFileDto,
  ): Promise<UserFileSummary> {
    return this.userFileService.rename(id, user.id, dto.name);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    return this.userFileService.remove(id, user.id);
  }
}
