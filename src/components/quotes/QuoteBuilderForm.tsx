import { useState, FormEvent } from 'react';
import { X, Plus } from 'lucide-react';
import { useCreateQuote, useUpdateQuote } from '../../hooks/queries/useQuotes';
import { getDeals } from '../../services/api/deals';
import { getProducts } from '../../services/api/products';
import { useQuery } from '@tanstack/react-query';
import type { CreateQuoteData, Quote } from '../../services/api/quotes';

interface QuoteBuilderFormProps {
  quote?: Quote;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function QuoteBuilderForm({ quote, onSuccess, onCancel }: QuoteBuilderFormProps) {
  const [dealId, setDealId] = useState(quote?.dealId?._id || '');
  const [lineItems, setLineItems] = useState(
    quote?.lineItems.map((item) => ({
      productId: item.productId?._id || '',
      description: item.description || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      discount: item.discount || 0,
      tax: item.tax || 0,
    })) || [
      {
        productId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        tax: 0,
      },
    ]
  );
  const [validUntil, setValidUntil] = useState(
    quote?.validUntil ? new Date(quote.validUntil).toISOString().split('T')[0] : ''
  );
  const [notes, setNotes] = useState(quote?.notes || '');

  const { data: dealsData } = useQuery({
    queryKey: ['deals'],
    queryFn: () => getDeals({ limit: 100 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ limit: 100, isActive: true }),
  });

  const createQuote = useCreateQuote();
  const updateQuote = useUpdateQuote();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const quoteData: CreateQuoteData = {
      dealId,
      lineItems: lineItems.filter((item) => item.productId || item.description),
      validUntil: validUntil || undefined,
      notes: notes || undefined,
    };

    try {
      if (quote) {
        await updateQuote.mutateAsync({ id: quote._id, data: quoteData });
      } else {
        await createQuote.mutateAsync(quoteData);
      }
      onSuccess?.();
    } catch (err) {
      // Error handled by mutation
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        tax: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const lineTotal =
        item.quantity * item.unitPrice * (1 - item.discount / 100) + item.tax;
      return sum + lineTotal;
    }, 0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-white/80">Deal *</label>
        <select
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          required
          className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2 text-white focus:border-[#A8DADC] focus:outline-none"
        >
          <option value="">Select a deal</option>
          {dealsData?.deals.map((deal) => (
            <option key={deal._id} value={deal._id}>
              {deal.title} - {deal.stage}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white/80">Valid Until</label>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2 text-white focus:border-[#A8DADC] focus:outline-none"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-white/80">Line Items *</label>
          <button
            type="button"
            onClick={addLineItem}
            className="flex items-center gap-1 rounded-md bg-[#A8DADC] px-3 py-1 text-sm text-[#1A1A1C] hover:bg-[#BCE7E5]"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        </div>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="flex gap-2 rounded-md border border-white/10 bg-[#1A1A1C] p-3">
              <div className="flex-1">
                <select
                  value={item.productId}
                  onChange={(e) => {
                    updateLineItem(index, 'productId', e.target.value);
                    const product = productsData?.products.find((p) => p._id === e.target.value);
                    if (product) {
                      updateLineItem(index, 'unitPrice', product.price);
                      updateLineItem(index, 'description', product.name);
                    }
                  }}
                  className="w-full rounded-md border border-white/10 bg-[#242426] px-3 py-2 text-sm text-white focus:border-[#A8DADC] focus:outline-none"
                >
                  <option value="">Select product</option>
                  {productsData?.products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} - ${product.price}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
                className="w-20 rounded-md border border-white/10 bg-[#242426] px-3 py-2 text-sm text-white focus:border-[#A8DADC] focus:outline-none"
              />
              <input
                type="number"
                placeholder="Price"
                value={item.unitPrice}
                onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-24 rounded-md border border-white/10 bg-[#242426] px-3 py-2 text-sm text-white focus:border-[#A8DADC] focus:outline-none"
              />
              <input
                type="number"
                placeholder="Disc %"
                value={item.discount}
                onChange={(e) => updateLineItem(index, 'discount', parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.01"
                className="w-20 rounded-md border border-white/10 bg-[#242426] px-3 py-2 text-sm text-white focus:border-[#A8DADC] focus:outline-none"
              />
              <input
                type="number"
                placeholder="Tax"
                value={item.tax}
                onChange={(e) => updateLineItem(index, 'tax', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-20 rounded-md border border-white/10 bg-[#242426] px-3 py-2 text-sm text-white focus:border-[#A8DADC] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="rounded-md p-2 text-red-400 hover:bg-red-500/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 text-right">
          <span className="text-lg font-semibold text-white">
            Total: ${calculateTotal().toFixed(2)}
          </span>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white/80">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-white/10 bg-[#242426] px-4 py-2 text-white focus:border-[#A8DADC] focus:outline-none"
        />
      </div>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={createQuote.isPending || updateQuote.isPending}
          className="rounded-md bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] hover:bg-[#BCE7E5] disabled:opacity-50"
        >
          {createQuote.isPending || updateQuote.isPending
            ? 'Saving...'
            : quote
              ? 'Update Quote'
              : 'Create Quote'}
        </button>
      </div>
    </form>
  );
}

