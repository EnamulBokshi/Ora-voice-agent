'use client';

import { ChannelStatusBadge, ChannelStatus } from './status-pill';

export interface ChannelStatusItemData {
  id: string;
  name: string;
  icon: React.ReactNode;
  detail: string;
  status: ChannelStatus;
}

interface ChannelStatusItemProps {
  item: ChannelStatusItemData;
}

export function ChannelStatusItem({ item }: ChannelStatusItemProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-muted-foreground flex-shrink-0">{item.icon}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground leading-none">{item.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.detail}</p>
        </div>
      </div>
      <ChannelStatusBadge status={item.status} className="ml-3 flex-shrink-0" />
    </div>
  );
}
