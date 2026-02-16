# v1 Roadmap: Hosted Review Platform

v1 moves from standalone action setup to a hosted product with onboarding, repository context, and configurable policy.

## Product Surfaces

1. Landing page
2. Dashboard (auth, org/repo connection, settings)
3. GitHub app + onboarding automation

## v1 User Flow

1. User signs in and connects GitHub repository.
2. Platform creates onboarding commit/PR adding workflow + config YAML.
3. Repository is indexed for baseline context.
4. User configures review rules and thresholds in dashboard.
5. New PRs are reviewed against:
   - user-specific rules
   - platform default rules
6. PR receives score + findings + value-added signal.

## Core Features

- Repo connection and install status
- Rule management UI (severity thresholds, style/safety constraints)
- Repository indexing pipeline
- PR scoring in dashboard and PR comments
- Team and author metrics
  - average PR quality
  - risk density
  - review pass/fail trend

## Data and Services

- API service for auth, repos, rules, and reports
- Review worker service for PR event processing
- Storage for repository metadata, rule sets, and review results

## Success Criteria

- New repo setup in <10 minutes
- Deterministic policy application from dashboard rules
- Stable PR scoring and explainable finding traceability
- Historical PR quality metrics visible per repo and author
