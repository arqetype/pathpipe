import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { User } from '@repo/db/entities/user';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
  ) {}

  async findAll(): Promise<Application[]> {
    try {
      return await this.applicationsRepository.find();
    } catch {
      return null;
    }
  }

  async findByUser(userId: string): Promise<Application[]> {
    try {
      return await this.applicationsRepository.find({
        where: { user: { id: userId } },
      });
    } catch {
      return null;
    }
  }

  async findById(id: string): Promise<Application> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
    });
    if (!application) throw new NotFoundException();
    return application;
  }

  async findByIdAndUser(id: string, userId: string): Promise<Application> {
    const application = await this.applicationsRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!application) throw new NotFoundException();
    return application;
  }

  async create(user: User, application: Application): Promise<Application> {
    try {
      const newApplication = this.applicationsRepository.create({
        ...application,
        user,
      });
      return await this.applicationsRepository.save(newApplication);
    } catch {
      return null;
    }
  }

  async update(id: string, data: Partial<Application>): Promise<Application> {
    await this.findById(id);
    await this.applicationsRepository.update(id, data);
    return this.findById(id);
  }

  async updateByUser(
    id: string,
    userId: string,
    data: Partial<Application>,
  ): Promise<Application> {
    await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.update(id, data);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<Application> {
    await this.findById(id);
    await this.applicationsRepository.update(id, { status });
    return this.findById(id);
  }

  async updateStatusByUser(
    id: string,
    userId: string,
    status: ApplicationStatus,
  ): Promise<Application> {
    await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.update(id, { status });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.applicationsRepository.softDelete(id);
  }

  async removeByUser(id: string, userId: string): Promise<void> {
    await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.softDelete(id);
  }
}
