import { Queue, Worker } from 'bullmq';
import { config } from './config.js';
import { handlers, JOB_SEARCH_REINDEX, JOB_STORAGE_CLEANUP, JOB_STORAGE_RECONCILE } from './jobs.js';

const QUEUE_NAME = 'bff-maintenance';

const connection = {
  host: config.redisHost,
  port: config.redisPort,
  password: config.redisPassword || undefined,
};

function scheduleRepeatableJobs(queue: Queue): void {
  void queue.add(
    JOB_STORAGE_CLEANUP,
    {},
    { repeat: { every: 15 * 60 * 1000 }, jobId: JOB_STORAGE_CLEANUP },
  );
  void queue.add(
    JOB_STORAGE_RECONCILE,
    {},
    { repeat: { every: 60 * 60 * 1000 }, jobId: JOB_STORAGE_RECONCILE },
  );
  void queue.add(
    JOB_SEARCH_REINDEX,
    {},
    { repeat: { every: 30 * 60 * 1000 }, jobId: JOB_SEARCH_REINDEX },
  );
}

async function main(): Promise<void> {
  if (!config.gatewayHmacSecret) {
    // eslint-disable-next-line no-console
    console.error('[worker] GATEWAY_HMAC_SECRET is required.');
    process.exit(1);
  }

  const queue = new Queue(QUEUE_NAME, { connection });
  scheduleRepeatableJobs(queue);

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const handler = handlers[job.name];
      if (!handler) {
        // eslint-disable-next-line no-console
        console.warn(`[worker] No handler for job ${job.name}`);
        return;
      }
      const result = await handler();
      // eslint-disable-next-line no-console
      console.log(`[worker] ${result.name} -> ${result.status}`, result.data);
    },
    { connection, concurrency: 1 },
  );

  worker.on('failed', (job, error) => {
    // eslint-disable-next-line no-console
    console.error(`[worker] ${job?.name} failed:`, error.message);
  });

  const shutdown = async (): Promise<void> => {
    await worker.close();
    await queue.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // eslint-disable-next-line no-console
  console.log('[worker] VPS maintenance worker started (concurrency=1).');
}

void main();

