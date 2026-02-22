'use client';

import { useState } from 'react';
import { clientApiRequest } from './client-api';

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      className="secondary"
      disabled={busy}
      onClick={async () => {
        try {
          setBusy(true);
          await clientApiRequest('/v1/auth/logout', { method: 'POST' });
          window.location.href = '/login';
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Logout failed.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
