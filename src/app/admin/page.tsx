'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center font-mono text-xs text-zinc-500">
      Перенаправление...
    </div>
  );
}
