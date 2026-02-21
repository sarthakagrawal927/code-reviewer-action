# Dashboard App (Local Control Plane)

This dashboard is now a working local frontend for the v1 skeleton backend.

Current capabilities:

- Configure API base URL and optional auth token.
- Open GitHub App install flow (defaults to `core-reviewer` install URL).
- Auto-bootstrap a default local workspace org (`local-workspace`) for simpler setup.
- Proper one-click GitHub App connect for repositories (`owner/repo` or GitHub URL) with installation ID validation.
- Sync all repositories from the active GitHub App installation into local repository records.
- Run indexing for a selected repository/ref directly from the UI and inspect indexing run history.
- Create/list repositories.
- Load/update repository rules.
- Trigger/list review runs.
- Run drift checks and queue reconcile runs.
- Simulate GitHub webhook events and inspect recorded events.

Run locally:

```bash
cd /Users/sarthakagrawal/Desktop/code-reviewer/apps/dashboard
python3 -m http.server 4174
```

Then open: `http://localhost:4174`
