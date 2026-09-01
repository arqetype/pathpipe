import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, CompanyStatus } from '@repo/db/entities/company';
import { SeedCompanyDto } from '@repo/db/dto/company/seed-companies.dto';

/**
 * Registers companies found by a discovery run.
 *
 * Upsert by name, never blind insert: a discovery run is meant to be re-run,
 * and the second run must correct what the first got wrong rather than create a
 * second copy of every company.
 */
@Injectable()
export class CompanySeedService {
  private readonly logger = new Logger(CompanySeedService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  async list(): Promise<
    Array<{ id: string; name: string; careersUrl: string | null }>
  > {
    const companies = await this.companyRepository.find({
      select: { id: true, name: true, careersUrl: true },
      order: { name: 'ASC' },
    });
    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      careersUrl: company.careersUrl ?? null,
    }));
  }

  async seed(
    entries: SeedCompanyDto[],
  ): Promise<{ created: number; updated: number; unchanged: number }> {
    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const entry of entries) {
      const name = entry.name.trim();
      if (!name) continue;

      const existing = await this.companyRepository.findOne({
        where: { name },
      });

      if (!existing) {
        await this.companyRepository.save(
          this.companyRepository.create({
            name,
            careersUrl: entry.careersUrl,
            website: entry.website,
            // A seeded company is approved: a confirmed board answering with
            // real jobs is the evidence the pending state exists to wait for.
            status: CompanyStatus.APPROVED,
            isMonitored: true,
          }),
        );
        created += 1;
        continue;
      }

      // A careers URL somebody set by hand outranks one a discovery guessed.
      if (existing.careersUrl && existing.careersUrl !== entry.careersUrl) {
        unchanged += 1;
        continue;
      }
      if (existing.careersUrl === entry.careersUrl) {
        unchanged += 1;
        continue;
      }

      existing.careersUrl = entry.careersUrl;
      existing.website = existing.website ?? entry.website;
      existing.isMonitored = true;
      await this.companyRepository.save(existing);
      updated += 1;
    }

    if (created || updated) {
      this.logger.log(
        `Seeded companies: ${created} created, ${updated} updated, ${unchanged} left alone`,
      );
    }
    return { created, updated, unchanged };
  }
}
