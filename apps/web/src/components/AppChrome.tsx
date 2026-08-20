'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Gavel } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

const FOOTER_COLUMNS = [
  { title: 'Platform', links: [{ href: '/auctions', label: 'Live Auctions' }, { href: '/register', label: 'Create Account' }, { href: '/about', label: 'About' }] },
  { title: 'Categories', links: [{ href: '/auctions?category=Heavy Machinery', label: 'Heavy Machinery' }, { href: '/auctions?category=Industrial Equipment', label: 'Industrial Equipment' }, { href: '/auctions?category=Vehicles', label: 'Vehicles' }] },
  { title: 'Support', links: [{ href: '/contact', label: 'Contact Us' }, { href: '/about', label: 'Help Center' }, { href: '/contact', label: 'Disputes' }] },
  { title: 'Trust & Security', links: [{ href: '/about', label: 'Escrow Protection' }, { href: '/dashboard/kyc', label: 'KYC Verification' }, { href: '/about', label: 'Security Practices' }] },
];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const app = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  if (app) return <>{children}</>;

  return (
    <>
      <Navbar />
      {children}
      <footer className="border-t border-border-muted bg-surface-container-low mt-24">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2 font-headline text-headline-md text-primary mb-3">
                <Gavel className="w-5 h-5" />
                e-AMS
              </Link>
              <p className="text-body-sm text-on-surface-variant max-w-xs">
                A secure institutional bidding environment for authenticated, high-value assets — engineered for precision and trust.
              </p>
            </div>
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-label-caps text-outline mb-4">{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-body-sm text-on-surface-variant hover:text-primary transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border-muted pt-6 flex flex-col md:flex-row justify-between gap-3 text-body-sm text-on-surface-variant">
            <span>&copy; {new Date().getFullYear()} e-AMS. Secure Institutional Bidding Environment.</span>
            <span>Escrow settlement · Optional MFA · KYC-gated bidding</span>
          </div>
        </div>
      </footer>
    </>
  );
}