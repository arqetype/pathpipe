import { dylan } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
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
    const user = this.usersRepository.create({
      email,
      password,
      name,
      avatar_url: this.generateProfilePicture(email),
    });
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
   * @param email - The email address to mark as verified
   * @throws {Error} If user not found
   */
  async markEmailAsVerified(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) throw new Error('User not found');

    user.email_verified = true;
    await this.usersRepository.save(user);
  }

  /**
   * Creates a new GitHub user in the database.
   *
   * @param email - The user's email address from GitHub
   * @param password - A randomly generated password (will be hashed)
   * @param name - The user's display name from GitHub
   * @param githubId - The user's GitHub ID
   * @param avatarUrl - The user's avatar URL from GitHub
   * @returns The newly created user entity
   */
  async createGithubUser(
    email: string,
    password: string,
    name: string,
    githubId: string,
    avatarUrl?: string,
  ): Promise<User> {
    const user = this.usersRepository.create({
      email,
      password,
      name,
      github_id: githubId,
      avatar_url: avatarUrl,
      is_github_user: true,
      email_verified: true,
      need_otp: false,
    });
    return this.usersRepository.save(user);
  }

  /**
   * Updates an existing user entity.
   *
   * @param user - The user entity with updated properties
   * @returns The updated user entity
   */
  async update(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  /**
   * Generates a profile picture for a user based on a seed string.
   *
   * Uses the DiceBear library to create a unique avatar.
   *
   * @param seed - A string used to generate a consistent avatar
   * @returns A data URI representing the generated avatar image
   */
  generateProfilePicture(seed: string): string {
    const avatar = createAvatar(dylan, {
      seed,
      size: 64,
      backgroundColor: ['#ffccb5'],
      randomizeIds: true,
    });

    return avatar.toDataUri();
  }
}
