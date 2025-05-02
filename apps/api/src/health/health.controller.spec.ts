import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, type HealthCheckStatus } from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should call healthCheckService.check with an empty array', async () => {
      const expectedResult = {
        status: 'ok' as HealthCheckStatus,
        info: {},
        error: {},
        details: {},
      };
      jest.spyOn(healthCheckService, 'check').mockResolvedValue(expectedResult);

      const result = await controller.check();

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(healthCheckService.check).toHaveBeenCalledWith([]);
      expect(result).toEqual(expectedResult);
    });

    it('should handle errors from healthCheckService.check', async () => {
      const error = new Error('Health check failed');
      jest.spyOn(healthCheckService, 'check').mockRejectedValue(error);

      await expect(controller.check()).rejects.toThrow('Health check failed');
    });
  });
});
