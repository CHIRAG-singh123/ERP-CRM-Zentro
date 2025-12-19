import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { useInvoice, useDeleteInvoice, useUpdateInvoiceStatus } from '../../hooks/queries/useInvoices';
import { InvoiceView } from '../../components/invoices/InvoiceView';
import { DownloadPDFButton } from '../../components/invoices/DownloadPDFButton';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white">Invoice not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-sm text-white/60">
              Created {new Date(invoice.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DownloadPDFButton invoiceId={invoice._id} invoiceNumber={invoice.invoiceNumber} />
          {canEdit && (
            <>
              <select
                value={invoice.status}
                onChange={(e) => handleStatusUpdate(e.target.value as Invoice['status'])}
                className="rounded-md border border-white/10 bg-[#1A1A1C] px-3 py-2 text-sm text-white focus:border-white/20 focus:outline-none"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <button
                onClick={() => navigate(`/invoices/${id}/edit`)}
                className="flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
            </>
          )}
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-md border border-red-500/30 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
        </div>
      </div>

      <InvoiceView invoice={invoice} />

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

