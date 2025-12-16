import { ShieldCheck } from 'lucide-react';

import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { useRoles } from '../../hooks/queries/useRoles';

export function SettingsRolesPage() {
  const { data, isLoading, isError, error } = useRoles();
  const roles = data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Roles & Permissions"
        description="Manage CASL / Keycloak roles, scopes, and resource-based access controls."
        actions={
          <button className="flex items-center gap-2 rounded-full border border-[#B39CD0]/40 px-4 py-2 text-sm text-[#B39CD0] transition hover:border-[#B39CD0]/60 hover:text-[#D0C2E5]">
            <ShieldCheck className="h-4 w-4" />
            New Policy
          </button>
        }
      />

      {isLoading && roles.length === 0 ? (
        <DataGridPlaceholder columns={['Role', 'Scope', 'Description', 'Assignments']} />
      ) : roles.length > 0 ? (
        <DataGrid
          columns={[
            { key: 'role', header: 'Role' },
            { key: 'scope', header: 'Scope' },
            { key: 'description', header: 'Description' },
            {
              key: 'assignments',
              header: 'Assignments',
              render: (row) => `${(row as { assignments: number }).assignments}`,
            },
          ]}
          data={roles}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {isError ? (error as Error).message : 'No roles configured yet.'}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6 text-sm text-white/70">
        <h3 className="text-sm uppercase tracking-[0.32em] text-white/40">RBAC strategy</h3>
        <p className="mt-2">
          Permissions are resolved using CASL via Keycloak tokens. Define resource ownership, record-level security,
          and approval hierarchies for complex account structures.
        </p>
      </section>
    </div>
  );
}

