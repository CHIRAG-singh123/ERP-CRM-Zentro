import { KeyRound, ShieldCheck, Users2, User } from 'lucide-react';

import { PageHeader } from '../../components/common/PageHeader';

export function SettingsOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Centralize tenant configuration, identity providers, and automation defaults."
      />

      <section className="grid gap-6 md:grid-cols-2">
        <article className="space-y-3 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6">
          <div className="flex items-center gap-3 text-white">
            <User className="h-5 w-5 text-[#B39CD0]" />
            <h3 className="text-lg font-semibold">Profile</h3>
          </div>
          <p className="text-sm text-white/70">
            Manage your personal profile, avatar, timezone, email, and password in one place.
          </p>
          <a className="inline-flex text-sm text-[#B39CD0] hover:text-[#CEB9E0]" href="/settings/profile">
            Go to profile →
          </a>
        </article>
        <article className="space-y-3 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6">
          <div className="flex items-center gap-3 text-white">
            <Users2 className="h-5 w-5 text-[#A8DADC]" />
            <h3 className="text-lg font-semibold">Workspace Identity</h3>
          </div>
          <p className="text-sm text-white/70">
            Manage tenant provisioning, invite flows, and profile enrichment powered by Keycloak.
          </p>
          <a className="inline-flex text-sm text-[#A8DADC] hover:text-[#BCE7E5]" href="/settings/users">
            Manage users →
          </a>
        </article>
        <article className="space-y-3 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6">
          <div className="flex items-center gap-3 text-white">
            <KeyRound className="h-5 w-5 text-[#B39CD0]" />
            <h3 className="text-lg font-semibold">Authentication & SSO</h3>
          </div>
          <p className="text-sm text-white/70">
            Configure Keycloak realms, OIDC clients, and SCIM sync for external directories.
          </p>
          <a className="inline-flex text-sm text-[#B39CD0] hover:text-[#CEB9E0]" href="/settings/roles">
            View RBAC →
          </a>
        </article>
        <article className="space-y-3 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6">
          <div className="flex items-center gap-3 text-white">
            <ShieldCheck className="h-5 w-5 text-[#A8DADC]" />
            <h3 className="text-lg font-semibold">Security Policies</h3>
          </div>
          <p className="text-sm text-white/70">
            Define password policies, session lifetimes, and data residency requirements per tenant.
          </p>
          <button className="text-sm text-[#A8DADC] hover:text-[#BCE7E5]">Configure policies</button>
        </article>
      </section>
    </div>
  );
}

