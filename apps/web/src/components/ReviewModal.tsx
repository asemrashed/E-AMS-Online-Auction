'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export function ReviewModal({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  pending,
  error,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSubmit: (payload: { rating: number; comment: string }) => void;
  pending?: boolean;
  error?: string | null;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative card w-full max-w-md p-6 space-y-4">
        <h2 className="text-headline-md">{title}</h2>
        {subtitle && <p className="text-body-sm text-on-surface-variant">{subtitle}</p>}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
              <Star className={`w-7 h-7 ${n <= rating ? 'fill-tertiary text-tertiary' : 'text-outline'}`} />
            </button>
          ))}
        </div>
        <textarea
          className="input-field"
          rows={4}
          placeholder="Share a short review (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        {error && <p className="text-urgent-red text-body-sm">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Skip</button>
          <button
            type="button"
            className="btn-primary flex-1"
            disabled={pending}
            onClick={() => onSubmit({ rating, comment })}
          >
            {pending ? 'Saving…' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
}
