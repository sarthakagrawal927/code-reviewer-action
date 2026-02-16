# v0 Lite: BYOK Diff Review Action

`v0 Lite` is a stateless GitHub Action intended for fast adoption.

## Design Choices

- BYOK gateway config (`ai_base_url`, `ai_api_key`)
- PR diff-only analysis (no repo-wide indexing)
- Summary + top inline findings
- No backend persistence
- Advisory by default, optional fail gate

## Behavior

- Updates one existing summary comment on reruns (idempotent marker)
- Retries transient gateway failures with backoff
- Filters findings to changed-line grounded issues
- Suppresses speculative/cosmetic rename suggestions

## Required Inputs

- `github_token`
- `ai_api_key`

## Optional Inputs

- `ai_base_url` (defaults to `https://api.openai.com/v1`)
- `model` (default `gpt-4o-mini`)
- `max_inline_findings` (default `5`)
- `min_inline_severity` (default `medium`)
- `review_tone` (default `balanced`)
- `fail_on_findings` (default `false`)
- `fail_on_severity` (default `high`)
- `gateway_max_retries` (default `1`, range `0-3`)

## Workflow Example

```yaml
name: AI Review Lite
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: sarthakagrawal927/code-reviewer-action@v0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          ai_base_url: ${{ secrets.AI_BASE_URL }}
          ai_api_key: ${{ secrets.AI_API_KEY }}
          model: "gpt-4o-mini"
          max_inline_findings: "5"
          min_inline_severity: "medium"
```

## Gateway Examples

### Vercel AI Gateway style

```text
AI_BASE_URL=https://<your-vercel-gateway-host>/v1
```

### Cloudflare AI Gateway style

```text
AI_BASE_URL=https://gateway.ai.cloudflare.com/v1/<account>/<gateway>/openai
```

### Bitfrost style

```text
AI_BASE_URL=https://<your-bitfrost-host>/v1
```
