import { ShieldCheck, Gauge, Landmark, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const PILLARS = [
  { icon: ShieldCheck, title: 'Trust', desc: 'Every seller is bank-verified. Every buyer is KYC-checked. Every dollar moves through escrow, not directly between strangers.' },
  { icon: Gauge, title: 'Precision', desc: 'Real-time bidding with server-verified increments and anti-snipe protection — the price you see is the price that\u2019s real.' },
  { icon: Landmark, title: 'Access', desc: 'Institutional-grade infrastructure, open to any verified buyer or seller — not gatekept behind private auction houses.' },
];

const STATS = [
  { value: '$48.2M', label: 'Transacted in the last 12 months' },
  { value: '14,205', label: 'Verified institutional buyers' },
  { value: '1,842', label: 'Verified sellers' },
  { value: '36 hrs', label: 'Average settlement time' },
];

export default function AboutPage() {
  return (
    <main>
      <section className="hero-grid border-b border-border-muted section-pad">
        <div className="max-w-container-max mx-auto text-center max-w-3xl mx-auto">
          <p className="eyebrow mb-4">ABOUT E-AMS</p>
          <h1 className="text-headline-lg-mobile md:text-headline-xl mb-6">
            A trading floor for assets that deserve a real market.
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            e-AMS was built on a simple premise: high-value industrial and commercial assets deserve the same real-time
            price discovery, security, and settlement discipline as any regulated financial market — not a listings board
            with a countdown timer bolted on.
          </p>
        </div>
      </section>

      <section className="section-pad max-w-container-max mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="font-mono text-headline-lg text-primary mb-2">{s.value}</p>
              <p className="text-body-sm text-on-surface-variant">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-pad bg-surface-container-low border-y border-border-muted">
        <div className="max-w-container-max mx-auto">
          <p className="eyebrow mb-2">WHAT WE STAND ON</p>
          <h2 className="text-headline-lg mb-12">Three commitments, no exceptions.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PILLARS.map((p) => (
              <div key={p.title} className="card p-8">
                <p.icon className="w-6 h-6 text-primary mb-5" strokeWidth={1.75} />
                <h3 className="text-headline-md mb-3">{p.title}</h3>
                <p className="text-body-md text-on-surface-variant">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad max-w-container-max mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow mb-2">HOW MONEY MOVES</p>
            <h2 className="text-headline-lg mb-4">Escrow first, always.</h2>
            <p className="text-body-md text-on-surface-variant mb-4">
              When a buyer wins a lot, payment goes into platform escrow — not directly to the seller. The seller ships,
              the buyer confirms receipt, and only then is the payout released, minus e-AMS&apos;s 5% platform fee.
            </p>
            <p className="text-body-md text-on-surface-variant">
              If something goes wrong before that confirmation, the funds are still with us — not gone.
            </p>
          </div>
          <div className="card p-8">
            <ol className="space-y-6">
              {[
                'Buyer pays — funds held in e-AMS escrow',
                'Seller ships the asset',
                'Buyer confirms receipt',
                'Seller claims payout, admin approves',
                'Seller receives 95% — 5% platform fee retained',
              ].map((step, i) => (
                <li key={step} className="flex items-center gap-4">
                  <span className="font-mono text-body-sm text-outline w-6">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-body-md">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="section-pad max-w-container-max mx-auto">
        <div className="card bg-primary-container border-none rounded-lg p-10 md:p-16 text-center">
          <h2 className="text-headline-lg text-on-primary-container mb-3">Have questions before you register?</h2>
          <p className="text-body-lg text-on-primary-container/80 mb-8 max-w-xl mx-auto">
            Our team can walk institutional buyers and sellers through onboarding.
          </p>
          <Link href="/contact" className="bg-on-primary-container text-primary-container rounded px-6 py-3 font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2">
            Contact Us <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
