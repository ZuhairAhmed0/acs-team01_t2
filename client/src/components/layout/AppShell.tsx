import type { ReactNode } from 'react';
import { MobileBottomNav } from './MobileBottomNav.js';
import { SidebarNav } from './SidebarNav.js';
import { TopNavbar } from './TopNavbar.js';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface-bg text-content-primary">
      <TopNavbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 pt-6 pb-24 sm:px-6 lg:pb-12">
        <SidebarNav />
        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}

