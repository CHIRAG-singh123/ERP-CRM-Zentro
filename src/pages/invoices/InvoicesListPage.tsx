import { useState } from 'react';
import { Plus, Search, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { useInvoices, useDeleteInvoice } from '../../hooks/queries/useInvoices';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { DownloadPDFButton } from '../../components/invoices/DownloadPDFButton';
import { useAuth } from '../../context/AuthContext';
import type { Invoice } from '../../services/api/invoices';

export function InvoicesListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | ''>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const canDelete = user?.role === 'admin' || user?.role === 'employee';

  const { data, isLoading } = useInvoices({
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  });
  const invoices = data?.invoices ?? [];
  const deleteInvoice = useDeleteInvoice();

  const handleDelete = async (id: string) => {
    try {
      await deleteInvoice.mutateAsync(id);
      setDeleteId(null);
    } catch (err) {
      // Error handled by mutation
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
        description="Manage invoices and track payments."
        actions={
          <button
            onClick={() => navigate('/invoices/new')}
            className="flex items-center gap-2 rounded-full bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#BCE7E5]"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        }
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
                return formatCurrency(invoice.total);
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

