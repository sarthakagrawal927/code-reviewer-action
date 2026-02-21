import { WorkerJob } from '@code-reviewer/shared-types';

export interface JobQueueAdapter {
  pull(batchSize: number): Promise<WorkerJob[]>;
}

export class InMemoryQueueAdapter implements JobQueueAdapter {
  private queue: WorkerJob[];

  constructor(seedJobs: WorkerJob[]) {
    this.queue = [...seedJobs];
  }

  async pull(batchSize: number): Promise<WorkerJob[]> {
    if (batchSize <= 0) {
      return [];
    }

    const next = this.queue.slice(0, batchSize);
    this.queue = this.queue.slice(batchSize);
    return next;
  }
}

export function createDefaultSeedJobs(): WorkerJob[] {
  return [
    {
      kind: 'indexing',
      payload: {
        repositoryId: 'repo_1',
        sourceRef: 'main',
      },
    },
    {
      kind: 'review',
      payload: {
        repositoryId: 'repo_1',
        prNumber: 42,
        headSha: 'placeholder-sha',
        triggeredBy: 'manual',
      },
    },
  ];
}
