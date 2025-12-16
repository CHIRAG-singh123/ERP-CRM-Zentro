import type { Quote } from '../../services/api/quotes';

interface QuotePreviewProps {
  quote: Quote;
}

export function QuotePreview({ quote }: QuotePreviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 p-6">
      <div className="space-y-6">
        {/* Header Info */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Deal</h3>
            <p className="text-white">{quote.dealId?.title || 'N/A'}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Contact</h3>
            <p className="text-white">
              {quote.contactId
                ? `${quote.contactId.firstName} ${quote.contactId.lastName}`
                : 'N/A'}
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Company</h3>
            <p className="text-white">{quote.companyId?.name || 'N/A'}</p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Valid Until</h3>
            <p className="text-white">
              {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h3 className="mb-4 text-lg font-semibold text-white">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-2 text-left text-sm font-semibold text-white/60">Item</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-white/60">Quantity</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-white/60">Unit Price</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-white/60">Discount</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-white/60">Tax</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-white/60">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.lineItems.map((item, index) => {
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
                      <td className="px-4 py-2 text-right text-white/70">
                        {item.discount || 0}%
                      </td>
                      <td className="px-4 py-2 text-right text-white/70">
                        {formatCurrency(item.tax || 0)}
                      </td>
                      <td className="px-4 py-2 text-right text-white">{formatCurrency(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-white/70">
              <span>Subtotal:</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Tax:</span>
              <span>{formatCurrency(quote.tax)}</span>
            </div>
            <div className="border-t border-white/10 pt-2">
              <div className="flex justify-between text-lg font-semibold text-white">
                <span>Total:</span>
                <span>{formatCurrency(quote.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-white/60">Notes</h3>
            <p className="text-white/70">{quote.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

