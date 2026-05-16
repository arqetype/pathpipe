import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '@repo/db/entities/api-key';
import { User } from '@repo/db/entities/user';
import { randomUUID } from 'crypto';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async create(name: string, user: User): Promise<ApiKey> {
    const key = `pk_${randomUUID().replace(/-/g, '')}`;
    const apiKey = this.apiKeyRepository.create({ key, name, user });
    return this.apiKeyRepository.save(apiKey);
  }

  async findAll(userId: string): Promise<ApiKey[]> {
    const apiKeys = await this.apiKeyRepository.find({
      where: { user: { id: userId } },
      relations: { user: true },
    });

    return apiKeys.map((apiKey) => ({
      ...apiKey,
      key: `${apiKey.key.slice(0, 8)}•••••••••`,
    }));
  }

  async revoke(id: string): Promise<void> {
    await this.apiKeyRepository.update(id, { isActive: false });
  }
}
