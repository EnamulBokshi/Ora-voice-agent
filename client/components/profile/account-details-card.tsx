'use client';

import { useState } from 'react';
import { Edit2, Save, Key, Loader2, X } from 'lucide-react';
import { User } from '@/types/auth';
import { updateProfileApi, changePasswordApi } from '@/services/auth-service';

interface AccountDetailsCardProps {
  user: User;
  onUserUpdated?: (updated: User) => void;
}

export function AccountDetailsCard({ user, onUserUpdated }: AccountDetailsCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(user.name);
  const [isSavingName, setIsSavingName] = useState(false);

  // Change password states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSaveName = async () => {
    setIsSavingName(true);
    setFeedback(null);
    try {
      const res = await updateProfileApi({ name: name.trim() });
      setIsEditingName(false);
      setFeedback({ type: 'success', message: 'Name updated successfully.' });
      if (res?.user && onUserUpdated) {
        onUserUpdated(res.user);
      }
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update name.' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }

    setIsChangingPassword(true);
    setFeedback(null);
    try {
      await changePasswordApi({ currentPassword, newPassword });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', message: 'Password changed successfully.' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to change password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {feedback && (
          <div
            className={`p-3 rounded-md text-[12px] font-mono flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-surface-high border border-border/60 text-foreground'
                : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="cursor-pointer">
              <X size={13} />
            </button>
          </div>
        )}

        {/* ── User Account Card ── */}
        <div className="rounded-md border border-border/50 bg-transparent p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-border/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
              <h2 className="text-[13.5px] font-semibold text-foreground font-serif tracking-tight">
                User Account & Credentials
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-2.5 py-1.5 sm:py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border/60 bg-surface-high/40 rounded-md flex items-center gap-1.5 cursor-pointer touch-manipulation"
              >
                <Key size={11} />
                Change Password
              </button>
              {isEditingName ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2.5 py-1.5 sm:py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded-md cursor-pointer touch-manipulation"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="px-2.5 py-1.5 sm:py-1 text-[12px] font-semibold bg-foreground text-background rounded-md flex items-center gap-1 cursor-pointer disabled:opacity-50 touch-manipulation"
                  >
                    {isSavingName ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                    Save
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setName(user.name);
                    setIsEditingName(true);
                  }}
                  className="px-2.5 py-1.5 sm:py-1 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border/60 bg-surface-high/40 rounded-md flex items-center gap-1.5 cursor-pointer touch-manipulation"
                >
                  <Edit2 size={11} />
                  Edit Name
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border/40 rounded-md overflow-hidden border border-border/40">
            <div className="bg-background p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Full Name
              </span>
              {isEditingName ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-8 px-2.5 text-[13px] bg-surface-high border border-border/60 rounded-md text-foreground focus:outline-none focus:border-foreground"
                />
              ) : (
                <p className="text-[14px] font-medium text-foreground">{user.name}</p>
              )}
            </div>

            <div className="bg-background p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Email Address
              </span>
              <p className="text-[13.5px] font-mono text-foreground truncate">{user.email}</p>
            </div>

            <div className="bg-background p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Store Role
              </span>
              <p className="text-[13.5px] font-mono text-foreground uppercase">{user.role}</p>
            </div>

            <div className="bg-background p-4 space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                Email Status
              </span>
              <p className="text-[13px] font-mono text-foreground flex items-center gap-1.5 uppercase">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    user.emailVerified ? 'bg-[color:var(--status-online)]' : 'bg-amber-400'
                  }`}
                />
                {user.emailVerified ? 'Verified' : 'Pending Verification'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-surface-container border border-border/60 rounded-md p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h3 className="text-sm font-semibold text-foreground font-serif">Change Account Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-surface-high border border-border/60 rounded-md text-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  New Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-surface-high border border-border/60 rounded-md text-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-surface-high border border-border/60 rounded-md text-foreground focus:outline-none focus:border-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isChangingPassword}
                  className="px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border/60 rounded-md cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-3.5 py-1.5 text-[12px] font-semibold bg-foreground text-background rounded-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isChangingPassword && <Loader2 size={12} className="animate-spin" />}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
