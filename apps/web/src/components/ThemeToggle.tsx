'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { applyTheme, persistTheme, readThemeMode, type ThemeMode } from '@/lib/theme';

const OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'device', label: 'Device', icon: Monitor },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
];

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('device');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const initial = readThemeMode();
    setMode(initial);
    applyTheme(initial);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystem = () => {
      if (readThemeMode() === 'device') applyTheme('device');
    };
    mq.addEventListener('change', onSystem);
    return () => mq.removeEventListener('change', onSystem);
  }, []);

  function choose(next: ThemeMode) {
    setMode(next);
    persistTheme(next);
    setOpen(false);
  }

  const Current = OPTIONS.find((o) => o.id === mode)?.icon ?? Monitor;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme"
        className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors"
      >
        <Current className="w-4 h-4" />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-40" aria-label="Close theme menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 card p-1 min-w-[9rem]">
            {OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => choose(o.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-body-sm text-left ${mode === o.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container'}`}
              >
                <o.icon className="w-4 h-4" />
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}