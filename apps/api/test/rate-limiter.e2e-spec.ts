import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, Module } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Controller()
class TestController {
  @Get()
  get() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 5 }],
    }),
  ],
  controllers: [TestController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
class TestModule {}

describe('Rate Limiter (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should allow requests under the rate limit', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/').expect(200);
    }
  });

  it('should return 429 when exceeding the rate limit', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).get('/').expect(200);
    }

    await request(app.getHttpServer()).get('/').expect(429);
  });
});
