// src/app/_components/ga-listener.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { pageview, GA_MEASUREMENT_ID } from '@/lib/gtag';

export function GAListener() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;
    const search = searchParams?.toString();
    const url = search ? `${pathname}?${search}` : pathname;
    pageview(url);
  }, [pathname, searchParams]);

  return null;
}
