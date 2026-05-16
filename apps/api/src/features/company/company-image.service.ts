import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '@repo/db/entities/company';
import sharp from 'sharp';

export type LogoResult = { buffer: Buffer; mimeType: string };

@Injectable()
export class CompanyImageService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  private async resolveCompanyLogoUrl(name: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://api.brandfetch.io/v2/search/${encodeURIComponent(name)}`,
      );
      if (!response.ok) return null;
      const results = (await response.json()) as Array<{ icon?: string }>;
      if (!results?.[0]?.icon) return null;
      return results[0].icon;
    } catch {
      return null;
    }
  }

  async hasLogo(companyId: string): Promise<boolean> {
    const company = await this.companiesRepository.findOne({
      where: { id: companyId },
      select: ['id', 'logoBlob'],
    });
    return company?.logoBlob != null;
  }

  async getLogo(companyId: string): Promise<LogoResult> {
    const company = await this.companiesRepository.findOne({
      where: { id: companyId },
      select: ['logoBlob', 'logoMimeType'],
    });
    if (!company?.logoBlob) {
      throw new NotFoundException('Logo not found');
    }
    return {
      buffer: company.logoBlob,
      mimeType: company.logoMimeType ?? 'image/png',
    };
  }

  async uploadLogo(
    companyId: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<Date> {
    const validMimeTypes = [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/svg+xml',
    ];
    if (!validMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Unsupported MIME type: ${mimeType}. Allowed: ${validMimeTypes.join(', ')}`,
      );
    }
    let finalBuffer = buffer;
    let finalMimeType = mimeType;
    if (mimeType !== 'image/svg+xml') {
      finalBuffer = await sharp(buffer)
        .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
      finalMimeType = 'image/webp';
    }

    await this.companiesRepository.update(
      { id: companyId },
      { logoBlob: finalBuffer, logoMimeType: finalMimeType },
    );
    const company = await this.companiesRepository.findOne({
      where: { id: companyId },
      select: ['updated_at'],
    });
    return company.updated_at;
  }

  async fetchAndSaveLogo(companyId: string, name: string): Promise<void> {
    const logoUrl = await this.resolveCompanyLogoUrl(name);
    if (!logoUrl) return;

    try {
      const response = await fetch(logoUrl);
      if (!response.ok) return;

      const contentType =
        response.headers.get('content-type') ?? 'image/svg+xml';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      await this.companiesRepository.update(
        { id: companyId },
        { logoBlob: buffer, logoMimeType: contentType },
      );
    } catch {
      // logo is optional
    }
  }
}
