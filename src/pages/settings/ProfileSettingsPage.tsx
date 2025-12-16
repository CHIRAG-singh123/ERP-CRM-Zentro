import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageHeader } from '../../components/common/PageHeader';
import { AvatarUploader } from '../../components/settings/AvatarUploader';
import { ProfileForm } from '../../components/settings/ProfileForm';
import { EmailForm } from '../../components/settings/EmailForm';
import { PasswordForm } from '../../components/settings/PasswordForm';
import { uploadAvatar } from '../../services/api/auth';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ShieldCheck, User as UserIcon, KeyRound } from 'lucide-react';

type SettingsTab = 'profile' | 'email' | 'password' | 'avatar';

export function ProfileSettingsPage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const avatarMutation = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (data) => updateUser(data.user),
  });

  if (!user) {
    return (
      <div className="p-6 text-white/70">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: JSX.Element; description: string }[] = [
    { id: 'profile', label: 'Profile', icon: <UserIcon className="h-4 w-4" />, description: 'Name, timezone, company info' },
    { id: 'email', label: 'Email', icon: <ShieldCheck className="h-4 w-4" />, description: 'Change login email securely' },
    { id: 'password', label: 'Password', icon: <KeyRound className="h-4 w-4" />, description: 'Rotate credentials with strength checks' },
    { id: 'avatar', label: 'Avatar', icon: <UserIcon className="h-4 w-4" />, description: 'Upload a crisp profile photo' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Profile settings"
        description="Manage your identity, credentials, and avatar with enterprise-grade validation."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col rounded-2xl border px-4 py-3 text-left transition ${
              activeTab === tab.id
                ? 'border-[#B39CD0] bg-[#1A1A1C]'
                : 'border-white/10 bg-[#1A1A1C]/70 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 text-white">
              {tab.icon}
              <span className="text-sm font-semibold">{tab.label}</span>
            </div>
            <p className="mt-1 text-xs text-white/60">{tab.description}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1A1A1C]/70 p-6">
        {activeTab === 'profile' && <ProfileForm user={user} />}
        {activeTab === 'email' && <EmailForm user={user} />}
        {activeTab === 'password' && <PasswordForm />}
        {activeTab === 'avatar' && (
          <div className="max-w-xl">
            <AvatarUploader
              avatarUrl={user.profile?.avatar}
              onUpload={async (file) => {
                await avatarMutation.mutateAsync(file);
              }}
            />
            {avatarMutation.isError && (
              <p className="mt-2 text-sm text-red-400">
                {avatarMutation.error instanceof Error ? avatarMutation.error.message : 'Upload failed'}
              </p>
            )}
            {avatarMutation.isSuccess && (
              <p className="mt-2 text-sm text-green-400">Avatar updated</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

