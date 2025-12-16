import { Formik, Form, Field, ErrorMessage } from 'formik';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { passwordUpdateSchema } from '../../utils/validation';
import { updatePassword } from '../../services/api/auth';
import { Loader2 } from 'lucide-react';

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 3) return { label: 'Strong', color: 'bg-emerald-500', score };
  if (score === 2) return { label: 'Medium', color: 'bg-amber-400', score };
  if (score === 1) return { label: 'Weak', color: 'bg-red-500', score };
  return { label: 'Very weak', color: 'bg-red-500', score };
}

export function PasswordForm() {
  const mutation = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      updatePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
  });

  return (
    <Formik
      initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
      validationSchema={passwordUpdateSchema}
      onSubmit={async (values, { resetForm, setStatus }) => {
        try {
          setStatus(null);
          await mutation.mutateAsync(values);
          resetForm();
          setStatus('Password updated');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Update failed';
          setStatus(message);
        }
      }}
    >
      {({ isSubmitting, values, status }) => {
        const strength = useMemo(() => getStrength(values.newPassword), [values.newPassword]);
        return (
          <Form className="space-y-4">
            <label className="space-y-2">
              <span className="text-sm text-white/70">Current password</span>
              <Field
                name="currentPassword"
                type="password"
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none focus:border-[#B39CD0]"
                placeholder="••••••••"
              />
              <ErrorMessage name="currentPassword" component="p" className="text-xs text-red-400" />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm text-white/70">New password</span>
                <Field
                  name="newPassword"
                  type="password"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none focus:border-[#B39CD0]"
                  placeholder="Min 8 characters, mix of cases & numbers"
                />
                <ErrorMessage name="newPassword" component="p" className="text-xs text-red-400" />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-white/70">Confirm password</span>
                <Field
                  name="confirmPassword"
                  type="password"
                  className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none focus:border-[#B39CD0]"
                  placeholder="Re-enter new password"
                />
                <ErrorMessage name="confirmPassword" component="p" className="text-xs text-red-400" />
              </label>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span>Password strength:</span>
                <span className="font-medium text-white">{strength.label}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${strength.color} transition-all`}
                  style={{ width: `${(Math.max(1, strength.score) / 4) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting || mutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2 text-sm font-semibold text-[#1A1A1C] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {(isSubmitting || mutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                Update password
              </button>
              {status && <span className="text-xs text-white/60">{status}</span>}
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}

