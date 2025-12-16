import { Users2 } from 'lucide-react';

import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { useTeams } from '../../hooks/queries/useTeams';

export function SettingsTeamsPage() {
  const { data, isLoading, isError, error } = useTeams();
  const teams = data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Teams"
        description="Organize territories, round-robin queues, and collaboration spaces."
        actions={
          <button className="flex items-center gap-2 rounded-full bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9]">
            <Users2 className="h-4 w-4" />
            Create Team
          </button>
        }
      />

      {isLoading && teams.length === 0 ? (
        <DataGridPlaceholder columns={['Team', 'Members', 'Queue Type', 'Coverage', 'Escalation Policy']} />
      ) : teams.length > 0 ? (
        <DataGrid
          columns={[
            { key: 'team', header: 'Team' },
            { key: 'members', header: 'Members', render: (row) => `${(row as { members: number }).members}` },
            { key: 'queueType', header: 'Queue Type' },
            { key: 'coverage', header: 'Coverage' },
            { key: 'escalationPolicy', header: 'Escalation Policy' },
          ]}
          data={teams}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {isError ? (error as Error).message : 'No teams defined yet.'}
        </div>
      )}
    </div>
  );
}

