import { Hono } from 'hono';
import { TaskRepository } from './task-repository';

export function createTaskRouter(taskRepository: TaskRepository) {
  const taskRouter = new Hono();

  taskRouter.get('/:uuid', async (c) => {
    const uuid = c.req.param('uuid');

    const task = await taskRepository.findByUuid(uuid);
    if (!task) {
      return c.json({ error: 'Task not found' }, 404);
    }

    return c.json({
      uuid: task.uuid,
      type: task.type,
      status: task.status,
      result: task.result,
      error: task.error,
      params: task.params,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    });
  });

  return taskRouter;
}
