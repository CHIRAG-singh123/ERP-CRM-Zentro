import { Formik, Form, Field, ErrorMessage } from 'formik';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import * as Yup from 'yup';
import { useEffect, useMemo } from 'react';
import { useCreateContact, useUpdateContact } from '../../hooks/queries/useContacts';
import { getCompanies } from '../../services/api/companies';
import { useQuery } from '@tanstack/react-query';
import type { Contact, CreateContactData, UpdateContactData } from '../../services/api/contacts';
import { getPrimaryEmail, getPrimaryPhone } from '../../utils/contactUtils';

interface ContactFormProps {
  contact?: Contact;
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ContactFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department: string;
  companyId: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  notes: string;
  tags: string;
}

const validationSchema = Yup.object({
  firstName: Yup.string().required('First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: Yup.string().required('Last name is required').min(2, 'Last name must be at least 2 characters'),
  email: Yup.string().email('Invalid email address'),
  phone: Yup.string(),
  jobTitle: Yup.string(),
  department: Yup.string(),
  companyId: Yup.string(),
  street: Yup.string(),
  city: Yup.string(),
  state: Yup.string(),
  zipCode: Yup.string(),
  country: Yup.string(),
  notes: Yup.string(),
  tags: Yup.string(),
});

export function ContactForm({ contact, isOpen, onSuccess, onCancel }: ContactFormProps) {
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();

  // Fetch companies for dropdown
  const { data: companiesData, isLoading: isLoadingCompanies } = useQuery({
    queryKey: ['companies', { page: 1, limit: 1000 }],
    queryFn: () => getCompanies({ page: 1, limit: 1000 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const companies = companiesData?.companies || [];

  // Compute initial values
  const initialValues: ContactFormValues = useMemo(() => {
    const primaryEmail = contact ? getPrimaryEmail(contact) : '';
    const primaryPhone = contact ? getPrimaryPhone(contact) : '';
    const companyId = contact?.companyId
      ? typeof contact.companyId === 'string'
        ? contact.companyId
        : contact.companyId._id
      : '';

    return {
      firstName: contact?.firstName || '',
      lastName: contact?.lastName || '',
      email: primaryEmail || '',
      phone: primaryPhone || '',
      jobTitle: contact?.jobTitle || '',
      department: contact?.department || '',
      companyId,
      street: contact?.address?.street || '',
      city: contact?.address?.city || '',
      state: contact?.address?.state || '',
      zipCode: contact?.address?.zipCode || '',
      country: contact?.address?.country || '',
      notes: contact?.notes || '',
      tags: contact?.tags?.join(', ') || '',
    };
  }, [contact]);

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

  const handleSubmit = async (values: ContactFormValues) => {
    try {
      // Prepare emails array
      const emails = values.email
        ? [
            {
              email: values.email,
              type: 'work' as const,
              isPrimary: true,
            },
          ]
        : undefined;

      // Prepare phones array
      const phones = values.phone
        ? [
            {
              phone: values.phone,
              type: 'work' as const,
              isPrimary: true,
            },
          ]
        : undefined;

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

      const baseData = {
        firstName: values.firstName,
        lastName: values.lastName,
        emails,
        phones,
        jobTitle: values.jobTitle || undefined,
        department: values.department || undefined,
        companyId: values.companyId || undefined,
        address,
        notes: values.notes || undefined,
        tags: values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : undefined,
      };

      if (contact) {
        const updateData: UpdateContactData = baseData;
        await updateMutation.mutateAsync({ id: contact._id, data: updateData });
      } else {
        const createData: CreateContactData = baseData;
        await createMutation.mutateAsync(createData);
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
          <h2 className="text-xl font-semibold text-white">{contact ? 'Edit Contact' : 'Create New Contact'}</h2>
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
          {isLoadingCompanies ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
                <div className="text-white/60 animate-pulse">Loading companies...</div>
              </div>
            </div>
          ) : (
            <Formik
              key={contact?._id || 'new-contact'}
              initialValues={initialValues}
              enableReinitialize={true}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting }) => (
                <Form className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        First Name <span className="text-red-400">*</span>
                      </label>
                      <Field
                        name="firstName"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="Enter first name"
                      />
                      <ErrorMessage name="firstName" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">
                        Last Name <span className="text-red-400">*</span>
                      </label>
                      <Field
                        name="lastName"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="Enter last name"
                      />
                      <ErrorMessage name="lastName" component="p" className="mt-1 text-xs text-red-400" />
                    </div>
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

                  {/* Job Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Job Title</label>
                      <Field
                        name="jobTitle"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="Enter job title"
                      />
                      <ErrorMessage name="jobTitle" component="p" className="mt-1 text-xs text-red-400" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/70 mb-1">Department</label>
                      <Field
                        name="department"
                        className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                        placeholder="Enter department"
                      />
                      <ErrorMessage name="department" component="p" className="mt-1 text-xs text-red-400" />
                    </div>
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Company</label>
                    <Field
                      as="select"
                      name="companyId"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                    >
                      <option value="" className="bg-[#1A1A1C] text-white">
                        No Company
                      </option>
                      {companies.map((company) => (
                        <option key={company._id} value={company._id} className="bg-[#1A1A1C] text-white">
                          {company.name}
                        </option>
                      ))}
                    </Field>
                    <ErrorMessage name="companyId" component="p" className="mt-1 text-xs text-red-400" />
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

                  {/* Notes and Tags */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Notes</label>
                    <Field
                      as="textarea"
                      name="notes"
                      rows={3}
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20 resize-none"
                      placeholder="Enter notes"
                    />
                    <ErrorMessage name="notes" component="p" className="mt-1 text-xs text-red-400" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Tags</label>
                    <Field
                      name="tags"
                      className="w-full rounded-lg border border-white/10 bg-[#1A1A1C]/70 px-3 py-2 text-white outline-none transition-all duration-200 focus:border-[#A8DADC] focus:ring-2 focus:ring-[#A8DADC]/20"
                      placeholder="Enter tags separated by commas"
                    />
                    <p className="mt-1 text-xs text-white/50">Separate multiple tags with commas</p>
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
                      {contact ? 'Update Contact' : 'Create Contact'}
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
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

