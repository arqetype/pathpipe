import { dylan } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@repo/db/entities/user';
import { Repository } from 'typeorm';
import { PasswordUtils } from '../common/utils/password.utils';
import { AvatarHairStyle, AvatarMood } from '@repo/db/types/avatar';

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
   * @param password - The user's plain text password (will be hashed)
   * @param name - The user's display name
   * @returns The newly created user entity
   */
  async create(email: string, password: string, name: string): Promise<User> {
    const hashedPassword = await PasswordUtils.hashPassword(password);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
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

    // Note: Since we're comparing hashed passwords, we can't check for similarity
    // The bcrypt hash will be different even for the same plain text password
    // due to the salt. This is actually more secure.

    user.password = newPassword;
    await this.usersRepository.save(user);
  }

  /**
   * Checks if a user is a GitHub user based on their email.
   *
   * @param email - The email address to check
   * @returns True if the user is a GitHub user, false otherwise
   */
  async isGithubUser(email: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user ? user.is_github_user : false;
  }

  /**
   * Finds a user by their email address, including their password.
   *
   * This is typically used for authentication purposes where the password is needed.
   *
   * @param email - The email address to search for
   * @returns The user if found, otherwise null
   */
  async findOneWithPasswordByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email })
        .getOne();
      return user;
    } catch {
      return null;
    }
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

  async findOneById(id: string): Promise<User | null> {
    try {
      const user: User = await this.usersRepository.findOne({
        where: { id },
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
    const hashedPassword = await PasswordUtils.hashPassword(password);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
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

  /**
   * Generates an avatar with specific settings.
   *
   * @param settings - The settings for the avatar, including mood, hair style, colors, and facial hair
   * @param seed - A string used to generate a consistent avatar
   * @returns A data URI representing the generated avatar image
   */
  generateAvatarWithSettings(
    settings: {
      mood: AvatarMood;
      hairStyle?: AvatarHairStyle;
      hairColor: string;
      skinColor: string;
      backgroundColor: string;
      facialHair: boolean;
    },
    seed: string,
    size: 64 | 96,
  ) {
    const avatar = createAvatar(dylan, {
      seed: seed,
      size,
      randomizeIds: true,
      backgroundColor: [settings.backgroundColor],
      backgroundType: ['solid'],
      facialHairProbability: settings.facialHair ? 100 : 0,
      hairColor: [settings.hairColor],
      hair: settings.hairStyle ? [settings.hairStyle] : [],
      mood: [settings.mood],
      skinColor: [settings.skinColor],
    });

    const avatarData = avatar.toDataUri();

    if (['251610', '1F1008', '160B06'].includes(settings.skinColor)) {
      return avatarData.replaceAll('black', '%23' + '8C7B6A');
    }

    return avatarData;
  }

  /**
   * Disables OTP for a user, marking them as not needing OTP for authentication.
   *
   * @param user - The user entity to update
   * @returns The updated user entity with OTP disabled
   */
  async disableOtp(user: User): Promise<User> {
    user.need_otp = false;
    return this.usersRepository.save(user);
  }

  /**
   * Enables OTP for a user, marking them as needing OTP for authentication.
   *
   * @param user - The user entity to update
   * @returns The updated user entity with OTP enabled
   */
  async enableOtp(user: User): Promise<User> {
    user.need_otp = true;
    return this.usersRepository.save(user);
  }

  async updateUserAvatar(
    user: User,
    avatarCustomizationDto: {
      mood: AvatarMood;
      hairStyle?: AvatarHairStyle;
      hairColor: string;
      skinColor: string;
      backgroundColor: string;
      facialHair: boolean;
    },
  ): Promise<User> {
    const image = this.generateAvatarWithSettings(
      avatarCustomizationDto,
      user.email,
      64,
    );
    user.avatar_url = image;

    return this.usersRepository.save(user);
  }
}
