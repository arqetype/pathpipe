import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@repo/db/entities/user';
import { Repository } from 'typeorm';

/**
 * Service responsible for managing user data in the application.
 *
 * Provides methods for user creation, retrieval, and updates to user properties
 * such as password and email verification status.
 */
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /**
   * Creates a new user in the database.
   *
   * @param email - The user's email address
   * @param password - The user's password (should already be hashed)
   * @param name - The user's display name
   * @returns The newly created user entity
   */
  async create(email: string, password: string, name: string): Promise<User> {
    const user = this.usersRepository.create({ email, password, name });
    return this.usersRepository.save(user);
  }

  /**
   * Updates a user's password.
   *
   * @param userId - The ID of the user whose password to update
   * @param newPassword - The new password (should already be hashed)
   * @throws {Error} If user not found or if new password is the same as the old one
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.password === newPassword) {
      throw new Error('New password must be different from the old one');
    }

    user.password = newPassword;
    await this.usersRepository.save(user);
  }

  /**
   * Finds a user by their email address.
   *
   * @param email - The email address to search for
   * @returns The user if found, otherwise null
   */
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

  /**
   * Marks a user's email as verified.
   *
   * @param email - The email address of the user to update
   * @throws {Error} If user not found with the given email
   */
  async markEmailAsVerified(email: string): Promise<void> {
    const user = await this.findOneByEmail(email);
    user.email_verified = true;
    await this.usersRepository.save(user);
  }
}
