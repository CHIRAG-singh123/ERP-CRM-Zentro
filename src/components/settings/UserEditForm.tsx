import { Formik, Form, Field, ErrorMessage } from 'formik';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import * as Yup from 'yup';
import type { User } from '../../services/api/auth';

interface UserEditFormProps {
  user: User;
  isOpen: boolean;
  onSave: (values: UserFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface UserFormValues {
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  email: Yup.string().email('Invalid email address').required('Email is required'),
  role: Yup.string().required('Role is required'),
  isActive: Yup.boolean(),
});

const ROLES = ['admin', 'employee', 'customer', 'user'];

export function UserEditForm({ user, isOpen, onSave, onCancel, isLoading }: UserEditFormProps) {
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

  if (!isOpen) return null;

  const initialValues: UserFormValues = {
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'user',
    isActive: user.isActive ?? true,
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">Edit User</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-white/50 transition-colors duration-200 hover:text-white hover:scale-110"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={async (values, { setStatus }) => {
            try {
              setStatus(null);
              await onSave(values);
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Update failed';
              setStatus(message);
            }
          }}
        >
          {({ isSubmitting, status, values }) => (
            <Form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Name</label>
                <Field
                  name="name"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20"
                  placeholder="John Doe"
                />
                <ErrorMessage name="name" component="p" className="mt-1 text-xs text-red-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                <Field
                  name="email"
                  type="email"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20"
                  placeholder="john@example.com"
                />
                <ErrorMessage name="email" component="p" className="mt-1 text-xs text-red-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Role</label>
                <Field
                  as="select"
                  name="role"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role} className="bg-[#1A1A1C] text-white">
                      {role}
                    </option>
                  ))}
                </Field>
                <ErrorMessage name="role" component="p" className="mt-1 text-xs text-red-400" />
              </div>

              <div className="flex items-center gap-3">
                <Field
                  type="checkbox"
                  name="isActive"
                  className="h-4 w-4 rounded border-white/10 bg-[#1A1A1C]/70 text-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20"
                />
                <label className="text-sm font-medium text-white/70">
                  {values.isActive ? 'Active' : 'Inactive'}
                </label>
              </div>

              {status && (
                <p className={`text-xs animate-fade-in ${status.includes('failed') || status.includes('error') ? 'text-red-400' : 'text-green-400'}`}>
                  {status}
                </p>
              )}

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="flex-1 rounded-lg bg-[#B39CD0] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:scale-105 hover:bg-[#C3ADD9] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {(isSubmitting || isLoading) && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                  Update
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting || isLoading}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:scale-105 hover:border-white/20 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </Form>
          )}
        </Formik>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

