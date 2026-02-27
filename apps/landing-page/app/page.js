import Image from "next/image";

const stats = [
  {
    value: "92%",
    title: "High-signal comments",
    body: "Findings stay mapped to changed lines, so reviewers avoid generic noise.",
  },
  {
    value: "< 1m",
    title: "Fast feedback loop",
    body: "Pull request review starts quickly with context-aware analysis and severity.",
  },
  {
    value: "3 layers",
    title: "Built for control",
    body: "Action workflow now, policy rules next, dashboard controls after that.",
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
    title: "Practical code review output",
    body: "AI returns line-level findings, severity, and direct fix guidance that engineers can act on in one pass.",
  },
  {
    id: "03",
    tag: "Control plane",
    title: "Rules and indexing roadmap",
    body: "The next release extends to org rule packs, richer indexing, and dashboard-managed policy toggles.",
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
    body: "Generate actionable findings per changed region with clear severity and implementation advice.",
  },
  {
    label: "Step 3",
    title: "Enforce release policy",
    body: "Post inline comments and fail CI based on your threshold or severity gates.",
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
          openai_api_key: \${{ secrets.OPENAI_API_KEY }}
          github_token: \${{ secrets.GITHUB_TOKEN }}
          fail_on_findings: "true"
          fail_on_severity: "high"`;

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
            <span className="kicker">GitHub Action + OpenAI</span>
            <h1>
              Code review that feels like a staff engineer in your CI loop.
            </h1>
            <p>
              Sarthak AI Code Reviewer aligns with your delivery plan: reliable
              diff context first, high-signal findings second, and policy
              control expansion next.
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
              <span>Inline findings</span>
              <span>Severity aware</span>
              <span>Policy ready</span>
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
                  <span>PR context indexed</span>
                </article>
                <article>
                  <strong>6 findings</strong>
                  <span>Actionable in thread</span>
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
          <h2>Roadmap alignment by design, not marketing copy.</h2>
          <p className="section-lead">
            The interface maps directly to how the product ships: context
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

        <section className="section" id="workflow">
          <h2>Execution flow across planned milestones</h2>
          <p className="section-lead">
            A lightweight sequence that maps clearly from pull request event to
            reviewer action and policy enforcement.
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
          <h3>Ship the action now. Expand policy control next.</h3>
          <p>
            This release gives your team high-quality pull request feedback in
            CI today and cleanly sets up the dashboard policy plane for the next
            milestone.
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
