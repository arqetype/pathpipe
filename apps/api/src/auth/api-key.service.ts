import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '@repo/db/entities/api-key';
import { randomUUID } from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(name: string): Promise<ApiKey> {
    const key = `pk_${randomUUID().replace(/-/g, '')}`;
    const apiKey = this.apiKeyRepository.create({ key, name });
    return this.apiKeyRepository.save(apiKey);
  }

  async findAll(): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(uuid: string): Promise<void> {
    await this.apiKeyRepository.update(uuid, { isActive: false });
  }
}