import { Suspense } from 'react';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { AuthCard } from '@/components/auth/AuthCard';

export default function ResetPasswordPage() {
  return (
    <AuthBackground>
      <Suspense fallback={null}>
        <AuthCard />
      </Suspense>
    </AuthBackground>
  );
}
