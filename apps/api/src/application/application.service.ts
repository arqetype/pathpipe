import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from '@repo/db/entities/candidate';
import { CandidateStage } from '@repo/db/types/candidate/stage';
import { CandidatesQuery, PaginatedCandidates } from '@repo/db/query/candidate';
import { User } from '@repo/db/entities/user';
import { CreateCandidateDto } from '@repo/db/dto/candidate/create-candidate.dto';
@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
  ) {}

  async findMany(query: CandidatesQuery): Promise<PaginatedCandidates> {
    const {
      stage,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const allowedSortColumns = [
      'created_at',
      'updated_at',
      'firstName',
      'lastName',
    ];
    if (!allowedSortColumns.includes(sortBy as string)) {
      throw new Error(`Invalid sortBy value: ${sortBy}`);
    }

    const qb = this.candidatesRepository.createQueryBuilder('candidate');

    // TODO: filter by userId once JobOpening has a user relation

    if (stage) {
      const stages = Array.isArray(stage) ? stage : [stage];
      qb.andWhere('candidate.stage IN (:...stages)', { stages });
    }

    if (search) {
      qb.andWhere(
        '(candidate.firstName ILIKE :search OR candidate.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy(
      `candidate.${sortBy}`,
      sortOrder.toUpperCase() as 'ASC' | 'DESC',
    );

    const offset = (Number(page) - 1) * Number(limit);
    qb.skip(offset).take(Number(limit));

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<Candidate> {
    const candidate = await this.candidatesRepository.findOne({
      where: { id },
    });
    if (!candidate) throw new NotFoundException();
    return candidate;
  }

  async findByIdAndUser(id: string): Promise<Candidate> {
    return this.findById(id);
  }

  async create(_user: User, dto: CreateCandidateDto): Promise<Candidate> {
    const newCandidate = this.candidatesRepository.create({ ...dto });
    return this.candidatesRepository.save(newCandidate);
  }

  async update(id: string, data: Partial<Candidate>): Promise<Candidate> {
    await this.findById(id);
    await this.candidatesRepository.update(id, data);
    return this.findById(id);
  }

  async updateByUser(id: string, data: Partial<Candidate>): Promise<Candidate> {
    await this.findByIdAndUser(id);
    await this.candidatesRepository.update(id, data);
    return this.findById(id);
  }

  async updateStage(id: string, stage: CandidateStage): Promise<Candidate> {
    await this.findById(id);
    await this.candidatesRepository.update(id, { stage });
    return this.findById(id);
  }

  async updateStageByUser(
    id: string,
    stage: CandidateStage,
  ): Promise<Candidate> {
    await this.findByIdAndUser(id);
    await this.candidatesRepository.update(id, { stage });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.candidatesRepository.softDelete(id);
  }

  async removeByUser(id: string): Promise<void> {
    await this.findByIdAndUser(id);
    await this.candidatesRepository.softDelete(id);
  }
}
