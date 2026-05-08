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
import { CompanyService } from './company.service';
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
  constructor(private readonly companyService: CompanyService) {}

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
}
