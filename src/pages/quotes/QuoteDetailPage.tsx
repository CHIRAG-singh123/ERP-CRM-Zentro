import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useQuote, useDeleteQuote, useUpdateQuoteStatus } from '../../hooks/queries/useQuotes';
import { QuotePreview } from '../../components/quotes/QuotePreview';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import type { Quote } from '../../services/api/quotes';

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useQuote(id);
  const quote = data?.quote;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<Quote['status'] | null>(null);
  const { success } = useToast();

  const deleteQuote = useDeleteQuote();
  const updateStatus = useUpdateQuoteStatus();

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteQuote.mutateAsync(id);
      navigate('/quotes');
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleStatusUpdate = async (status: Quote['status']) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ id, status });
      setStatusToUpdate(null);
    } catch (err) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Loading quote...</div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Quote not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotes')}
            className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Quote {quote.quoteNumber}</h1>
            <p className="text-sm text-white/60">
              Created {new Date(quote.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={quote.status}
            onChange={(e) => handleStatusUpdate(e.target.value as Quote['status'])}
            className="rounded-md border border-white/10 bg-[#1A1A1C] px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
          >
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
          </select>
          <button
            onClick={() => navigate(`/quotes/${id}/edit`)}
            className="flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Edit className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-md border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>

      <QuotePreview quote={quote} />

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Quote"
          message="Are you sure you want to delete this quote? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}

