import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import Sidebar from '@/components/layout/Sidebar';
import TopHeader from '@/components/layout/TopHeader';
import MobileNav from '@/components/layout/MobileNav';

export const metadata: Metadata = {
  title: 'pixelmink — Your skills for theirs. No money, just knowledge.',
  description: 'pixelmink is a reciprocal peer knowledge exchange protocol for computer science, AI, coding, video editing and design. Your skills for theirs. No money, just knowledge.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090b] text-[#fafafa] min-h-[100dvh] flex flex-col font-sans antialiased selection:bg-blue-600/30 selection:text-blue-200">
        <AuthProvider>
          <SocketProvider>
            <div className="flex flex-1 min-h-screen">
              <Sidebar />
              <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
                <TopHeader />
                <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
                  {children}
                </main>
              </div>
            </div>
            <MobileNav />
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
