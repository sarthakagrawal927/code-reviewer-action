# Dashboard App (Enterprise v1)

This app is now a Next.js App Router dashboard for the enterprise control plane.

## Routes

- `/login`
- `/onboarding`
- `/w/[workspaceSlug]/overview`
- `/w/[workspaceSlug]/repositories`
- `/w/[workspaceSlug]/rules`
- `/w/[workspaceSlug]/pull-requests`
- `/w/[workspaceSlug]/settings/members`
- `/w/[workspaceSlug]/settings/audit`

## Local Run

```bash
npm run -w apps/dashboard dev
```

Default local URL: `http://localhost:4174`

Set backend API base URL (optional):

```bash
export NEXT_PUBLIC_PLATFORM_API_BASE_URL=http://127.0.0.1:8787
```
