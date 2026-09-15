'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Gavel, LayoutDashboard, List, Landmark, Wallet, ShoppingCart,
  Heart, Package, Shield, Users, BadgeDollarSign, UserCog, PieChart,
  FileCheck, Settings, LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { ThemeToggle } from './ThemeToggle';
import { NotificationMenu } from './NotificationMenu';
import { UserMenu } from './UserMenu';
import { useAuthStore } from '@/store/auth';

const BUYER = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/bids', label: 'My Bids', icon: Gavel },
  { href: '/dashboard/watchlist', label: 'Watchlist', icon: Heart },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/dashboard/orders', label: 'Orders', icon: Package },
  { href: '/dashboard/kyc', label: 'KYC', icon: FileCheck },
  { href: '/dashboard/settings', label: 'Account', icon: Settings },
];

const SELLER = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/listings', label: 'Listings', icon: List },
  { href: '/dashboard/listings/new', label: 'New listing', icon: Gavel },
  { href: '/dashboard/sales', label: 'Sales', icon: Package },
  { href: '/dashboard/bank', label: 'Bank', icon: Landmark },
  { href: '/dashboard/payouts', label: 'Payouts', icon: Wallet },
  { href: '/dashboard/kyc', label: 'KYC', icon: FileCheck },
  { href: '/dashboard/settings', label: 'Account', icon: Settings },
];

const ADMIN = [
  { href: '/admin', label: 'Overview', icon: Shield },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/banks', label: 'Bank verify', icon: Landmark },
  { href: '/admin/payouts', label: 'Payouts', icon: BadgeDollarSign },
];

const SUPER = [
  ...ADMIN,
  { href: '/admin/admins', label: 'Admins', icon: UserCog },
  { href: '/admin/commission-report', label: 'Commission', icon: PieChart },
];

export function RoleShell({ children, variant }: { children: React.ReactNode; variant: 'dashboard' | 'admin' }) {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const links =
    variant === 'admin'
      ? (user?.role === 'SUPER_ADMIN' ? SUPER : ADMIN)
      : user?.role === 'SELLER' ? SELLER : BUYER;

  return (
    <div className="min-h-screen flex bg-surface-container-low">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border-muted bg-surface-container-lowest">
        <Link href="/" className="flex items-center gap-2 px-5 py-5 font-headline text-headline-md text-primary">
          <Gavel className="w-5 h-5" /> e-AMS
        </Link>
        <nav className="flex-1 px-3 space-y-0.5">
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== '/dashboard' && l.href !== '/admin' && pathname.startsWith(l.href));
            return (
              <Link
                key={l.href}
                href={l.href}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 rounded text-body-sm',
                  active ? 'bg-primary/10 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                )}
              >
                <l.icon className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border-muted">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-body-sm text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="h-14 border-b border-border-muted bg-surface-container-lowest flex items-center justify-between px-4 md:px-6">
          <p className="text-body-sm text-on-surface-variant">{user?.role?.replace('_', ' ')} console</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationMenu />
            <UserMenu />
          </div>
        </header>
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}