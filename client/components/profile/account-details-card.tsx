'use client';

import { Mail, User as UserIcon, ShieldCheck } from 'lucide-react';
import { User } from '@/types/auth';

interface AccountDetailsCardProps {
  user: User;
}

export function AccountDetailsCard({ user }: AccountDetailsCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-container p-5">
      <h2 className="text-sm font-semibold text-foreground mb-4">Account</h2>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-[13px]">
        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
            <UserIcon size={13} /> Name
          </dt>
          <dd className="text-foreground font-medium">{user.name}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
            <Mail size={13} /> Email
          </dt>
          <dd className="text-foreground font-medium">{user.email}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">Role</dt>
          <dd className="text-foreground font-medium capitalize">{user.role}</dd>
        </div>

        <div>
          <dt className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
            <ShieldCheck size={13} /> Email verified
          </dt>
          <dd className="text-foreground font-medium">{user.emailVerified ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
    </div>
  );
}
