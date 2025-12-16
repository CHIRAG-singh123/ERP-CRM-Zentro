import { Formik, Form, Field, ErrorMessage } from 'formik';
import { useMutation } from '@tanstack/react-query';
import { emailUpdateSchema } from '../../utils/validation';
import { updateEmail, User } from '../../services/api/auth';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface EmailFormProps {
  user: User;
}

interface EmailFormValues {
  email: string;
  password: string;
}

export function EmailForm({ user }: EmailFormProps) {
  const { updateUser } = useAuth();

  const mutation = useMutation({
    mutationFn: (values: EmailFormValues) =>
      updateEmail({
        email: values.email,
        password: values.password,
      }),
    onSuccess: (data) => {
      updateUser(data.user);
    },
  });

  return (
    <Formik
      initialValues={{ email: user.email, password: '' }}
      validationSchema={emailUpdateSchema}
      onSubmit={async (values, { resetForm, setStatus }) => {
        try {
          setStatus(null);
          await mutation.mutateAsync(values);
          resetForm({ values: { email: values.email, password: '' } });
          setStatus('Email updated');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Update failed';
          setStatus(message);
        }
      }}
    >
      {({ isSubmitting, status }) => (
        <Form className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-white/70">New email</span>
              <Field
                name="email"
                type="email"
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none focus:border-[#B39CD0]"
                placeholder="new-email@company.com"
              />
              <ErrorMessage name="email" component="p" className="text-xs text-red-400" />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-white/70">Current password</span>
              <Field
                name="password"
                type="password"
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none focus:border-[#B39CD0]"
                placeholder="••••••••"
              />
              <ErrorMessage name="password" component="p" className="text-xs text-red-400" />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2 text-sm font-semibold text-[#1A1A1C] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(isSubmitting || mutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Update email
            </button>
            {status && <span className="text-xs text-white/60">{status}</span>}
          </div>
        </Form>
      )}
    </Formik>
  );
}

