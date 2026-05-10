'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useProfile } from '@/lib/store';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useProfile();

  useEffect(() => {
    if (pathname === '/onboarding') return;
    if (profile === null || !profile.onboardingComplete) {
      router.replace('/onboarding');
    }
  }, [profile, pathname, router]);

  if (pathname === '/onboarding') return <>{children}</>;
  if (!profile?.onboardingComplete) return null;

  return <>{children}</>;
}
