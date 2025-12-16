import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuditLogs } from '../../hooks/queries/useAuditLogs';
import type { AuditLog } from '../../services/api/audit';

export function AuditLogView() {
  const [filters, setFilters] = useState<{
    action?: AuditLog['action'];
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const { data, isLoading } = useAuditLogs({
    page: 1,
    limit: 50,
    ...filters,
  });
  const auditLogs = data?.auditLogs || [];

  const getActionColor = (action: AuditLog['action']) => {
    const colors = {
      CREATE: 'bg-green-500/30 text-green-300',
      UPDATE: 'bg-blue-500/30 text-blue-300',
      DELETE: 'bg-red-500/30 text-red-300',
      VIEW: 'bg-gray-500/30 text-gray-300',
      LOGIN: 'bg-purple-500/30 text-purple-300',
      LOGOUT: 'bg-yellow-500/30 text-yellow-300',
      EXPORT: 'bg-cyan-500/30 text-cyan-300',
      IMPORT: 'bg-indigo-500/30 text-indigo-300',
    };
    return colors[action] || 'bg-gray-500/30 text-gray-300';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit Trail"
        description="Track all system actions and changes for compliance and security."
      >
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.action || ''}
            onChange={(e) =>
              setFilters({ ...filters, action: e.target.value as AuditLog['action'] || undefined })
            }
            className="rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/70 focus:border-white/20 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="VIEW">View</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="EXPORT">Export</option>
            <option value="IMPORT">Import</option>
          </select>
          <select
            value={filters.entityType || ''}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value || undefined })}
            className="rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/70 focus:border-white/20 focus:outline-none"
          >
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="Company">Company</option>
            <option value="Contact">Contact</option>
            <option value="Lead">Lead</option>
            <option value="Deal">Deal</option>
            <option value="Task">Task</option>
            <option value="Product">Product</option>
            <option value="Quote">Quote</option>
            <option value="Invoice">Invoice</option>
          </select>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
            className="rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/70 focus:border-white/20 focus:outline-none"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
            className="rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/70 focus:border-white/20 focus:outline-none"
            placeholder="End Date"
          />
        </div>
      </PageHeader>

      {isLoading && auditLogs.length === 0 ? (
        <DataGridPlaceholder columns={['Action', 'Entity', 'User', 'Date', 'IP Address', 'Details']} />
      ) : auditLogs.length > 0 ? (
        <DataGrid
          columns={[
            {
              key: 'action',
              header: 'Action',
              render: (row) => {
                const log = row as AuditLog;
                return (
                  <span className={`rounded-full px-2 py-1 text-xs ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                );
              },
            },
            {
              key: 'entity',
              header: 'Entity',
              render: (row) => {
                const log = row as AuditLog;
                return `${log.entityType}${log.entityId ? ` (${log.entityId})` : ''}`;
              },
            },
            {
              key: 'user',
              header: 'User',
              render: (row) => {
                const log = row as AuditLog;
                return log.userId ? `${log.userId.name} (${log.userId.email})` : 'N/A';
              },
            },
            {
              key: 'date',
              header: 'Date',
              render: (row) => {
                const log = row as AuditLog;
                return new Date(log.createdAt).toLocaleString();
              },
            },
            {
              key: 'ip',
              header: 'IP Address',
              render: (row) => {
                const log = row as AuditLog;
                return log.ipAddress || 'N/A';
              },
            },
            {
              key: 'details',
              header: 'Details',
              render: (row) => {
                const log = row as AuditLog;
                if (log.changes && Object.keys(log.changes).length > 0) {
                  return (
                    <span className="text-xs text-white/60">
                      {Object.keys(log.changes).length} field(s) changed
                    </span>
                  );
                }
                return <span className="text-xs text-white/40">—</span>;
              },
            },
          ]}
          data={auditLogs}
        />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          No audit logs found.
        </div>
      )}
    </div>
  );
}

