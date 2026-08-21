import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthBackground } from '@/components/auth/AuthBackground';
import { AuthCard } from '@/components/auth/AuthCard';

function VerifyOtpRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Always redirect to canonical /auth?mode=otp
  redirect('/auth?mode=otp');
}

export default function VerifyOtpPage() {
  return (
    <AuthBackground>
      <Suspense fallback={null}>
        <AuthCard />
      </Suspense>
    </AuthBackground>
  );
}
