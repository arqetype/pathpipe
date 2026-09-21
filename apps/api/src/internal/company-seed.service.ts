import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, CompanyStatus } from '@repo/db/entities/company';
import { SeedCompanyDto } from '@repo/db/dto/company/seed-companies.dto';
import { capitalize, isSlugCased } from './company-name';

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
      const trimmed = entry.name.trim();
      if (!trimmed) continue;
      // Discovery names a company after its board token, which is a slug. It is
      // the name users read everywhere in the app, so it gets a capital here —
      // at the one door every discovered company comes through — rather than in
      // each place that displays it.
      const name = isSlugCased(trimmed) ? capitalize(trimmed) : trimmed;

      // Case-insensitively: a board answers to "nvidia" and "NVIDIA" alike, so
      // both spellings reach here for the same company.
      const existing = await this.companyRepository
        .createQueryBuilder('company')
        .where('lower(btrim(company.name)) = lower(btrim(:name))', { name })
        .getOne();

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

      // The rule holds for what is already on file: a company seeded before it
      // existed is still one discovery named. Matching is case-insensitive, so
      // the row found here may well be the lowercase one written last month.
      const renamed = isSlugCased(existing.name) && existing.name !== name;
      if (renamed) existing.name = name;

      // A careers URL somebody set by hand outranks one a discovery guessed,
      // and a URL that did not move is nothing to write.
      const keepsUrl =
        (existing.careersUrl && existing.careersUrl !== entry.careersUrl) ||
        existing.careersUrl === entry.careersUrl;

      if (keepsUrl) {
        if (!renamed) {
          unchanged += 1;
          continue;
        }
        await this.companyRepository.save(existing);
        updated += 1;
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
