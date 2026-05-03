import { dataSource } from '../database/data-source';
import { Task, TaskType, TaskStatus } from '@repo/db/entities/task';

export interface CreateTaskParams {
  type: TaskType;
  params?: Record<string, unknown>;
}

export interface UpdateTaskParams {
  status?: TaskStatus;
  result?: unknown;
  error?: string | null;
}

export class TaskRepository {
  private get repository() {
    return dataSource.getRepository(Task);
  }

  async create(params: CreateTaskParams): Promise<Task> {
    const task = this.repository.create({
      type: params.type,
      params: params.params ?? {},
      status: TaskStatus.PENDING,
    });
    return this.repository.save(task);
  }

  async findByUuid(uuid: string): Promise<Task | null> {
    return this.repository.findOne({ where: { uuid } });
  }

  async update(uuid: string, params: UpdateTaskParams): Promise<Task | null> {
    await this.repository.update(uuid, params);
    return this.findByUuid(uuid);
  }

  async setRunning(uuid: string): Promise<Task | null> {
    return this.update(uuid, { status: TaskStatus.RUNNING });
  }

  async setCompleted(uuid: string, result: unknown): Promise<Task | null> {
    return this.update(uuid, { status: TaskStatus.COMPLETED, result });
  }

  async setFailed(uuid: string, error: string): Promise<Task | null> {
    return this.update(uuid, { status: TaskStatus.FAILED, error });
  }
}
