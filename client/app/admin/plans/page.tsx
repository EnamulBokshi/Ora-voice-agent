import { AdminPlansView } from '@/components/admin/admin-plans-view';

export const metadata = {
  title: 'ORA Platform SuperAdmin | Plans & Quotas',
  description: 'Manage subscription tiers, pricing, limits, and custom merchant Scale allocations.',
};

export default function AdminPlansPage() {
  return <AdminPlansView />;
}
