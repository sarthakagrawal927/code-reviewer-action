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
        <h1>Enterprise Sign In</h1>
        <p>Authenticate with GitHub OAuth, then manage workspaces, repositories, rules, and review operations.</p>
        <div className="nav">
          <a href={startUrl}>Continue With GitHub</a>
          <Link href="/">Home</Link>
        </div>
      </section>

      <section className="grid">
        <article className="panel span-6">
          <h2>GitHub OAuth</h2>
          <p className="muted">
            Uses <code>/v1/auth/github/start</code> and <code>/v1/auth/github/callback</code> with signed state and secure
            session cookies.
          </p>
        </article>
        <article className="panel span-6">
          <h2>RBAC</h2>
          <p className="muted">
            Role-aware workspace access: <code>owner</code>, <code>admin</code>, <code>member</code>, <code>viewer</code>.
          </p>
        </article>
      </section>
    </main>
  );
}
