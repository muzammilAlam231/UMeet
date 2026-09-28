import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'UMeet — Private 1-to-1 meetings',
  description:
    'Simple video calls, voice calls and screen sharing — directly between two people. Peer-to-peer WebRTC, no account required.',
  manifest: '/manifest.json',
  metadataBase: new URL(appUrl),
  applicationName: 'UMeet',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'UMeet',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0d10',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
