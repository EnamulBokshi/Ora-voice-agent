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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
      {/* Left Column: Recent Customer Conversations (Same as Page Background) */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-border/40 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
              <h3 className="text-[14px] font-semibold text-foreground font-serif tracking-tight">
                Recent Conversations
              </h3>
              <span className="text-[11.5px] font-mono text-muted-foreground">
                ({conversations.length})
              </span>
            </div>
            <Link
              href="/conversations"
              className="text-[12px] font-medium text-foreground hover:underline underline-offset-4 transition-colors inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={11} className="text-muted-foreground" />
            </Link>
          </div>

          <RecentConversationsTable conversations={conversations} />
        </div>
      </div>

      {/* Right Column: Recent Converted Orders (Same as Page Background) */}
      <div className="rounded-md border border-border/50 bg-transparent p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-border/40 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-[2px] bg-foreground dark:bg-[#C8F031] flex-shrink-0" />
              <h3 className="text-[14px] font-semibold text-foreground font-serif tracking-tight">
                Recent Converted Orders
              </h3>
              <span className="text-[11.5px] font-mono text-muted-foreground">
                ({orders.length})
              </span>
            </div>
            <Link
              href="/live-desk"
              className="text-[12px] font-medium text-foreground hover:underline underline-offset-4 transition-colors inline-flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={11} className="text-muted-foreground" />
            </Link>
          </div>

          <RecentOrdersTable orders={orders} />
        </div>
      </div>
    </div>
  );
}
