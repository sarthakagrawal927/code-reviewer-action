const stats = [
  {
    title: "Git + PR context",
    body: "Diff lines, file metadata, and pull request context are gathered before review begins.",
  },
  {
    title: "Review engine",
    body: "AI produces line-specific findings with severity so teams can act quickly.",
  },
  {
    title: "CI policy gates",
    body: "Fail builds by finding threshold or severity when release rules require it.",
  },
];

const features = [
  {
    id: "1",
    title: "Git interaction layer",
    body: "Collect pull request diffs, changed files, and review context through GitHub APIs, then post inline comments back to the review thread.",
  },
  {
    id: "2",
    title: "Code review logic",
    body: "Analyze changed code and generate concrete findings tied to exact lines and practical fix guidance.",
  },
  {
    id: "3",
    title: "Rules and indexing roadmap",
    body: "Expand into repo and org-level rule packs, richer indexing, and dashboard-driven policy controls.",
  },
];

const workflowSteps = [
  {
    label: "Step 1",
    title: "Ingest pull request context",
    body: "On pull request events, gather changed files, hunks, and commit metadata from GitHub.",
  },
  {
    label: "Step 2",
    title: "Run review intelligence",
    body: "AI evaluates code changes and returns actionable findings with severity and confidence.",
  },
  {
    label: "Step 3",
    title: "Enforce release policy",
    body: "Post inline comments, enforce configured CI gates, and feed outcomes into the dashboard loop.",
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

      <main id="home" className="wrap">
        <section className="hero">
          <div>
            <span className="kicker">GitHub Action + OpenAI</span>
            <h1>
              AI code review mapped to the real product plan: git context,
              review logic, and policy controls.
            </h1>
            <p>
              The current build covers GitHub diff ingestion and inline AI
              review comments. Next milestones add organization-level rules,
              deeper indexing, and dashboard policy management.
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
          </div>

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
          </div>
        </section>

        <section className="stats">
          {stats.map((item, index) => (
            <article
              className="stat fade-up"
              key={item.title}
              style={{ "--delay": `${90 * index}ms` }}
            >
              <b>{item.title}</b>
              <span>{item.body}</span>
            </article>
          ))}
        </section>

        <section className="section" id="features">
          <h2>Roadmap alignment by design, not marketing copy.</h2>
          <p className="section-lead">
            The landing content mirrors the implementation plan: GitHub
            interaction first, review intelligence second, and rules plus
            indexing expansion next.
          </p>

          <div className="grid">
            {features.map((feature) => (
              <article className="card" key={feature.id}>
                <div className="badge">{feature.id}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="workflow">
          <h2>Execution flow across planned milestones</h2>
          <p className="section-lead">
            Each stage maps directly to the product direction captured in
            project notes.
          </p>

          <div className="workflow">
            {workflowSteps.map((step) => (
              <article className="step" key={step.title}>
                <small>{step.label}</small>
                <h4>{step.title}</h4>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta">
          <h3>Ship the platform in two loops: action first, dashboard next.</h3>
          <p>
            This release anchors the action workflow today and sets up the app
            split required for dashboard and policy management in the next
            phase.
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
