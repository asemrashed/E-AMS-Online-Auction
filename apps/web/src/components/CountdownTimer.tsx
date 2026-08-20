'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';

function format(ms: number) {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export function CountdownTimer({ endsAt, className }: { endsAt: string; className?: string }) {
  const [remaining, setRemaining] = useState(() => new Date(endsAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(endsAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  const urgent = remaining < 60_000 && remaining > 0;
  const ended = remaining <= 0;

  return (
    <span
      className={clsx(
        'font-mono text-label-numeric',
        urgent && 'text-urgent-red',
        ended && 'text-outline',
        className
      )}
    >
      {ended ? 'Ended' : format(remaining)}
    </span>
  );
}
