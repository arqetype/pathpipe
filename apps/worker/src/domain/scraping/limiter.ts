/**
 * Runs tasks with a cap on how many are in flight, so a large watch list does
 * not open hundreds of sockets at once.
 */
export const createLimiter = (concurrency: number) => {
  const max = Math.max(1, concurrency);
  let active = 0;
  const queue: Array<() => void> = [];

  const next = (): void => {
    active--;
    queue.shift()?.();
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= max) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    active++;
    try {
      return await task();
    } finally {
      next();
    }
  };
};
