import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useCreateOrder } from '../../hooks/queries/useOrders';
import { useToast } from '../../context/ToastContext';
import type { Product } from '../../types/products';
import { ApiError } from '../../services/api/http';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSuccess?: (order: any) => void;
}

type PaymentStep = 'form' | 'processing' | 'success';

export function OrderModal({ isOpen, onClose, product, onSuccess }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('form');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [useDemoPayment, setUseDemoPayment] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
  });

  const createOrderMutation = useCreateOrder();
  const { error: showError } = useToast();

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuantity(1);
      setPaymentStep('form');
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setCardName('');
      setUseDemoPayment(false);
      setShippingAddress({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
      });
    }
  }, [isOpen]);

  // Demo payment credentials
  const handleDemoPayment = () => {
    setUseDemoPayment(true);
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/25');
    setCvv('123');
    setCardName('Demo User');
  };

  if (!isOpen) return null;

  const totalAmount = product.price * quantity;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\s/g, '');
    if (value.length <= 16) {
      value = value.match(/.{1,4}/g)?.join(' ') || value;
      setCardNumber(value);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
      }
      setExpiry(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 3);
    setCvv(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate payment form (skip if using demo payment)
    if (!useDemoPayment) {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        showError('Please enter a valid card number');
        return;
      }
      if (!expiry || expiry.length < 5) {
        showError('Please enter a valid expiry date');
        return;
      }
      if (!cvv || cvv.length < 3) {
        showError('Please enter a valid CVV');
        return;
      }
      if (!cardName) {
        showError('Please enter cardholder name');
        return;
      }
    }

    // Simulate payment processing
    setPaymentStep('processing');

    try {
      // Simulate payment delay (2-3 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Create order
      const result = await createOrderMutation.mutateAsync({
        productId: product._id,
        quantity,
        shippingAddress: Object.values(shippingAddress).some((v) => v) ? shippingAddress : undefined,
        paymentMethod: useDemoPayment ? 'Demo Card' : 'Card',
      });

      // Show success
      setPaymentStep('success');

      // Call onSuccess callback after a short delay
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result.order);
        }
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Order creation failed:', error);
      
      // Extract error message from ApiError
      let errorMessage = 'Failed to create order. Please try again.';
      
      if (error instanceof ApiError) {
        // Check details for error message
        if (error.details && typeof error.details === 'object') {
          const details = error.details as any;
          
          // Handle validation errors with details array
          if (details.details) {
            errorMessage = Array.isArray(details.details) 
              ? details.details.join(', ')
              : details.details;
          } else if (details.error) {
            errorMessage = details.error;
            // Append details if available
            if (details.details && typeof details.details === 'string') {
              errorMessage += `: ${details.details}`;
            }
          } else if (details.message) {
            errorMessage = details.message;
          } else if (typeof details === 'string') {
            errorMessage = details;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data) {
        const data = error.response.data;
        if (data.details) {
          errorMessage = Array.isArray(data.details) 
            ? data.details.join(', ')
            : data.details;
        } else if (data.error) {
          errorMessage = data.error;
        }
      }
      
      showError(errorMessage);
      setPaymentStep('form');
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && paymentStep !== 'processing') {
          onClose();
        }
      }}
    >
      <div
        className="flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl animate-slide-in-up w-full max-w-lg max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">Place Order</h2>
          {paymentStep !== 'processing' && (
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white transition-colors duration-200 hover:scale-110"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6">
          {paymentStep === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="mb-6 rounded-full bg-green-500/20 p-6">
                <CheckCircle2 className="h-16 w-16 text-green-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Order Placed Successfully!</h3>
              <p className="text-white/70 text-center">
                Your order has been confirmed. You will receive an email confirmation shortly.
              </p>
            </div>
          ) : paymentStep === 'processing' ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-16 w-16 text-[#B39CD0] animate-spin mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-2">Processing Payment...</h3>
              <p className="text-white/70 text-center">Please wait while we process your payment.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Summary */}
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Product:</span>
                    <span className="text-white">{product.name}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Price:</span>
                    <span className="text-white">${product.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/70">
                    <span>Quantity:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-8 h-8 rounded border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
                      >
                        -
                      </button>
                      <span className="w-12 text-center text-white">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-8 h-8 rounded border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between text-lg font-semibold">
                    <span className="text-white">Total:</span>
                    <span className="text-[#B39CD0]">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Information
                  </h3>
                  <button
                    type="button"
                    onClick={handleDemoPayment}
                    className="flex items-center gap-2 rounded-lg border border-[#B39CD0]/50 bg-[#B39CD0]/10 px-3 py-1.5 text-sm text-[#B39CD0] hover:bg-[#B39CD0]/20 transition"
                  >
                    <Sparkles className="h-4 w-4" />
                    Use Demo Payment
                  </button>
                </div>

                {useDemoPayment && (
                  <div className="rounded-lg border border-[#B39CD0]/30 bg-[#B39CD0]/10 p-3 text-sm text-[#B39CD0]">
                    <p className="font-medium mb-1">Demo Payment Active</p>
                    <p className="text-xs text-[#B39CD0]/80">
                      Card: 4242 4242 4242 4242 | Expiry: 12/25 | CVV: 123
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                    placeholder="John Doe"
                    required={!useDemoPayment}
                    disabled={useDemoPayment}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none disabled:opacity-50"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    required={!useDemoPayment}
                    disabled={useDemoPayment}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Expiry</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={handleExpiryChange}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none disabled:opacity-50"
                    placeholder="MM/YY"
                    maxLength={5}
                    required={!useDemoPayment}
                    disabled={useDemoPayment}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">CVV</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={handleCvvChange}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none disabled:opacity-50"
                    placeholder="123"
                    maxLength={3}
                    required={!useDemoPayment}
                    disabled={useDemoPayment}
                    />
                  </div>
                </div>

                <p className="text-xs text-white/50 italic">
                  This is a demo payment. No actual charges will be made.
                </p>
              </div>

              {/* Shipping Address (Optional) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Shipping Address (Optional)</h3>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Street</label>
                  <input
                    type="text"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                    placeholder="123 Main St"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">City</label>
                    <input
                      type="text"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">State</label>
                    <input
                      type="text"
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Zip Code</label>
                    <input
                      type="text"
                      value={shippingAddress.zipCode}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, zipCode: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                      placeholder="12345"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-2">Country</label>
                    <input
                      type="text"
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white focus:border-[#B39CD0] focus:outline-none"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {paymentStep === 'form' && (
          <div className="border-t border-white/10 p-6">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={createOrderMutation.isPending}
                className="rounded-lg bg-[#B39CD0] px-6 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50"
              >
                {createOrderMutation.isPending ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

