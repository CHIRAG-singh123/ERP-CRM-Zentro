import { useState, useEffect } from 'react';
import { Search, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { AnimatedNumber } from '../../components/common/AnimatedNumber';
import { useInvoices, useDeleteInvoice } from '../../hooks/queries/useInvoices';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DownloadPDFButton } from '../../components/invoices/DownloadPDFButton';
import { useAuth } from '../../context/AuthContext';
import type { Invoice } from '../../services/api/invoices';

export function InvoicesListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | ''>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const canDelete = user?.role === 'admin' || user?.role === 'employee';

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

  const { data, isLoading } = useInvoices({
    page,
    limit,
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  });
  const invoices = data?.invoices ?? [];
  const pagination = data?.pagination;
  const deleteInvoice = useDeleteInvoice();

  const handleDelete = async (id: string) => {
    try {
      await deleteInvoice.mutateAsync(id);
      setDeleteId(null);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const getStatusColor = (status: Invoice['status']) => {
    const colors = {
      Draft: 'bg-gray-500/30 text-gray-300',
      Sent: 'bg-blue-500/30 text-blue-300',
      Paid: 'bg-green-500/30 text-green-300',
      Overdue: 'bg-red-500/30 text-red-300',
      Cancelled: 'bg-yellow-500/30 text-yellow-300',
    };
    return colors[status] || 'bg-gray-500/30 text-gray-300';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Invoices"
        description="Manage invoices and track payments. Invoices are automatically generated from deals."
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/60">
            <Search className="h-4 w-4 text-white/40" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-white placeholder:text-white/40 focus:outline-none"
              placeholder="Search invoices..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Invoice['status'] | '')}
            className="rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/70 focus:border-white/20 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </PageHeader>

      {isLoading && invoices.length === 0 ? (
        <DataGridPlaceholder columns={['Invoice #', 'Contact', 'Status', 'Total', 'Due Date', 'Actions']} />
      ) : invoices.length > 0 ? (
        <>
        <DataGrid
          columns={[
            { key: 'invoiceNumber', header: 'Invoice #' },
            {
              key: 'contact',
              header: 'Contact',
              render: (row) => {
                const invoice = row as Invoice;
                return invoice.contactId
                  ? `${invoice.contactId.firstName} ${invoice.contactId.lastName}`
                  : 'N/A';
              },
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => {
                const invoice = row as Invoice;
                return (
                  <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                );
              },
            },
            {
              key: 'total',
              header: 'Total',
              render: (row) => {
                const invoice = row as Invoice;
                return <AnimatedNumber value={invoice.total} format="currency" />;
              },
            },
            {
              key: 'dueDate',
              header: 'Due Date',
              render: (row) => {
                const invoice = row as Invoice;
                return invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A';
              },
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) => {
                const invoice = row as Invoice;
                return (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/invoices/${invoice._id}`)}
                      title="View invoice"
                      className="flex items-center justify-center rounded-md border border-white/10 p-2 text-[#A8DADC] transition hover:bg-white/10 hover:text-[#A8DADC]"
                      aria-label="View invoice"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <DownloadPDFButton
                      invoiceId={invoice._id}
                      invoiceNumber={invoice.invoiceNumber}
                    />
                    {canDelete && (
                      <button
                        onClick={() => setDeleteId(invoice._id)}
                        title="Delete invoice"
                        className="flex items-center justify-center rounded-md border border-white/10 p-2 text-red-400 transition hover:bg-white/10 hover:text-red-300"
                        aria-label="Delete invoice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              },
            },
          ]}
          data={invoices}
        />

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-4 animate-fade-in">
            <div className="text-sm text-white/60">
              Showing <AnimatedNumber value={((pagination.page - 1) * pagination.limit) + 1} format="number" decimals={0} /> to{' '}
              <AnimatedNumber value={Math.min(pagination.page * pagination.limit, pagination.total)} format="number" decimals={0} /> of <AnimatedNumber value={pagination.total} format="number" decimals={0} /> invoices
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
          No invoices found.
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Invoice"
          message="Are you sure you want to delete this invoice? This action cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}

