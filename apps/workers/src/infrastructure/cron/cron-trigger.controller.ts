import { Hono } from 'hono';
import { CronSchedulerService } from '@/domain/services/cron-scheduler.service';

export function createCronRouter(scheduler: CronSchedulerService) {
  const cronRouter = new Hono();

  cronRouter.post('/trigger/jobs/discover', async (c) => {
    const { uuid } = await scheduler.triggerJobDiscovery();
    return c.json({ uuid, status: 'triggered' });
  });

  cronRouter.post('/trigger/enterprises/discover', async (c) => {
    const { uuid } = await scheduler.triggerEnterpriseDiscovery();
    return c.json({ uuid, status: 'triggered' });
  });

  cronRouter.post('/trigger/score/:candidateId', async (c) => {
    const candidateId = c.req.param('candidateId');
    const { uuid } = await scheduler.triggerScoring(candidateId);
    return c.json({ uuid, status: 'triggered' });
  });

  cronRouter.post('/trigger/notifications', async (c) => {
    const { uuid } = await scheduler.triggerNotifications();
    return c.json({ uuid, status: 'triggered' });
  });

  return cronRouter;
}
