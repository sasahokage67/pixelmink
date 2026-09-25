'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import MobileNav from '@/components/layout/MobileNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isPublicPage = pathname === '/' || pathname.startsWith('/auth');

  useEffect(() => {
    // If attempting to access a protected app page without an active session, force register
    if (!loading && !user && !isPublicPage) {
      router.push('/auth/register');
    }
  }, [loading, user, isPublicPage, router]);

  // Public pages (landing page and auth pages) get the full unconstrained canvas
  if (isPublicPage) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  // Loading state for protected application routes
  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs font-mono text-zinc-400">Authenticating peer session...</div>
      </div>
    );
  }

  // Prevent flashing protected content before redirect completes
  if (!user) {
    return null;
  }

  // Authenticated workspace shell with Sidebar, TopHeader and MobileNav
  return (
    <div className="flex flex-1 min-h-screen bg-[#09090b]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <TopHeader />
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
