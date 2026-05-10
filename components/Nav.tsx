'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Dumbbell, Activity, TrendingUp, ClipboardList } from 'lucide-react';

const links = [
  { href: '/', icon: LayoutDashboard, label: 'Home' },
  { href: '/program', icon: ClipboardList, label: 'Program' },
  { href: '/workout', icon: Dumbbell, label: 'Workout' },
  { href: '/readiness', icon: Activity, label: 'Check-in' },
  { href: '/progress', icon: TrendingUp, label: 'Progress' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-800 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-3 min-w-0 flex-1 transition-colors ${
                active ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
