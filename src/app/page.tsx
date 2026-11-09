import type { Metadata, Viewport } from 'next';
import { PublicLanding } from '@/features/public-landing/public-landing';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export const viewport: Viewport = { themeColor: '#f8f4ec' };

export default function Home() {
  return <PublicLanding />;
}
