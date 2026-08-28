import { AdminTokenUsageView } from '@/components/admin/admin-token-usage-view';

export const metadata = {
  title: 'Token & Cost OpEx Management | ORA SuperAdmin',
  description: 'Multimodal token consumption, AI voice streaming compute, and merchant cost management.',
};

export default function AdminTokenUsagePage() {
  return <AdminTokenUsageView />;
}
