import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, Lock, Gauge, TrendingUp, CheckCircle2,
  Truck, Building2, Car, Cpu, Briefcase, Landmark,
} from 'lucide-react';
import { AuctionCard } from '@/components/AuctionCard';
import { CountdownTimer } from '@/components/CountdownTimer';
import { serverGet } from '@/lib/server-api';
import type { Auction } from '@/lib/schemas';

async function getLiveAuctions(): Promise<Auction[]> {
  return (await serverGet<Auction[]>('/api/auctions?status=LIVE')) ?? [];
}

const CATEGORIES = [
  { name: 'Heavy Machinery', icon: Truck, desc: 'Tractors, excavators, cranes' },
  { name: 'Industrial Equipment', icon: Building2, desc: 'Server hardware, CNC, plant assets' },
  { name: 'Vehicles', icon: Car, desc: 'Fleet liquidations, commercial vans' },
  { name: 'Electronics', icon: Cpu, desc: 'Decommissioned enterprise tech' },
  { name: 'Office Equipment', icon: Briefcase, desc: 'Furniture, surplus inventory' },
  { name: 'Real Estate & Land', icon: Landmark, desc: 'Commercial lots, industrial sites' },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Authenticate', desc: 'Register as a buyer or seller and complete KYC before bidding or publishing. Optional MFA is available in dashboard security settings.' },
  { n: '02', title: 'Bid in Real-Time', desc: 'Engage in low-latency auctions with increment controls, optional proxy bidding, and anti-snipe protection.' },
  { n: '03', title: 'Secure Settlement', desc: 'Funds are held in platform escrow and released to the seller only after you confirm receipt of the asset.' },
];

const SECURITY_FEATURES = [
  { icon: ShieldCheck, title: 'Escrow-Protected Payments', desc: 'Buyer funds are held by e-AMS and only released to the seller after delivery is confirmed.' },
  { icon: Lock, title: 'Optional Multi-Factor Authentication', desc: 'TOTP MFA can be enabled from your dashboard. It is recommended, not silently assumed.' },
  { icon: Gauge, title: 'Real-Time Bid Integrity', desc: 'Anti-snipe extensions and server-verified increments prevent manipulation in the closing seconds.' },
  { icon: CheckCircle2, title: 'Verified Sellers', desc: 'Sellers complete bank verification before any listing goes live — payouts trace to a real account.' },
];

export default async function HomePage() {
  const auctions = await getLiveAuctions();
  const featured = auctions[0];

  return (
    <main>
      {/* 1. Hero */}
      <section className="hero-grid border-b border-border-muted">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-20 md:py-28 grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-3">
            <p className="eyebrow mb-4">INSTITUTIONAL AUCTION PLATFORM</p>
            <h1 className="text-headline-lg-mobile md:text-headline-xl mb-6 max-w-xl">
              Where serious buyers meet verified sellers.
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-lg mb-8">
              e-AMS is a secure, real-time bidding environment for authenticated industrial and commercial assets — built for buyers and sellers who need precision, not guesswork.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <Link href="/auctions" className="btn-primary">
                Browse Live Auctions <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/register" className="btn-secondary">Create an Account</Link>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-body-sm text-on-surface-variant">
              <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success-green" /> Escrow protected</span>
              <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-success-green" /> Optional MFA</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-success-green" /> KYC-verified sellers</span>
            </div>
          </div>

          <div className="lg:col-span-2">
            {featured ? (
              <div className="card p-6 shadow-level3">
                <div className="flex items-center justify-between mb-4">
                  <span className="badge-live">
                    <span className="w-1.5 h-1.5 rounded-full bg-success-green" /> LIVE NOW
                  </span>
                  <CountdownTimer endsAt={featured.endsAt} />
                </div>
                <p className="text-label-caps text-outline mb-1">FEATURED LOT</p>
                <h3 className="text-headline-md mb-4 line-clamp-2">{featured.title}</h3>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <p className="text-label-caps text-outline mb-1">CURRENT BID</p>
                    <p className="font-mono text-headline-lg text-primary">${Number(featured.currentBid).toLocaleString()}</p>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{featured._count?.bids ?? 0} bids</p>
                </div>
                <Link href={`/auctions/${featured.slug}`} className="btn-primary w-full">View Lot & Bid</Link>
              </div>
            ) : (
              <div className="card p-10 text-center text-on-surface-variant">
                New lots are being verified — check back shortly.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. Stats bar */}
      <section className="border-b border-border-muted bg-surface-container-low">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Transacted (12mo)', value: '$48.2M' },
            { label: 'Verified Institutional Buyers', value: '14,205' },
            { label: 'Avg. Settlement Time', value: '36 hrs' },
            { label: 'Verified Sellers', value: '1,842' },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-mono text-headline-md text-primary mb-1">{s.value}</p>
              <p className="text-body-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Live Auctions */}
      <section className="section-pad max-w-container-max mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="eyebrow mb-2">HAPPENING NOW</p>
            <h2 className="text-headline-lg">Live Auctions</h2>
          </div>
          <Link href="/auctions" className="text-primary text-body-md flex items-center gap-1 hover:gap-2 transition-all">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {auctions.length === 0 ? (
          <p className="text-on-surface-variant">No live auctions right now — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {auctions.slice(0, 3).map((a) => (
              <AuctionCard key={a.id} auction={a} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Browse by Category */}
      <section className="section-pad bg-surface-container-low border-y border-border-muted">
        <div className="max-w-container-max mx-auto">
          <p className="eyebrow mb-2">SOURCE BY INDUSTRY</p>
          <h2 className="text-headline-lg mb-10">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={`/auctions?category=${encodeURIComponent(cat.name)}`}
                className="card p-6 hover:border-primary hover:shadow-level3 transition-all group"
              >
                <cat.icon className="w-6 h-6 text-primary mb-4" strokeWidth={1.75} />
                <p className="font-semibold mb-1 group-hover:text-primary transition-colors">{cat.name}</p>
                <p className="text-body-sm text-on-surface-variant">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. How It Works — genuinely sequential, numbering earns its place */}
      <section className="section-pad max-w-container-max mx-auto">
        <p className="eyebrow mb-2">THE PROCESS</p>
        <h2 className="text-headline-lg mb-12">How e-AMS Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.n} className="relative pl-2">
              <p className="font-mono text-headline-lg text-outline-variant mb-4">{step.n}</p>
              <h3 className="text-headline-md mb-2">{step.title}</h3>
              <p className="text-body-md text-on-surface-variant">{step.desc}</p>
              {i < HOW_IT_WORKS.length - 1 && (
                <div className="hidden md:block absolute top-3 right-[-1rem] w-8 h-px bg-border-muted" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. Security & Escrow */}
      <section className="section-pad bg-surface-container-low border-y border-border-muted">
        <div className="max-w-container-max mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <p className="eyebrow mb-2">BUILT FOR TRUST</p>
            <h2 className="text-headline-lg mb-4">Security isn&apos;t a feature here. It&apos;s the foundation.</h2>
            <p className="text-body-md text-on-surface-variant">
              Every transaction on e-AMS moves through platform escrow, bidding requires KYC, and every seller is bank-verified before a listing goes live.
            </p>
          </div>
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {SECURITY_FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <f.icon className="w-5 h-5 text-primary shrink-0 mt-1" strokeWidth={1.75} />
                <div>
                  <p className="font-semibold mb-1">{f.title}</p>
                  <p className="text-body-sm text-on-surface-variant">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. CTA banner */}
      <section className="section-pad max-w-container-max mx-auto">
        <div className="card bg-primary-container border-none rounded-lg p-10 md:p-16 text-center">
          <TrendingUp className="w-8 h-8 text-on-primary-container mx-auto mb-4" />
          <h2 className="text-headline-lg text-on-primary-container mb-3">Ready to source your next asset?</h2>
          <p className="text-body-lg text-on-primary-container/80 mb-8 max-w-xl mx-auto">
            Join institutional buyers and vetted sellers already trading on e-AMS.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="bg-on-primary-container text-primary-container rounded px-6 py-3 font-medium hover:opacity-90 transition-opacity">
              Start Bidding
            </Link>
            <Link href="/register" className="border border-on-primary-container/30 text-on-primary-container rounded px-6 py-3 font-medium hover:bg-on-primary-container/10 transition-colors">
              Become a Seller
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
