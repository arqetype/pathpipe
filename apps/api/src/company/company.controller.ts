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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';
import { CompanyService } from './company.service';
import { CompanyImageService } from './company-image.service';
import { CompanyCsvService } from './company-csv.service';
import { CsvImportResult } from '@repo/db/dto/company/csv-import-result.dto';
import {
  CompanySearchResult,
  PaginatedCompanies,
} from '@repo/db/query/company';
import type { CompaniesQuery } from '@repo/db/query/company';
import { Company } from '@repo/db/entities/company';
import { UpdateCompanyDto } from '@repo/db/dto/company/update-company.dto';
import { UpdateCompanyStatusDto } from '@repo/db/dto/company/update-company-status.dto';

@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly companyImageService: CompanyImageService,
    private readonly companyCsvService: CompanyCsvService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  getAll(@Query() query: CompaniesQuery): Promise<PaginatedCompanies> {
    return this.companyService.findAll(query);
  }

  @HttpCode(HttpStatus.OK)
  @Get('suggestions')
  suggestions(
    @Query('query') query?: string,
    @Query('limit') limit?: number | string,
  ): Promise<CompanySearchResult[]> {
    return this.companyService.suggestions(
      query ?? '',
      limit ? Number(limit) : 20,
    );
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(@Body() data: { name: string }): Promise<Company> {
    return this.companyService.create(data.name);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':id/logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ success: boolean; updated_at: Date }> {
    const updated_at = await this.companyImageService.uploadLogo(
      id,
      file.buffer,
      file.mimetype,
    );
    return { success: true, updated_at };
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id/logo')
  async getLogo(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const logo = await this.companyImageService.getLogo(id);
    res.set({
      'Content-Type': logo.mimeType,
      'Cache-Control': 'max-age=31536000, immutable',
      'Content-Length': logo.buffer.length.toString(),
    });
    res.end(logo.buffer);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: UpdateCompanyDto,
  ): Promise<Company> {
    return this.companyService.update(id, data);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() data: UpdateCompanyStatusDto,
  ): Promise<Company> {
    return this.companyService.updateStatus(id, data.status);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.companyService.remove(id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('export')
  async exportToCSV(@Query() query: CompaniesQuery): Promise<{ data: string }> {
    const csv = await this.companyCsvService.exportToCSV(query);
    return { data: csv };
  }

  @HttpCode(HttpStatus.OK)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importFromCSV(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CsvImportResult> {
    return this.companyCsvService.importFromCSV(file.buffer);
  }
}
