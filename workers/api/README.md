# API Worker (Enterprise v1)

Cloudflare Worker control-plane API for authentication, workspace tenancy, GitHub installation sync, rules, PR/review tracking, and action/webhook ingestion.

## Runtime

- Framework: Hono
- Target: Cloudflare Workers (`wrangler.toml`)
- Persistence: CockroachDB (Postgres wire protocol) via `COCKROACH_DATABASE_URL`

## Primary Endpoints

### Auth
- `GET /v1/auth/github/start`
- `GET /v1/auth/github/callback`
- `GET /v1/auth/session`
- `POST /v1/auth/logout`

### Workspaces + Members
- `GET /v1/workspaces`
- `POST /v1/workspaces`
- `GET /v1/workspaces/:workspaceId`
- `GET /v1/workspaces/:workspaceId/members`
- `POST /v1/workspaces/:workspaceId/invites`
- `PATCH /v1/workspaces/:workspaceId/members/:memberId`

### GitHub + Repositories
- `GET /v1/workspaces/:workspaceId/github/installations`
- `POST /v1/workspaces/:workspaceId/github/sync`
- `GET /v1/workspaces/:workspaceId/repositories`
- `POST /v1/workspaces/:workspaceId/repositories/:repositoryId/indexing/trigger`

### Rules
- `GET /v1/workspaces/:workspaceId/rules/default`
- `PUT /v1/workspaces/:workspaceId/rules/default`
- `GET /v1/repositories/:repositoryId/rules`
- `PUT /v1/repositories/:repositoryId/rules`
- `GET /v1/repositories/:repositoryId/rules/effective`

### PR + Reviews
- `GET /v1/repositories/:repositoryId/pull-requests`
- `GET /v1/pull-requests/:pullRequestId/reviews`
- `POST /v1/pull-requests/:pullRequestId/reviews/trigger`
- `GET /v1/review-runs/:reviewRunId/findings`

### Security + Ops
- `POST /v1/webhooks/github`
- `POST /v1/actions/reviews/trigger`
- `GET /v1/workspaces/:workspaceId/audit`
- `PUT /v1/workspaces/:workspaceId/secrets/gateway`
- `GET /v1/workspaces/:workspaceId/secrets/gateway`

## Local Development

```bash
npm run -w workers/api build
npm run -w workers/api dev
```

## Key Bindings

- `COCKROACH_DATABASE_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_OAUTH_REDIRECT_URI`
- `SESSION_SECRET`
- `GITHUB_WEBHOOK_SECRET`
- `PLATFORM_ACTION_TOKEN`
- `WORKSPACE_SECRET_ENCRYPTION_KEY`
- `API_WORKER_CORS_ORIGIN`
- `APP_BASE_URL`

Optional:

- `DB_USE_IN_MEMORY` (`true` to force in-memory adapter)
- `DB_MAX_CONNECTIONS` (defaults to `10`)
- `GITHUB_SYNC_TOKEN`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

## Schema Migration

```bash
cockroach sql --url "$COCKROACH_DATABASE_URL" < packages/db/migrations/0001_init.sql
```
