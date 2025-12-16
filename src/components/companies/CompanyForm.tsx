import { Formik, Form, Field, ErrorMessage } from 'formik';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import * as Yup from 'yup';
import { useEffect, useMemo } from 'react';
import { useCreateCompany, useUpdateCompany, type CreateCompanyData, type UpdateCompanyData } from '../../hooks/queries/useAccounts';
import type { Company } from '../../services/api/companies';

interface CompanyFormProps {
  company?: Company;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CompanyFormValues {
  name: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  tags: string;
  description: string;
}

const validationSchema = Yup.object({
  name: Yup.string().required('Company name is required').min(2, 'Company name must be at least 2 characters'),
  email: Yup.string().email('Invalid email address'),
  phone: Yup.string(),
  website: Yup.string().url('Invalid website URL'),
  industry: Yup.string(),
  street: Yup.string(),
  city: Yup.string(),
  state: Yup.string(),
  zipCode: Yup.string(),
  country: Yup.string(),
  tags: Yup.string(),
  description: Yup.string(),
});

export function CompanyForm({ company, isOpen, onSuccess, onCancel }: CompanyFormProps) {
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();

  // Compute initial values
  const initialValues: CompanyFormValues = useMemo(() => {
    return {
      name: company?.name || '',
      email: company?.email || '',
      phone: company?.phone || '',
      website: company?.website || '',
      industry: company?.industry || '',
      street: company?.address?.street || '',
      city: company?.address?.city || '',
      state: company?.address?.state || '',
      zipCode: company?.address?.zipCode || '',
      country: company?.address?.country || '',
      tags: company?.tags?.join(', ') || '',
      description: company?.description || '',
    };
  }, [company]);

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

  const handleSubmit = async (values: CompanyFormValues) => {
    try {
      // Prepare address object
      const address =
        values.street || values.city || values.state || values.zipCode || values.country
          ? {
              street: values.street || undefined,
              city: values.city || undefined,
              state: values.state || undefined,
              zipCode: values.zipCode || undefined,
              country: values.country || undefined,
            }
          : undefined;

      const baseData: CreateCompanyData = {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        website: values.website || undefined,
        industry: values.industry || undefined,
        address,
        tags: values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
        description: values.description || undefined,
      };

      if (company) {
        const updateData: UpdateCompanyData = baseData;
        await updateMutation.mutateAsync({ id: company._id, data: updateData });
      } else {
        await createMutation.mutateAsync(baseData);
      }
      onSuccess();
    } catch (error) {
      // Error handling is done in the mutation hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border border-white/10 bg-[#1A1A1C] shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#1A1A1C] p-6 rounded-t-xl">
          <h2 className="text-xl font-semibold text-white">{company ? 'Edit Account' : 'Create New Account'}</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="text-white/50 transition-all duration-200 hover:text-white hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <Formik
            key={company?._id || 'new-company'}
            initialValues={initialValues}
            enableReinitialize={true}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ isSubmitting }) => (
              <Form className="space-y-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">
                    Company Name <span className="text-red-400">*</span>
                  </label>
                  <Field
                    name="name"
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                    placeholder="Enter company name"
                  />
                  <ErrorMessage name="name" component="p" className="mt-1 text-xs text-red-400" />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Email</label>
                    <Field
                      type="email"
                      name="email"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="Enter email address"
                    />
                    <ErrorMessage name="email" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Phone</label>
                    <Field
                      type="tel"
                      name="phone"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="Enter phone number"
                    />
                    <ErrorMessage name="phone" component="p" className="mt-1 text-xs text-red-400" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Website</label>
                    <Field
                      type="url"
                      name="website"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="https://www.example.com"
                    />
                    <ErrorMessage name="website" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Industry</label>
                    <Field
                      name="industry"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="Enter industry"
                    />
                    <ErrorMessage name="industry" component="p" className="mt-1 text-xs text-red-400" />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4 border-t border-white/10 pt-4">
                  <h3 className="text-sm font-medium text-white/70">Address</h3>
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Street</label>
                    <Field
                      name="street"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="Enter street address"
                    />
                    <ErrorMessage name="street" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">City</label>
                      <Field
                        name="city"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="Enter city"
                      />
                      <ErrorMessage name="city" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">State</label>
                      <Field
                        name="state"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="Enter state"
                      />
                      <ErrorMessage name="state" component="p" className="mt-1 text-xs text-red-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Zip Code</label>
                      <Field
                        name="zipCode"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="Enter zip code"
                      />
                      <ErrorMessage name="zipCode" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Country</label>
                      <Field
                        name="country"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="Enter country"
                      />
                      <ErrorMessage name="country" component="p" className="mt-1 text-xs text-red-400" />
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Description</label>
                  <Field
                    as="textarea"
                    name="description"
                    rows={3}
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 resize-none"
                    placeholder="Enter company description"
                  />
                  <ErrorMessage name="description" component="p" className="mt-1 text-xs text-red-400" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Tags</label>
                  <Field
                    name="tags"
                    className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                    placeholder="Enter tags separated by commas (e.g., Customer, Excellent, ARR:$100K)"
                  />
                  <p className="mt-1 text-xs text-white/50">Separate multiple tags with commas. Use tags like: Customer, Prospect, Excellent, Good, Monitor, At Risk, ARR:$100K</p>
                  <ErrorMessage name="tags" component="p" className="mt-1 text-xs text-red-400" />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className="flex-1 rounded-lg bg-[#A8DADC] px-4 py-2 text-sm font-medium text-[#1A1A1C] transition-all duration-200 hover:scale-105 hover:bg-[#BCE7E5] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {(isSubmitting || isLoading) && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                    {company ? 'Update Account' : 'Create Account'}
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

