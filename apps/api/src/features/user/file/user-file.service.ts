import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserFile } from '@repo/db/entities/user-file';
import { UserFileKind } from '@repo/db/types/user-file/kind';
import { UserFileSummary } from '@repo/db/query/user-file';
import { assertPdf, compressPdf, decompressPdf } from './pdf';

// Never selects the content column
const SUMMARY_FIELDS = [
  'file.id',
  'file.kind',
  'file.name',
  'file.filename',
  'file.byteSize',
  'file.storedSize',
  'file.created_at',
  'file.updated_at',
] as const;

@Injectable()
export class UserFileService {
  constructor(
    @InjectRepository(UserFile)
    private readonly files: Repository<UserFile>,
  ) {}

  async findMany(
    userId: string,
    kind?: UserFileKind,
  ): Promise<UserFileSummary[]> {
    const qb = this.files
      .createQueryBuilder('file')
      .select(SUMMARY_FIELDS as unknown as string[])
      .where('file.userId = :userId', { userId })
      .orderBy('file.created_at', 'DESC');
    if (kind) qb.andWhere('file.kind = :kind', { kind });
    return (await qb.getMany()) as unknown as UserFileSummary[];
  }

  async findOne(id: string, userId: string): Promise<UserFileSummary> {
    const file = await this.files
      .createQueryBuilder('file')
      .select(SUMMARY_FIELDS as unknown as string[])
      .where('file.id = :id AND file.userId = :userId', { id, userId })
      .getOne();
    if (!file) throw new NotFoundException();
    return file as unknown as UserFileSummary;
  }

  async create(
    userId: string,
    kind: UserFileKind,
    file: { buffer: Buffer; originalname: string; size: number },
    name?: string,
  ): Promise<UserFileSummary> {
    assertPdf(file);
    const content = await compressPdf(file.buffer);
    const filename = file.originalname || 'document.pdf';

    const saved = await this.files.save(
      this.files.create({
        user: { id: userId } as UserFile['user'],
        kind,
        name: name?.trim() || filename.replace(/\.pdf$/i, ''),
        filename,
        byteSize: file.buffer.length,
        storedSize: content.length,
        content,
      }),
    );

    return this.findOne(saved.id, userId);
  }

  // Only place content is selected
  async read(
    id: string,
    userId: string,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const file = await this.files
      .createQueryBuilder('file')
      .select(['file.id', 'file.filename'])
      .addSelect('file.content')
      .where('file.id = :id AND file.userId = :userId', { id, userId })
      .getOne();
    if (!file) throw new NotFoundException();
    return { pdf: await decompressPdf(file.content), filename: file.filename };
  }

  async rename(
    id: string,
    userId: string,
    name: string,
  ): Promise<UserFileSummary> {
    await this.findOne(id, userId);
    await this.files.update({ id }, { name: name.trim() });
    return this.findOne(id, userId);
  }

  // Hard delete; FK sets null
  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.files.delete(id);
  }

  // Ownership check before attaching
  async assertAttachable(
    id: string,
    userId: string,
    kind: UserFileKind,
  ): Promise<void> {
    const file = await this.findOne(id, userId);
    if (file.kind !== kind) {
      throw new BadRequestException(
        kind === UserFileKind.RESUME
          ? 'That document is not a CV.'
          : 'That document is not a cover letter.',
      );
    }
  }
}
