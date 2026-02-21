# Review Worker Skeleton (v1)

This worker is the asynchronous execution-plane skeleton for v1.

## Current Behavior

- Pulls jobs from an in-memory queue adapter.
- Handles two job kinds:
  - `indexing`
  - `review`
- Logs job execution only (no external side effects yet).

## Run

```bash
npm run -w workers/review build
npm run -w workers/review start
```

Optional env vars:

- `REVIEW_WORKER_POLL_MS` (default `2000`)
- `REVIEW_WORKER_MAX_ITERATIONS` (default `10`)

## Next Integration Steps

1. Replace in-memory queue with durable queue (SQS/NATS/Redis streams).
2. Add idempotency keys per job for at-least-once delivery.
3. Persist run/indexing status to database.
4. Wire review job to gateway client + rule engine.
5. Add dead-letter queue and replay tooling.
