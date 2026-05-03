import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanySearchResult } from '@repo/db/query/company';
import { Company } from '@repo/db/entities/company';
import { UpdateCompanyDto } from '@repo/db/dto/company/update-company.dto';
import { UpdateCompanyStatusDto } from '@repo/db/dto/company/update-company-status.dto';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  search(
    @Query('query') query?: string,
    @Query('limit') limit?: number | string,
  ): Promise<CompanySearchResult[]> {
    return this.companyService.search(query ?? '', limit ? Number(limit) : 20);
  }

  @HttpCode(HttpStatus.OK)
  @Get('all')
  getAll(): Promise<Company[]> {
    return this.companyService.findAll();
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
}
