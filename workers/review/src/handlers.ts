import { IndexingJob, ReviewJob, WorkerJob } from '@code-reviewer/shared-types';

function now(): string {
  return new Date().toISOString();
}

async function handleIndexingJob(job: IndexingJob): Promise<void> {
  // Placeholder for repository ingestion + indexing pipeline.
  console.log(`[worker-review] [${now()}] indexing repository=${job.payload.repositoryId} ref=${job.payload.sourceRef || 'default'}`);
}

async function handleReviewJob(job: ReviewJob): Promise<void> {
  // Placeholder for policy-aware PR review pipeline.
  console.log(
    `[worker-review] [${now()}] review repository=${job.payload.repositoryId} ` +
      `pr=${job.payload.prNumber} sha=${job.payload.headSha}`
  );
}

export async function handleJob(job: WorkerJob): Promise<void> {
  switch (job.kind) {
    case 'indexing':
      await handleIndexingJob(job);
      break;
    case 'review':
      await handleReviewJob(job);
      break;
    default: {
      const neverJob: never = job;
      throw new Error(`Unhandled job kind: ${String((neverJob as WorkerJob).kind)}`);
    }
  }
}
