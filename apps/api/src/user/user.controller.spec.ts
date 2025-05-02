import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { NotFoundException } from '@nestjs/common';
import { User } from '@repo/db/entities/user';

describe('UserController', () => {
  let controller: UserController;
  const mockUserService = {
    findOneById: jest.fn(),
  };

  const mockUser: User = {
    id: 'test-uuid',
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: null,
    email_verified: false,
    created_at: new Date(),
    accounts: [],
    meals: [],
    goals: [],
    aiRequests: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUser', () => {
    it('should return a user when given a valid id', async () => {
      mockUserService.findOneById.mockResolvedValueOnce(mockUser);

      const result = await controller.getUser('test-uuid');

      expect(result).toEqual(mockUser);
      expect(mockUserService.findOneById).toHaveBeenCalledWith('test-uuid');
    });

    it('should throw NotFoundException when user is not found', async () => {
      const userId = 'non-existent-uuid';
      mockUserService.findOneById.mockRejectedValueOnce(
        new NotFoundException(`User with ID ${userId} not found`),
      );

      await expect(controller.getUser(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockUserService.findOneById).toHaveBeenCalledWith(userId);
    });
  });
});
