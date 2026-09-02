import { Metadata } from 'next';
import { AdminUserDetailView } from '@/components/admin/admin-user-detail-view';

export const metadata: Metadata = {
  title: 'User Inspection & Telemetry — ORA SuperAdmin',
  description: 'Detailed user identity, AI token telemetry, session duration controls, and store tenant configuration.',
};

interface AdminUserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { id } = await params;
  return <AdminUserDetailView userId={id} />;
}
