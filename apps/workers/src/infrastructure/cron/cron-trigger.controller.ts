import { Hono } from 'hono';
import { CronSchedulerService } from '@/domain/services/cron-scheduler.service';

export function createCronRouter(scheduler: CronSchedulerService) {
  const cronRouter = new Hono();

  cronRouter.post('/trigger/jobs/discover', async (c) => {
    await scheduler.triggerJobDiscovery();
    return c.json({ status: 'triggered' });
  });

  cronRouter.post('/trigger/enterprises/discover', async (c) => {
    await scheduler.triggerEnterpriseDiscovery();
    return c.json({ status: 'triggered' });
  });

  cronRouter.post('/trigger/score/:candidateId', async (c) => {
    const candidateId = c.req.param('candidateId');
    await scheduler.triggerScoring(candidateId);
    return c.json({ status: 'triggered' });
  });

  cronRouter.post('/trigger/notifications', async (c) => {
    await scheduler.triggerNotifications();
    return c.json({ status: 'triggered' });
  });

  return cronRouter;
}
