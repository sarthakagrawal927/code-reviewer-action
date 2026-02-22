'use client';

import { useMemo, useState } from 'react';
import { clientApiRequest } from './client-api';

type Member = {
  id: string;
  githubLogin: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'invited' | 'suspended' | 'removed';
};

export function MembersPanel({ workspaceId, members }: { workspaceId: string; members: Member[] }) {
  const [inviteRole, setInviteRole] = useState<Member['role']>('member');
  const [inviteeGithubLogin, setInviteeGithubLogin] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id || '');
  const [nextRole, setNextRole] = useState<Member['role']>('member');
  const [nextStatus, setNextStatus] = useState<Member['status']>('active');
  const [status, setStatus] = useState('');

  const selectedMember = useMemo(
    () => members.find(member => member.id === selectedMemberId),
    [members, selectedMemberId]
  );

  return (
    <div className="stack">
      <section className="panel">
        <h2>Create Invite</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="invitee-github-login">Invitee GitHub Login</label>
            <input
              id="invitee-github-login"
              value={inviteeGithubLogin}
              onChange={event => setInviteeGithubLogin(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={event => setInviteRole(event.target.value as Member['role'])}
            >
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="member">member</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="primary"
            onClick={async () => {
              try {
                const payload = await clientApiRequest(
                  `/v1/workspaces/${encodeURIComponent(workspaceId)}/invites`,
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      role: inviteRole,
                      inviteeGithubLogin
                    })
                  }
                );
                setStatus(`Invite created:\n${JSON.stringify(payload, null, 2)}`);
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Invite create failed.');
              }
            }}
          >
            Create Invite
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Update Member</h2>
        <div className="form-grid">
          <div>
            <label htmlFor="member-id">Member</label>
            <select
              id="member-id"
              value={selectedMemberId}
              onChange={event => setSelectedMemberId(event.target.value)}
            >
              {members.map(member => (
                <option key={member.id} value={member.id}>
                  {member.githubLogin} ({member.role}/{member.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="next-role">Role</label>
            <select id="next-role" value={nextRole} onChange={event => setNextRole(event.target.value as Member['role'])}>
              <option value="owner">owner</option>
              <option value="admin">admin</option>
              <option value="member">member</option>
              <option value="viewer">viewer</option>
            </select>
          </div>
          <div>
            <label htmlFor="next-status">Status</label>
            <select
              id="next-status"
              value={nextStatus}
              onChange={event => setNextStatus(event.target.value as Member['status'])}
            >
              <option value="active">active</option>
              <option value="invited">invited</option>
              <option value="suspended">suspended</option>
              <option value="removed">removed</option>
            </select>
          </div>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="warn"
            disabled={!selectedMember}
            onClick={async () => {
              if (!selectedMember) {
                return;
              }

              try {
                const payload = await clientApiRequest(
                  `/v1/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(selectedMember.id)}`,
                  {
                    method: 'PATCH',
                    body: JSON.stringify({
                      role: nextRole,
                      status: nextStatus
                    })
                  }
                );
                setStatus(`Member updated:\n${JSON.stringify(payload, null, 2)}`);
              } catch (error) {
                setStatus(error instanceof Error ? error.message : 'Member update failed.');
              }
            }}
          >
            Update Member
          </button>
        </div>
      </section>

      {status ? <pre>{status}</pre> : null}
    </div>
  );
}
