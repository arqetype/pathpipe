import { Injectable } from '@nestjs/common';
import { parseString } from 'fast-csv';
import { writeToString } from 'fast-csv';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from '@repo/db/dto/company/create-company.dto';
import {
  CsvImportResult,
  CsvImportError,
} from '@repo/db/dto/company/csv-import-result.dto';
import { CompaniesQuery } from '@repo/db/query/company';
import { CompanyIndustry } from '@repo/db/types/company/industry';

@Injectable()
export class CompanyCsvService {
  constructor(private readonly companyService: CompanyService) {}

  async importFromCSV(buffer: Buffer): Promise<CsvImportResult> {
    return new Promise((resolve, reject) => {
      const errors: CsvImportError[] = [];
      const rows: CreateCompanyDto[] = [];
      let rowIndex = 0;

      parseString(buffer.toString('utf-8'), { headers: true, trim: true })
        .on('error', (error: Error) => reject(error))
        .on('data', (row: Record<string, string>) => {
          rowIndex++;
          const result = this.validateRow(row, rowIndex);

          if (result.error) {
            errors.push(result.error);
          } else if (result.data) {
            rows.push(result.data);
          }
        })
        .on('end', () => {
          void (async () => {
            let successCount = 0;

            for (const companyData of rows) {
              try {
                await this.companyService.createFromCsv(companyData);
                successCount++;
              } catch (error) {
                errors.push({
                  row: rowIndex,
                  message:
                    error instanceof Error ? error.message : 'Unknown error',
                  data: companyData as unknown as Record<string, string>,
                });
              }
            }

            resolve({
              successCount,
              errorCount: errors.length,
              errors,
            });
          })();
        });
    });
  }

  async exportToCSV(filters?: CompaniesQuery): Promise<string> {
    const { data: companies } =
      await this.companyService.findAllForExport(filters);

    const rows = companies.map((company) => ({
      name: company.name,
      website: company.website ?? '',
      careersUrl: company.careersUrl ?? '',
      industry: company.industry ?? '',
      country: company.country ?? '',
      status: company.status,
    }));

    return writeToString(rows, { headers: true });
  }

  private validateRow(
    row: Record<string, string>,
    rowIndex: number,
  ): { data?: CreateCompanyDto; error?: CsvImportError } {
    const name = row['name']?.trim();

    if (!name) {
      return {
        error: {
          row: rowIndex,
          message: 'Name is required',
          data: row,
        },
      };
    }

    const industry = row['industry']?.trim().toUpperCase();

    if (
      industry &&
      !Object.values(CompanyIndustry).includes(industry as CompanyIndustry)
    ) {
      return {
        error: {
          row: rowIndex,
          message: `Invalid industry. Allowed values: ${Object.values(CompanyIndustry).join(', ')}`,
          data: row,
        },
      };
    }

    return {
      data: {
        name,
        website: row['website']?.trim() || undefined,
        careersUrl: row['careersUrl']?.trim() || undefined,
        industry: (industry as CreateCompanyDto['industry']) || undefined,
        country: row['country']?.trim() || undefined,
      },
    };
  }
}
