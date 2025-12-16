import type { Invoice } from '../../services/api/invoices';

interface InvoiceViewProps {
  invoice: Invoice;
}

export function InvoiceView({ invoice }: InvoiceViewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Contact</h3>
            <p className="text-white">
              {invoice.contactId.firstName} {invoice.contactId.lastName}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Company</h3>
            <p className="text-white">{invoice.companyId?.name || 'N/A'}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Due Date</h3>
            <p className="text-white">
              {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Amount Paid</h3>
            <p className="text-white">{formatCurrency(invoice.amountPaid)}</p>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-semibold text-white">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-white/60">Item</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-white/60">Quantity</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-white/60">Unit Price</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-white/60">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => {
                  const lineTotal =
                    (item.quantity || 0) *
                    (item.unitPrice || 0) *
                    (1 - (item.discount || 0) / 100) +
                    (item.tax || 0);
                  return (
                    <tr key={index} className="border-b border-white/5">
                      <td className="px-4 py-2 text-white">
                        {item.productId?.name || item.description || 'Item'}
                      </td>
                      <td className="px-4 py-2 text-right text-white/70">{item.quantity || 0}</td>
                      <td className="px-4 py-2 text-right text-white/70">
                        {formatCurrency(item.unitPrice || 0)}
                      </td>
                      <td className="px-4 py-2 text-right text-white">{formatCurrency(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-white/70">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Tax:</span>
              <span>{formatCurrency(invoice.tax)}</span>
            </div>
            <div className="border-t border-white/10 pt-2">
              <div className="flex justify-between text-lg font-semibold text-white">
                <span>Total:</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Notes</h3>
            <p className="text-white/70">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

