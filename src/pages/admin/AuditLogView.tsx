import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import { useAuditLogs } from '../../hooks/queries/useAuditLogs';
import type { AuditLog } from '../../services/api/audit';

export function AuditLogView() {
  const [filters, setFilters] = useState<{
    action?: AuditLog['action'];
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }>({});
  const [page, setPage] = useState(1);
  const limit = 50;

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.action, filters.entityType, filters.startDate, filters.endDate]);

  const { data, isLoading } = useAuditLogs({
    page,
    limit,
    ...filters,
  });
  const auditLogs = data?.auditLogs || [];
  const pagination = data?.pagination;

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
        <>
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

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-4 animate-fade-in">
            <div className="text-sm text-white/60">
              Showing <AnimatedNumber value={((pagination.page - 1) * pagination.limit) + 1} format="number" decimals={0} /> to{' '}
              <AnimatedNumber value={Math.min(pagination.page * pagination.limit, pagination.total)} format="number" decimals={0} /> of <AnimatedNumber value={pagination.total} format="number" decimals={0} /> audit logs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page === 1}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    pageNum = pagination.pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`min-w-[2rem] rounded-lg px-3 py-1.5 text-sm transition-all duration-200 hover:scale-110 ${
                        pagination.page === pageNum
                          ? 'bg-[#A8DADC] text-[#1A1A1C] font-medium'
                          : 'border border-white/10 text-white/70 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page === pagination.pages}
                className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          No audit logs found.
        </div>
      )}
    </div>
  );
}

