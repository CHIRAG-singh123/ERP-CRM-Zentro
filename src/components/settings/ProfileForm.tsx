import { Formik, Form, Field, ErrorMessage } from 'formik';
import { useMutation } from '@tanstack/react-query';
import { profileUpdateSchema } from '../../utils/validation';
import { updateProfile, User } from '../../services/api/auth';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProfileFormProps {
  user: User;
}

interface ProfileFormValues {
  name: string;
  timezone: string;
  companyInfo: string;
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
];

export function ProfileForm({ user }: ProfileFormProps) {
  const { updateUser } = useAuth();

  const mutation = useMutation({
    mutationFn: (values: ProfileFormValues) =>
      updateProfile({
        name: values.name,
        profile: {
          timezone: values.timezone,
          companyInfo: values.companyInfo,
        },
      }),
    onSuccess: (data) => {
      updateUser(data.user);
    },
  });

  const initialValues: ProfileFormValues = {
    name: user.name || '',
    timezone: user.profile?.timezone || 'UTC',
    companyInfo: user.profile?.companyInfo || '',
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={profileUpdateSchema}
      onSubmit={async (values, { setStatus }) => {
        try {
          setStatus(null);
          await mutation.mutateAsync(values);
          setStatus('Profile updated');
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
              <span className="text-sm text-white/70 transition-colors duration-200">Full name</span>
              <Field
                name="name"
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20"
                placeholder="Jane Doe"
              />
              <ErrorMessage name="name" component="p" className="text-xs text-red-400 animate-fade-in" />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-white/70 transition-colors duration-200">Timezone</span>
              <Field
                as="select"
                name="timezone"
                className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz} className="bg-[#1A1A1C] text-white">
                    {tz}
                  </option>
                ))}
              </Field>
              <ErrorMessage name="timezone" component="p" className="text-xs text-red-400 animate-fade-in" />
            </label>
          </div>

          <label className="space-y-2">
            <span className="text-sm text-white/70 transition-colors duration-200">Company info</span>
            <Field
              as="textarea"
              name="companyInfo"
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#B39CD0] focus:ring-2 focus:ring-[#B39CD0]/20"
              placeholder="Short description, address, or signature details..."
            />
            <ErrorMessage name="companyInfo" component="p" className="text-xs text-red-400 animate-fade-in" />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#A8DADC] to-[#B39CD0] px-4 py-2 text-sm font-semibold text-[#1A1A1C] transition-all duration-200 hover:scale-105 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {(isSubmitting || mutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
            {status && <span className="text-xs text-white/60">{status}</span>}
          </div>
        </Form>
      )}
    </Formik>
  );
}

