'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useProfile, useHydrated } from '@/lib/store';

export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useProfile();
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return; // wait for localStorage to load first
    if (pathname === '/onboarding') return;
    if (!profile?.onboardingComplete) {
      router.replace('/onboarding');
    }
  }, [hydrated, profile, pathname, router]);

  if (pathname === '/onboarding') return <>{children}</>;
  if (!hydrated) return null; // blank while loading — avoids flash redirect
  if (!profile?.onboardingComplete) return null;

  return <>{children}</>;
}
