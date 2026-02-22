import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <h1>Code Reviewer Enterprise Dashboard</h1>
        <p>
          Multi-page control plane for authentication, workspace operations, repositories, rules, and PR review
          lifecycle.
        </p>
        <div className="nav">
          <Link href="/login">Sign In</Link>
          <Link href="/onboarding">Onboarding</Link>
        </div>
      </section>

      <section className="grid">
        <article className="panel span-12">
          <h2>Canonical Routes</h2>
          <p className="muted">All enterprise routes are now addressable and server-rendered on first load.</p>
          <div className="stack">
            <code>/login</code>
            <code>/onboarding</code>
            <code>/w/[workspaceSlug]/overview</code>
            <code>/w/[workspaceSlug]/repositories</code>
            <code>/w/[workspaceSlug]/rules</code>
            <code>/w/[workspaceSlug]/pull-requests</code>
            <code>/w/[workspaceSlug]/settings/members</code>
            <code>/w/[workspaceSlug]/settings/audit</code>
          </div>
        </article>
      </section>
    </main>
  );
}
