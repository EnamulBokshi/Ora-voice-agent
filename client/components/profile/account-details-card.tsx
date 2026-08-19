'use client';

import { User } from '@/types/auth';

interface AccountDetailsCardProps {
  user: User;
}

export function AccountDetailsCard({ user }: AccountDetailsCardProps) {
  return (
    <div className="pt-2">
      <div className="pb-3 border-b border-border">
        <h2 className="text-[13.5px] font-semibold text-foreground">User Account</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border border-b border-border py-4">
        <div className="py-2 md:py-0 md:pr-6 space-y-1">
          <span className="text-[11.5px] font-medium text-muted-foreground block">Full Name</span>
          <p className="text-[14px] font-medium text-foreground">{user.name}</p>
        </div>

        <div className="py-2 md:py-0 md:px-6 space-y-1">
          <span className="text-[11.5px] font-medium text-muted-foreground block">Email Address</span>
          <p className="text-[14px] font-medium text-foreground">{user.email}</p>
        </div>

        <div className="py-2 md:py-0 md:px-6 space-y-1">
          <span className="text-[11.5px] font-medium text-muted-foreground block">Role</span>
          <p className="text-[14px] font-medium text-foreground capitalize">{user.role}</p>
        </div>

        <div className="py-2 md:py-0 md:pl-6 space-y-1">
          <span className="text-[11.5px] font-medium text-muted-foreground block">Email Verified</span>
          <p className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                user.emailVerified ? 'bg-[color:var(--status-online)]' : 'bg-amber-400'
              }`}
            />
            {user.emailVerified ? 'Verified' : 'Pending'}
          </p>
        </div>
      </div>
    </div>
  );
}
