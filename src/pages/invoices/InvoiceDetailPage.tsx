import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, FileText, Loader2 } from 'lucide-react';
import { useInvoice, useDeleteInvoice, useUpdateInvoiceStatus } from '../../hooks/queries/useInvoices';
import { InvoiceView } from '../../components/invoices/InvoiceView';
import { DownloadPDFButton } from '../../components/invoices/DownloadPDFButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PageHeader } from '../../components/common/PageHeader';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import type { Invoice } from '../../services/api/invoices';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useInvoice(id);
  const invoice = data?.invoice;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { user } = useAuth();
  
  const canEdit = user?.role === 'admin' || user?.role === 'employee';
  const canDelete = user?.role === 'admin' || user?.role === 'employee';

  const deleteInvoice = useDeleteInvoice();
  const updateStatus = useUpdateInvoiceStatus();

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteInvoice.mutateAsync(id);
      navigate('/invoices');
    } catch (err) {
      // Error handled by mutation
    }
  };

  const handleStatusUpdate = async (status: Invoice['status']) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ id, status });
    } catch (err) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
          <div className="text-white/60 animate-pulse">Loading invoice...</div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Invoice Not Found"
          description="The invoice you're looking for doesn't exist or has been deleted."
        />
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          Invoice not found
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Invoice Details"
        description="View and manage invoice information."
        actions={
          <>
            <button
              onClick={() => navigate('/invoices')}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <DownloadPDFButton invoiceId={invoice._id} invoiceNumber={invoice.invoiceNumber} />
            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 rounded-full border border-red-500/50 px-4 py-2 text-sm text-red-400 transition-all duration-200 hover:border-red-500 hover:bg-red-500/10 hover:scale-105"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-white/70">Status:</label>
              <select
                value={invoice.status}
                onChange={(e) => handleStatusUpdate(e.target.value as Invoice['status'])}
                className="rounded-lg border border-white/10 bg-[#2A2A2C] px-3 py-2 text-sm text-white focus:border-[#A8DADC] focus:outline-none focus:ring-2 focus:ring-[#A8DADC]/20"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          )}
        </div>
      </PageHeader>

      <section className="space-y-6">
        <article className="space-y-4 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6 animate-slide-in-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#A8DADC]" />
                {invoice.invoiceNumber}
              </h2>
              <p className="text-sm text-white/50 mt-1">
                Created {new Date(invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.3em]">
                ID #{invoice._id.slice(-8)}
              </span>
              <span className={`rounded-full border px-3 py-1 uppercase tracking-[0.32em] text-white/60 font-medium ${
                invoice.status === 'Paid' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                invoice.status === 'Overdue' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                invoice.status === 'Sent' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
                'border-white/10'
              }`}>
                {invoice.status}
              </span>
            </div>
          </div>

        <InvoiceView invoice={invoice} />
      </article>
      </section>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Invoice"
          message="Are you sure you want to delete this invoice? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}

