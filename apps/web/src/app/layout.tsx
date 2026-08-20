import type { Metadata } from 'next';
import './globals.css';
import { ThemeScript } from '@/components/ThemeScript';
import { AppProviders } from '@/providers/AppProviders';
import { AppChrome } from '@/components/AppChrome';

export const metadata: Metadata = {
  title: 'e-AMS — Secure Institutional Bidding',
  description: 'Access premium, authenticated assets in a real-time bidding environment engineered for precision and trust.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  );
}