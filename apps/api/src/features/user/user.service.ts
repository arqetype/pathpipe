import { dylan } from '@dicebear/collection';
import { createAvatar } from '@dicebear/core';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@repo/db/entities/user';
import { Repository } from 'typeorm';
import { PasswordUtils } from '../../common/utils/password.utils';
import { AvatarHairStyle, AvatarMood } from '@repo/db/types/user/avatar';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

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

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    user.password = newPassword;
    await this.usersRepository.save(user);
  }

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

  async findAll(): Promise<User[]> {
    try {
      const users: User[] = await this.usersRepository.find();
      return users;
    } catch {
      return [];
    }
  }

  async markEmailAsVerified(email: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) throw new Error('User not found');

    user.email_verified = true;
    await this.usersRepository.save(user);
  }

  async createGoogleUser(
    email: string,
    password: string,
    name: string,
    googleId: string,
    avatarUrl?: string,
  ): Promise<User> {
    const hashedPassword = await PasswordUtils.hashPassword(password);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
      google_id: googleId,
      avatar_url: avatarUrl,
      is_google_user: true,
      email_verified: true,
      need_otp: false,
    });
    return this.usersRepository.save(user);
  }

  async createLinkedinUser(
    email: string,
    password: string,
    name: string,
    linkedinId: string,
    avatarUrl?: string,
  ): Promise<User> {
    const hashedPassword = await PasswordUtils.hashPassword(password);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      name,
      linkedin_id: linkedinId,
      avatar_url: avatarUrl,
      is_linkedin_user: true,
      email_verified: true,
      need_otp: false,
    });
    return this.usersRepository.save(user);
  }

  async update(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  generateProfilePicture(seed: string): string {
    const avatar = createAvatar(dylan, {
      seed,
      size: 64,
      backgroundColor: ['#ffccb5'],
      randomizeIds: true,
    });

    return avatar.toDataUri();
  }

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

  async disableOtp(user: User): Promise<User> {
    user.need_otp = false;
    return this.usersRepository.save(user);
  }

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
