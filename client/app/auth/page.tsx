import { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { AuthCard } from '@/components/auth/AuthCard';

export const metadata: Metadata = {
  title: 'Authentication & Merchant Onboarding | ORA AI Command Center',
  description:
    'Access your live AI sales engine, provision merchant workspaces, and verify recipient credentials in ORA Command Center.',
};

export default function AuthPage() {
  return (
    <AuthBackground>
      <Suspense fallback={null}>
        <AuthCard />
      </Suspense>
    </AuthBackground>
  );
}
