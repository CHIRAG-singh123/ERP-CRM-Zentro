import { useState } from 'react';
import { Plus, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { DataGrid } from '../../components/common/DataGrid';
import { DataGridPlaceholder } from '../../components/common/DataGridPlaceholder';
import { PageHeader } from '../../components/common/PageHeader';
import { useQuotes } from '../../hooks/queries/useQuotes';
import { useDeleteQuote } from '../../hooks/queries/useQuotes';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import type { Quote } from '../../services/api/quotes';

export function QuotesListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Quote['status'] | ''>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { success } = useToast();

  const { data, isLoading, isError, error } = useQuotes({
    search: searchTerm || undefined,
    status: statusFilter || undefined,
  });
  const quotes = data?.quotes ?? [];

  const deleteQuote = useDeleteQuote();

  const handleDelete = async (id: string) => {
    try {
      await deleteQuote.mutateAsync(id);
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

  const getStatusColor = (status: Quote['status']) => {
    const colors = {
      Draft: 'bg-gray-500/30 text-gray-300',
      Sent: 'bg-blue-500/30 text-blue-300',
      Accepted: 'bg-green-500/30 text-green-300',
      Rejected: 'bg-red-500/30 text-red-300',
      Expired: 'bg-yellow-500/30 text-yellow-300',
    };
    return colors[status] || 'bg-gray-500/30 text-gray-300';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Quotes"
        description="Create and manage quotes for your deals and opportunities."
        actions={
          <>
            <button
              onClick={() => navigate('/quotes/new')}
              className="flex items-center gap-2 rounded-full bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#BCE7E5]"
            >
              <Plus className="h-4 w-4" />
              New Quote
            </button>
          </>
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
              placeholder="Search quotes..."
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Quote['status'] | '')}
            className="rounded-full border border-white/10 bg-[#1A1A1C] px-4 py-2 text-sm text-white/70 focus:border-white/20 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </PageHeader>

      {isLoading && quotes.length === 0 ? (
        <DataGridPlaceholder columns={['Quote #', 'Deal', 'Contact', 'Status', 'Total', 'Valid Until', 'Actions']} />
      ) : quotes.length > 0 ? (
        <>
          <DataGrid
            columns={[
              { key: 'quoteNumber', header: 'Quote #' },
              {
                key: 'deal',
                header: 'Deal',
                render: (row) => {
                  const quote = row as Quote;
                  return quote.dealId?.title || 'N/A';
                },
              },
              {
                key: 'contact',
                header: 'Contact',
                render: (row) => {
                  const quote = row as Quote;
                  return quote.contactId
                    ? `${quote.contactId.firstName} ${quote.contactId.lastName}`
                    : 'N/A';
                },
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => {
                  const quote = row as Quote;
                  return (
                    <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(quote.status)}`}>
                      {quote.status}
                    </span>
                  );
                },
              },
              {
                key: 'total',
                header: 'Total',
                render: (row) => {
                  const quote = row as Quote;
                  return formatCurrency(quote.total);
                },
              },
              {
                key: 'validUntil',
                header: 'Valid Until',
                render: (row) => {
                  const quote = row as Quote;
                  return quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A';
                },
              },
              {
                key: 'actions',
                header: 'Actions',
                render: (row) => {
                  const quote = row as Quote;
                  return (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/quotes/${quote._id}`)}
                        className="rounded px-2 py-1 text-xs text-[#A8DADC] hover:bg-white/5"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setDeleteId(quote._id)}
                        className="rounded px-2 py-1 text-xs text-red-400 hover:bg-white/5"
                      >
                        Delete
                      </button>
                    </div>
                  );
                },
              },
            ]}
            data={quotes}
          />
        </>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {isError ? (error as Error).message : 'No quotes found.'}
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete Quote"
          message="Are you sure you want to delete this quote? This action cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}

