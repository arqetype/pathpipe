import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanySearchResult } from '@repo/db/query/company';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  search(
    @Query('query') query?: string,
    @Query('limit') limit?: number | string,
  ): Promise<CompanySearchResult[]> {
    return this.companyService.search(query ?? '', limit ? Number(limit) : 10);
  }
}
