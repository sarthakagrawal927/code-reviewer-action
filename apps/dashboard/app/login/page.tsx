import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPlatformApiBaseUrl, getSession } from '../../lib/platform';

export default async function LoginPage() {
  const session = await getSession();
  if (session.authenticated && session.workspaces.length > 0) {
    redirect(`/w/${session.workspaces[0].slug}/overview`);
  }

  const startUrl = `${getPlatformApiBaseUrl()}/v1/auth/github/start?redirectTo=/onboarding`;

  return (
    <main className="shell">
      <section className="hero">
        <span className="eyebrow">Authentication</span>
        <h1>Sign in with GitHub to open your review control plane.</h1>
        <p>
          Authenticate with GitHub OAuth, then manage workspaces, repositories, review rules, and PR operations from
          one dashboard.
        </p>
        <div className="hero-actions">
          <a href={startUrl}>Continue With GitHub</a>
          <Link href="/">Home</Link>
        </div>
      </section>

      <section className="grid">
        <article className="panel span-6">
          <div className="section-head">
            <h2>GitHub OAuth</h2>
            <p>Secure sign-in flow</p>
          </div>
          <p className="muted">
            Uses <code>/v1/auth/github/start</code> and <code>/v1/auth/github/callback</code> with signed state and secure
            session cookies.
          </p>
        </article>
        <article className="panel span-6">
          <div className="section-head">
            <h2>RBAC</h2>
            <p>Least-privilege access</p>
          </div>
          <p className="muted">
            Role-aware workspace access: <code>owner</code>, <code>admin</code>, <code>member</code>, <code>viewer</code>.
          </p>
          <div className="pill-list" style={{ marginTop: 10 }}>
            <span className="pill">Workspace scoped</span>
            <span className="pill">Session cookies</span>
            <span className="pill">Server-rendered auth</span>
          </div>
        </article>
      </section>
    </main>
  );
}
