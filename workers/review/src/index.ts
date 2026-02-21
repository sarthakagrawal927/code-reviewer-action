import { loadReviewWorkerConfig } from './config';
import { handleJob } from './handlers';
import { createDefaultSeedJobs, InMemoryQueueAdapter } from './queue';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const config = loadReviewWorkerConfig();
  const queue = new InMemoryQueueAdapter(createDefaultSeedJobs());

  console.log(
    `[worker-review] started pollIntervalMs=${config.pollIntervalMs} maxIterations=${config.maxIterations}`
  );

  for (let iteration = 1; iteration <= config.maxIterations; iteration += 1) {
    const jobs = await queue.pull(5);

    if (jobs.length === 0) {
      console.log(`[worker-review] iteration=${iteration} queue empty`);
      await delay(config.pollIntervalMs);
      continue;
    }

    console.log(`[worker-review] iteration=${iteration} pulled=${jobs.length}`);

    for (const job of jobs) {
      try {
        await handleJob(job);
      } catch (error) {
        console.error(
          `[worker-review] job failed kind=${job.kind} error=${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    await delay(config.pollIntervalMs);
  }

  console.log('[worker-review] max iterations reached, exiting.');
}

void run();
