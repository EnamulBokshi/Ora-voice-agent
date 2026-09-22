import { AdminTrialsView } from '@/components/admin/admin-trials-view';

export const metadata = {
  title: 'ORA Platform SuperAdmin | Trial Leads',
  description:
    'Track free-trial merchants, remaining trial time, conversions, and contact leads directly.',
};

export default function AdminTrialsPage() {
  return <AdminTrialsView />;
}
