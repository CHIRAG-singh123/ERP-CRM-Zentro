import { createPortal } from 'react-dom';
import { useEffect, useState, FormEvent } from 'react';
import { X, CreditCard, Loader2, CheckCircle } from 'lucide-react';
import { placeOrder } from '../../services/api/orders';

const DEMO_CARD = '4242 4242 4242 4242';
const DEMO_EXPIRY = '12/28';
const DEMO_CVC = '123';
const DEMO_NAME = 'Demo User';

export interface PaymentModalProduct {
  _id: string;
  name: string;
  price: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: PaymentModalProduct;
  onSuccess: () => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: PaymentModalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const fillDemoCredentials = () => {
    setCardNumber(DEMO_CARD);
    setExpiry(DEMO_EXPIRY);
    setCvc(DEMO_CVC);
    setCardholderName(DEMO_NAME);
  };

  const resetForm = () => {
    setCardNumber('');
    setExpiry('');
    setCvc('');
    setCardholderName('');
    setPaymentSuccess(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading && !paymentSuccess) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, paymentSuccess, onClose]);

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading || paymentSuccess) return;

    const hasFields = cardNumber.trim() && expiry.trim() && cvc.trim() && cardholderName.trim();
    if (!hasFields) {
      fillDemoCredentials();
      return;
    }

    setIsLoading(true);
    try {
      await placeOrder(product._id, 1);
      setPaymentSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading && !paymentSuccess) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl animate-slide-in-up">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-[#B39CD0]" />
            <h3 className="text-xl font-semibold text-white">
              {paymentSuccess ? 'Payment successful' : `Payment for ${product.name}`}
            </h3>
          </div>
          {!paymentSuccess && (
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {paymentSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-lg font-medium text-white">Payment successful</p>
            <p className="text-sm text-white/70">Receipt has been sent to your email.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Amount</p>
                <p className="text-xl font-bold text-[#B39CD0]">${product.price.toFixed(2)}</p>
              </div>

              <button
                type="button"
                onClick={fillDemoCredentials}
                className="w-full rounded-lg border border-[#B39CD0]/50 bg-[#B39CD0]/10 px-4 py-2.5 text-sm font-medium text-[#B39CD0] transition hover:bg-[#B39CD0]/20"
              >
                Use demo credentials
              </button>

              <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-white/70 mb-2">
                  Card number
                </label>
                <input
                  id="cardNumber"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  disabled={isLoading}
                  placeholder="4242 4242 4242 4242"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20 focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-white/70 mb-2">
                    Expiry
                  </label>
                  <input
                    id="expiry"
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    disabled={isLoading}
                    placeholder="MM/YY"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="cvc" className="block text-sm font-medium text-white/70 mb-2">
                    CVC
                  </label>
                  <input
                    id="cvc"
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    disabled={isLoading}
                    placeholder="123"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cardholderName" className="block text-sm font-medium text-white/70 mb-2">
                  Cardholder name
                </label>
                <input
                  id="cardholderName"
                  type="text"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  disabled={isLoading}
                  placeholder="Name on card"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            <div className="border-t border-white/10 p-6">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition hover:bg-[#C3ADD9] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Complete payment'
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
