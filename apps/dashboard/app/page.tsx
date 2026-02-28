import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Enterprise Control Plane</span>
        <h1>Ship policy-aware AI code review without losing human context.</h1>
        <p>
          The dashboard gives your team a central control layer for auth, workspaces, repository operations, rule
          management, and pull request review execution.
        </p>
        <div className="hero-actions">
          <Link href="/login">Sign In</Link>
          <Link href="/onboarding">Onboarding</Link>
        </div>
        <div className="metric-grid">
          <article className="metric-card">
            <b>8 routes</b>
            <span>Core enterprise surface area</span>
          </article>
          <article className="metric-card">
            <b>Role-aware</b>
            <span>Owner, admin, member, viewer</span>
          </article>
          <article className="metric-card">
            <b>Policy ready</b>
            <span>Rules + review trigger workflow</span>
          </article>
        </div>
      </section>

      <section className="grid">
        <article className="panel span-12">
          <div className="section-head">
            <h2>Canonical Routes</h2>
            <p>Server-rendered and ready for integration.</p>
          </div>
          <div className="route-list">
            <div className="route-item">
              <code>/login</code>
            </div>
            <div className="route-item">
              <code>/onboarding</code>
            </div>
            <div className="route-item">
              <code>/w/[workspaceSlug]/overview</code>
            </div>
            <div className="route-item">
              <code>/w/[workspaceSlug]/repositories</code>
            </div>
            <div className="route-item">
              <code>/w/[workspaceSlug]/rules</code>
            </div>
            <div className="route-item">
              <code>/w/[workspaceSlug]/pull-requests</code>
            </div>
            <div className="route-item">
              <code>/w/[workspaceSlug]/settings/members</code>
            </div>
            <div className="route-item">
              <code>/w/[workspaceSlug]/settings/audit</code>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
