'use client';

export type ListingOverview = {
  title: string;
  description: string;
  category: string;
  condition: string;
  images: string[];
  startingBid: string | number;
  reservePrice?: string | number;
  buyNowPrice?: string | number;
  minIncrement: string | number;
  startsAt: string;
  endsAt: string;
  antiSnipe: boolean;
};

function money(n: string | number | undefined) {
  if (n === '' || n === undefined || n === null) return '—';
  const v = Number(n);
  return Number.isFinite(v) ? `$${v.toLocaleString()}` : '—';
}

function when(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

export function PublishConfirmModal({
  open,
  pending,
  error,
  listing,
  onClose,
  onConfirm,
}: {
  open: boolean;
  pending?: boolean;
  error?: string | null;
  listing: ListingOverview;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div>
          <p className="text-label-caps text-outline mb-1">Review before publishing</p>
          <h2 className="text-headline-md">Confirm listing</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Check every detail below. Publishing makes this auction visible to buyers.
          </p>
        </div>

        {listing.images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {listing.images.map((src) => (
              <div key={src} className="aspect-[3/4] bg-surface-container-high rounded overflow-hidden flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="max-w-full max-h-full object-contain" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant">No images attached.</p>
        )}

        <div className="space-y-1">
          <h3 className="font-semibold text-body-lg">{listing.title || 'Untitled'}</h3>
          <p className="text-body-sm text-on-surface-variant">
            {listing.category} · {listing.condition}
          </p>
          <p className="text-body-sm whitespace-pre-wrap">{listing.description}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-body-sm">
          <div>
            <dt className="text-label-caps text-outline">Starting bid</dt>
            <dd className="font-mono font-semibold">{money(listing.startingBid)}</dd>
          </div>
          <div>
            <dt className="text-label-caps text-outline">Min increment</dt>
            <dd className="font-mono">{money(listing.minIncrement)}</dd>
          </div>
          <div>
            <dt className="text-label-caps text-outline">Reserve</dt>
            <dd className="font-mono">{money(listing.reservePrice)}</dd>
          </div>
          <div>
            <dt className="text-label-caps text-outline">Buy Now</dt>
            <dd className="font-mono">{money(listing.buyNowPrice)}</dd>
          </div>
          <div>
            <dt className="text-label-caps text-outline">Starts</dt>
            <dd>{when(listing.startsAt)}</dd>
          </div>
          <div>
            <dt className="text-label-caps text-outline">Ends</dt>
            <dd>{when(listing.endsAt)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-label-caps text-outline">Anti-snipe</dt>
            <dd>{listing.antiSnipe ? 'On — final 5 minutes extend by 5 minutes' : 'Off'}</dd>
          </div>
        </dl>

        {error && <p className="text-urgent-red text-body-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={pending}>
            Back to edit
          </button>
          <button type="button" className="btn-primary flex-1" onClick={onConfirm} disabled={pending}>
            {pending ? 'Publishing…' : 'Confirm publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
