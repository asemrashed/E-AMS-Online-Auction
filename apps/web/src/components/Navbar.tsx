'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Gavel, ShoppingCart } from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/store/auth';
import { ThemeToggle } from './ThemeToggle';
import { MarketTicker } from './MarketTicker';
import { NotificationMenu } from './NotificationMenu';
import { UserMenu } from './UserMenu';
import { useCartQuery } from '@/hooks/useApi';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/auctions', label: 'Auctions' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => {
      document.documentElement.style.setProperty('--app-header-height', `${el.offsetHeight}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 backdrop-blur bg-surface-container-lowest/90 border-b border-border-muted">
      <nav className="max-w-container-max mx-auto flex items-center justify-between px-margin-mobile md:px-margin-desktop py-4">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2 font-headline text-headline-md text-primary">
            <Gavel className="w-6 h-6" strokeWidth={2.25} />
            e-AMS
          </Link>
          <div className="hidden md:flex items-center gap-1 text-body-md">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'px-3 py-2 rounded transition-colors',
                  pathname === link.href ? 'text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user?.role === 'BUYER' && (
            <Link href="/cart" aria-label="Cart" className="relative w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container">
              <ShoppingCart className="w-4 h-4" />
              <CartBadge />
            </Link>
          )}
          <NotificationMenu />
          <UserMenu />
        </div>
      </nav>
      <MarketTicker />
    </header>
  );
}

function CartBadge() {
  const user = useAuthStore((s) => s.user);
  const { data } = useCartQuery(user?.role === 'BUYER');
  const count = data?.items?.length ?? 0;
  if (!count) return null;
  return (
    <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 rounded-full bg-primary text-on-primary text-[10px] leading-4 text-center">
      {count}
    </span>
  );
}
