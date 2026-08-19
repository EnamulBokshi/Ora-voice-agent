'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RecentOrdersTable, type RecentOrder } from './recent-orders-table';
import { RecentConversationsTable, type RecentConversation } from './recent-conversations-table';

interface RecentActivityPanelProps {
  orders: RecentOrder[];
  conversations: RecentConversation[];
}

export function RecentActivityPanel({
  orders,
  conversations,
}: RecentActivityPanelProps) {
  return (
    <div className="pt-4">
      {/* 2-Column Split directly on canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left: Recent Conversations */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-[13px] font-semibold text-foreground">
              Recent Conversations
            </h3>
            <Link
              href="/conversations"
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={11} />
            </Link>
          </div>
          <RecentConversationsTable conversations={conversations} />
        </div>

        {/* Right: Recent Orders */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-[13px] font-semibold text-foreground">
              Recent Orders
            </h3>
            <Link
              href="/live-desk"
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={11} />
            </Link>
          </div>
          <RecentOrdersTable orders={orders} />
        </div>
      </div>
    </div>
  );
}
