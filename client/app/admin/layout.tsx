import { Metadata } from 'next';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

export const metadata: Metadata = {
  title: 'ORA Platform SuperAdmin Command Center',
  description: 'Global control plane, merchant directory, AI voice traffic telemetry, and system diagnostics.',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
