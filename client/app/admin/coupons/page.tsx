import { AdminCouponsView } from '@/components/admin/admin-coupons-view';

export const metadata = {
  title: 'ORA Platform SuperAdmin | Coupons',
  description: 'Create and retire discount codes merchants can apply at checkout.',
};

export default function AdminCouponsPage() {
  return <AdminCouponsView />;
}
