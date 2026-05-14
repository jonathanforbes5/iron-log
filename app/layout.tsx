import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import Nav from '@/components/Nav';
import OnboardingGate from '@/components/OnboardingGate';

export const metadata: Metadata = {
  title: 'Iron Log — Powerbuilding Tracker',
  description: 'Track your strength, log your workouts, build your physique.',
  icons: { icon: '/favicon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-[100dvh]">
        <StoreProvider>
          <OnboardingGate>
            <div className="max-w-lg mx-auto flex flex-col min-h-[100dvh]">
              <main className="flex-1 pb-nav">{children}</main>
              <Nav />
            </div>
          </OnboardingGate>
        </StoreProvider>
      </body>
    </html>
  );
}
