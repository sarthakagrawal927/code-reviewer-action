# End-to-End Review Pipeline + Landing Page Design

Date: 2026-03-01

## Scope

1. Wire the review worker to CockroachDB (replace in-memory stub)
2. Implement `handleReviewJob` end-to-end
3. Fill `wrangler.toml` with secrets/bindings
4. Wire dashboard pages to API worker
5. Redesign landing page (CodeReviewAI brand)

---

## 1. Review Worker — DB Polling

**Approach:** Replace `InMemoryQueueAdapter` with `CockroachDbQueueAdapter` that polls `review_runs WHERE status = 'pending'`. Uses optimistic locking (`UPDATE ... WHERE status = 'pending' LIMIT 1 RETURNING *`) to claim jobs atomically.

**`handleReviewJob` flow:**
1. Claim review run (set `status = 'processing'`, set `started_at`)
2. Fetch PR diff from GitHub via installation token (`GET /repos/{owner}/{repo}/pulls/{pr_number}` with `Accept: application/vnd.github.diff`)
3. Fetch changed file list for metadata
4. Call `AIGatewayClient.reviewDiff()` → `ReviewFinding[]`
5. Write findings to `review_findings` table
6. Update `review_runs` with `status = 'completed'`, `score_composite`, `findings_count`, `completed_at`
7. Post inline PR review comments via GitHub API (`POST /repos/{owner}/{repo}/pulls/{pr_number}/reviews`)
8. On any error: set `status = 'failed'`, `error_message`

**`handleIndexingJob`:** Stub — log + mark `status = 'completed'` immediately (tree-sitter indexing is future work).

**Config additions to review worker:**
- `COCKROACH_DATABASE_URL`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `AI_GATEWAY_BASE_URL`
- `AI_GATEWAY_API_KEY`
- `AI_GATEWAY_MODEL`
- `REVIEW_WORKER_POLL_INTERVAL_MS` (default 5000)

---

## 2. wrangler.toml (API Worker)

Add `[vars]` block with non-secret defaults and a comment block listing all secrets to be uploaded via `wrangler secret put`:

Secrets:
- `COCKROACH_DATABASE_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_WEBHOOK_SECRET`
- `SESSION_SECRET`
- `PLATFORM_ACTION_TOKEN`
- `WORKSPACE_SECRET_ENCRYPTION_KEY`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `REVIEW_WORKER_URL` (so API can optionally HTTP-notify review worker)

---

## 3. Dashboard API Integration

Wire the 3 existing pages to the API worker (base URL from `NEXT_PUBLIC_API_URL` env):

- `/login` — already has UI; add `href` to `GET /auth/github` (OAuth redirect)
- `/onboarding` — already has UI; call `POST /workspaces` on submit
- `/w/[workspaceSlug]` — fetch workspace, repos list, recent review runs; render real data

Add a minimal `lib/api.ts` client in the dashboard with typed fetch helpers.

---

## 4. Landing Page (CodeReviewAI)

**Stack:** Next.js (existing `apps/landing-page`), plain CSS modules or inline styles (no new deps).

**Sections:**
1. **Nav** — logo + Features / Integrations / Pricing links + Login / Get Started buttons
2. **Hero** — "Review Code **10x Faster** with AI" headline, subtext, CTA pair, animated code editor mockup (CSS-only typing animation showing an AI suggestion appearing)
3. **Social proof bar** — "Trusted by engineering teams at" + greyscale company logos
4. **Features grid** — 3 cards: AI-Powered Insights, Seamless Workflow, Security First
5. **Demo section** — "Catch Bugs Before Production" with a split: left = code diff (red/green lines), right = CRITICAL alert + MERGE BLOCKED badge
6. **Footer** — logo, copyright, icon links

**Palette:** `#0d1117` bg, `#161b22` card bg, `#3b82f6` primary, `#7c3aed` accent, `#e6edf3` text.

**Improvements over screenshot:**
- Scroll-triggered fade-in animations
- Gradient text on hero headline highlight
- Glassmorphism card treatment
- Real product copy (no placeholder company names)
- Responsive mobile layout
