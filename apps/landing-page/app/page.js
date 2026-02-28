import Image from "next/image";

const stats = [
  {
    value: "Line-mapped",
    title: "Grounded findings",
    body: "Comments stay tied to changed lines and pull request context.",
  },
  {
    value: "Policy-aware",
    title: "Configurable gates",
    body: "Fail CI on findings and severity thresholds defined by your rules.",
  },
  {
    value: "Enterprise v1",
    title: "Control plane architecture",
    body: "Action trigger, workspace rules, auditability, and operational controls.",
  },
];

const features = [
  {
    id: "01",
    tag: "Context",
    title: "Git interaction layer",
    body: "Pull request diffs, changed files, and thread metadata are assembled first so the model reviews with real scope.",
  },
  {
    id: "02",
    tag: "Intelligence",
    title: "Actionable review output",
    body: "AI returns line-level findings, severity, and practical remediation guidance for each issue.",
  },
  {
    id: "03",
    tag: "Control plane",
    title: "Rules and indexing expansion",
    body: "The next milestone extends org rule packs, deeper indexing, and dashboard-managed policy toggles.",
  },
];

const workflowSteps = [
  {
    label: "Step 1",
    title: "Ingest pull request context",
    body: "Capture changed files, hunks, and commit metadata from GitHub before inference starts.",
  },
  {
    label: "Step 2",
    title: "Run review intelligence",
    body: "Generate actionable findings per changed region with clear severity and fix guidance.",
  },
  {
    label: "Step 3",
    title: "Enforce release policy",
    body: "Post inline comments and fail CI based on your threshold or severity gates.",
  },
];

const reliabilityCards = [
  {
    title: "Webhook integrity",
    body: "GitHub delivery IDs are tracked for idempotency, with signature validation for trusted ingestion.",
  },
  {
    title: "Auditable operations",
    body: "Workspace actions are stored in audit logs for change traceability and operational review.",
  },
  {
    title: "Policy determinism",
    body: "Workspace defaults and repository overrides are versioned and applied consistently per run.",
  },
  {
    title: "Flexible persistence",
    body: "Cockroach/Postgres-backed control-plane storage with in-memory fallback for local development.",
  },
];

const workflowSnippet = `name: AI Code Review
on: [pull_request]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Code Reviewer
        uses: sarthakagrawal927/code-reviewer-action@v1
        with:
          platform_base_url: \${{ secrets.CODE_REVIEWER_PLATFORM_BASE_URL }}
          platform_token: \${{ secrets.CODE_REVIEWER_PLATFORM_TOKEN }}`;

export default function HomePage() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <header className="top">
        <div className="wrap nav">
          <a className="brand" href="#home">
            <span className="brand-dot" />
            <span>Sarthak AI Code Reviewer</span>
          </a>
          <div className="nav-links">
            <a
              className="btn btn-secondary"
              href="https://github.com/sarthakagrawal927/code-reviewer-action#readme"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
            <a
              className="btn btn-primary"
              href="https://github.com/sarthakagrawal927/code-reviewer-action"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </header>

      <main id="home" className="wrap page-shell">
        <section className="hero">
          <div className="hero-copy">
            <span className="kicker">GitHub Action + Enterprise Control Plane</span>
            <h1>
              Professional AI code review, designed for engineering teams.
            </h1>
            <p>
              Sarthak AI Code Reviewer is built around reliable diff context,
              practical findings, and deterministic policy enforcement in CI.
            </p>
            <div className="hero-actions">
              <a
                className="btn btn-primary"
                href="https://github.com/sarthakagrawal927/code-reviewer-action"
                target="_blank"
                rel="noopener noreferrer"
              >
                Start in 5 minutes
              </a>
              <a
                className="btn btn-secondary"
                href="https://github.com/sarthakagrawal927/code-reviewer-action/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report issue
              </a>
            </div>
            <div className="hero-pills">
              <span>Line-level findings</span>
              <span>Severity-aware checks</span>
              <span>Workspace policy rules</span>
            </div>
          </div>

          <div className="hero-stack">
            <div className="panel">
              <div className="snippet-head">
                <span>workflow.yml</span>
                <span className="dot-row">
                  <i className="dot" />
                  <i className="dot" />
                  <i className="dot" />
                </span>
              </div>
              <pre>
                <code>{workflowSnippet}</code>
              </pre>
              <div className="panel-footer">
                <article>
                  <strong>29 files</strong>
                  <span>Diff context captured</span>
                </article>
                <article>
                  <strong>6 findings</strong>
                  <span>Posted inline in PR</span>
                </article>
              </div>
            </div>

            <div className="preview-card fade-up" style={{ "--delay": "140ms" }}>
              <div className="preview-head">
                <span>Review snapshot</span>
                <b>v1 rollout</b>
              </div>
              <Image
                src="/images/hero.png"
                alt="Code review dashboard preview"
                width={960}
                height={640}
                priority
              />
            </div>
          </div>
        </section>

        <section className="stats">
          {stats.map((item, index) => (
            <article
              className="stat fade-up"
              key={item.title}
              style={{ "--delay": `${90 * index}ms` }}
            >
              <span className="stat-value">{item.value}</span>
              <b>{item.title}</b>
              <p>{item.body}</p>
            </article>
          ))}
        </section>

        <section className="section" id="features">
          <h2>Built to mirror how real teams ship software.</h2>
          <p className="section-lead">
            The product is structured around operational sequence: context
            capture, intelligent review output, then policy and indexing depth.
          </p>

          <div className="grid">
            {features.map((feature, index) => (
              <article
                className="card fade-up"
                key={feature.id}
                style={{ "--delay": `${110 + index * 90}ms` }}
              >
                <div className="card-top">
                  <div className="badge">{feature.id}</div>
                  <span className="card-tag">{feature.tag}</span>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="reliability">
          <h2>Operational reliability for production workflows</h2>
          <p className="section-lead">
            Core platform behaviors are designed for trust: secure ingestion,
            policy determinism, and audit-friendly operations.
          </p>
          <div className="reliability-grid">
            {reliabilityCards.map((card, index) => (
              <article
                className="reliability-card fade-up"
                key={card.title}
                style={{ "--delay": `${100 + index * 90}ms` }}
              >
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="workflow">
          <h2>Execution flow from event to enforcement</h2>
          <p className="section-lead">
            A clear sequence from pull request event to reviewer output and
            policy gate decision.
          </p>

          <div className="workflow">
            {workflowSteps.map((step, index) => (
              <article
                className="step fade-up"
                key={step.title}
                style={{ "--delay": `${120 + index * 90}ms` }}
              >
                <small>{step.label}</small>
                <h4>{step.title}</h4>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta">
          <h3>Start with actionable review. Scale with policy control.</h3>
          <p>
            This release gives your team high-quality pull request feedback in CI
            today and sets up a clean path to broader policy controls in the
            next milestone.
          </p>
          <a
            className="btn btn-primary"
            href="https://github.com/sarthakagrawal927/code-reviewer-action"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open repository
          </a>
        </section>
      </main>

      <footer className="wrap footer">
        <span>
          (c) {currentYear} Sarthak AI Code Reviewer. Open-source design source:
          Themesberg Landwind.
        </span>
      </footer>
    </>
  );
}
