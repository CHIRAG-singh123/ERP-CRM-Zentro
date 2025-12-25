import { Mail, MapPin, Phone, Share2, Edit, Trash2, ArrowLeft, Loader2, User } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { PageHeader } from '../../components/common/PageHeader';
import { useContact, useDeleteContact } from '../../hooks/queries/useContacts';
import { ContactForm } from '../../components/contacts/ContactForm';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EmailModal } from '../../components/common/EmailModal';
import { sendEmailToContact } from '../../services/api/contacts';
import { getPrimaryEmail, getPrimaryPhone, formatAddress } from '../../utils/contactUtils';
import { formatDate } from '../../utils/formatting';

export function ContactDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const { data, isLoading, isError, error } = useContact(id);
  const contact = data?.contact;
  const deleteMutation = useDeleteContact();

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (contact) {
      try {
        await deleteMutation.mutateAsync(contact._id);
        navigate('/contacts');
      } catch (error) {
        // Error handling is done in the mutation hook
      }
    }
  };

  const handleFormSuccess = () => {
    setShowEditForm(false);
  };

  const handleSendEmail = async (emailData: { fromEmail: string; subject: string; message: string }) => {
    if (!contact?._id) {
      throw new Error('Contact not found');
    }
    await sendEmailToContact(contact._id, emailData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#A8DADC]" />
          <div className="text-white/60 animate-pulse">Loading contact...</div>
        </div>
      </div>
    );
  }

  if (isError || !contact) {
    return (
      <div className="space-y-8 animate-fade-in">
        <PageHeader
          title="Contact Not Found"
          description="The contact you're looking for doesn't exist or has been deleted."
        />
        <div className="rounded-xl border border-white/10 bg-[#1A1A1C]/70 px-6 py-10 text-center text-sm text-white/50">
          {error ? (error as Error).message : 'Contact not found'}
        </div>
      </div>
    );
  }

  const primaryEmail = getPrimaryEmail(contact);
  const primaryPhone = getPrimaryPhone(contact);
  const fullName = `${contact.firstName} ${contact.lastName}`;
  const jobTitleCompany = contact.jobTitle
    ? `${contact.jobTitle}${contact.companyId?.name ? ` — ${contact.companyId.name}` : ''}`
    : contact.companyId?.name || '';

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Contact Profile"
        description="Deep context, journey history, and collaborative notes for every relationship."
        actions={
          <>
            <button
              onClick={() => navigate('/contacts')}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-full border border-red-500/50 px-4 py-2 text-sm text-red-400 transition-all duration-200 hover:border-red-500 hover:bg-red-500/10 hover:scale-105"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <article className="space-y-4 rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6 animate-slide-in-up">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-[#A8DADC]" />
                {fullName}
              </h2>
              {jobTitleCompany && (
                <p className="text-sm text-white/50 mt-1">{jobTitleCompany}</p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.3em]">
                ID #{contact._id.slice(-8)}
              </span>
              {contact.createdBy && (
                <span className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-[0.32em] text-white/60">
                  Owner: {contact.createdBy.name}
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {primaryEmail && (
              <button
                onClick={() => setShowEmailModal(true)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10 cursor-pointer w-full text-left"
              >
                <Mail className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Email</p>
                  <p className="text-sm text-white/80 hover:text-[#A8DADC] transition-colors duration-200">
                    {primaryEmail}
                  </p>
                </div>
              </button>
            )}
            {primaryPhone && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <Phone className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Phone</p>
                  <a
                    href={`tel:${primaryPhone}`}
                    className="text-sm text-white/80 hover:text-[#A8DADC] transition-colors duration-200"
                  >
                    {primaryPhone}
                  </a>
                </div>
              </div>
            )}
            {contact.address && (
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 sm:col-span-2 transition-all duration-200 hover:border-[#A8DADC]/50 hover:bg-white/10">
                <MapPin className="h-4 w-4 text-[#A8DADC]" />
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-white/50">Location</p>
                  <p className="text-sm text-white/80">{formatAddress(contact)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
            {contact.department && (
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Department</p>
                <p className="text-sm text-white/80">{contact.department}</p>
              </div>
            )}
            {contact.notes && (
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-1">Notes</p>
                <p className="text-sm text-white/80 whitespace-pre-wrap">{contact.notes}</p>
              </div>
            )}
            {contact.tags && contact.tags.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.32em] text-white/50 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-[#A8DADC]/30 bg-[#A8DADC]/10 px-3 py-1 text-xs text-[#A8DADC]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-xs text-white/50">
              <div>
                <p className="uppercase tracking-[0.32em] mb-1">Created</p>
                <p>{formatDate(contact.createdAt, 'long')}</p>
              </div>
              <div>
                <p className="uppercase tracking-[0.32em] mb-1">Last Updated</p>
                <p>{formatDate(contact.updatedAt, 'long')}</p>
              </div>
            </div>
          </div>
        </article>

        <aside className="space-y-4 rounded-2xl border border-white/10 bg-[#1A1A1C]/50 p-6 animate-slide-in-up animation-delay-100">
          <h3 className="text-sm uppercase tracking-[0.32em] text-white/40">Quick Actions</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-white/20 hover:text-white hover:scale-105">
              <Share2 className="h-4 w-4" />
              Share Contact
            </button>
            {primaryEmail && (
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-[#A8DADC] hover:text-[#A8DADC] hover:scale-105"
              >
                <Mail className="h-4 w-4" />
                Send Email
              </button>
            )}
            {primaryPhone && (
              <a
                href={`tel:${primaryPhone}`}
                className="w-full flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-[#A8DADC] hover:text-[#A8DADC] hover:scale-105"
              >
                <Phone className="h-4 w-4" />
                Call Contact
              </a>
            )}
          </div>
        </aside>
      </section>

      {showEditForm && contact && (
        <ContactForm
          contact={contact}
          isOpen={showEditForm}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showDeleteConfirm && contact && (
        <ConfirmDialog
          title="Delete Contact"
          message={`Are you sure you want to delete ${contact.firstName} ${contact.lastName}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          confirmVariant="danger"
        />
      )}

      {showEmailModal && contact && primaryEmail && (
        <EmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          recipientEmail={primaryEmail}
          recipientName={`${contact.firstName} ${contact.lastName}`}
          onSend={handleSendEmail}
        />
      )}
    </div>
  );
}

