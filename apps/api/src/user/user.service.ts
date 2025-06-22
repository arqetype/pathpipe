import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@repo/db/entities/user';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(email: string, password: string, name: string): Promise<User> {
    const user = this.usersRepository.create({ email, password, name });
    return this.usersRepository.save(user);
  }

  async findOneByEmail(email: string): Promise<User | null> {
    try {
      const user: User = await this.usersRepository.findOne({
        where: { email },
      });
      return user;
    } catch {
      return null;
    }
  }

  async markEmailAsVerified(email: string): Promise<void> {
    const user = await this.findOneByEmail(email);
    user.email_verified = true;
    await this.usersRepository.save(user);
  }
}
