'use client';

import { ReactNode } from 'react';
import { DashboardPage } from '@/components/dashboard/dashboard-page';

interface AgentSectionLayoutProps {
  title: string;
  /** Section controls shown on the right of the top bar. */
  actions?: ReactNode;
  /** Shown under the top bar, e.g. the read-only notice. */
  banner?: ReactNode;
  children: ReactNode;
}

/**
 * Every Agent Configuration section: the shared dashboard top bar, then the
 * section body, which manages its own scrolling.
 */
export function AgentSectionLayout({ title, actions, banner, children }: AgentSectionLayoutProps) {
  return (
    <DashboardPage
      title={title}
      breadcrumb={{ label: 'Agent Configuration', href: '/agent' }}
      actions={actions}
      banner={banner}
      layout="fill"
    >
      {children}
    </DashboardPage>
  );
}
