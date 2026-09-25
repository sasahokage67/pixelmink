import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { LanguageProvider } from '@/context/LanguageContext';
import AppShell from '@/components/layout/AppShell';

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
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <AppShell>{children}</AppShell>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
