'use client';

import { useUploadSignature } from '@/hooks/useApi';
import { useState } from 'react';

export async function uploadToCloudinary(file: File, sign: { timestamp: number; signature: string; folder: string; cloudName: string; apiKey: string }) {
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', String(sign.timestamp));
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/auto/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url as string;
}

function normalizeImageUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function ImageUploader({
  urls,
  onChange,
  label,
  max = 8,
  accept = 'image/*,.pdf',
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  label: string;
  max?: number;
  accept?: string;
}) {
  const sign = useUploadSignature();
  const busy = sign.isPending;
  const remaining = Math.max(0, max - urls.length);
  const [link, setLink] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length || remaining === 0) return;
    const chosen = Array.from(files).slice(0, remaining);
    const uploaded: string[] = [];
    for (const file of chosen) {
      const creds = await sign.mutateAsync();
      uploaded.push(await uploadToCloudinary(file, creds));
    }
    onChange([...urls, ...uploaded]);
  }

  function addLink() {
    setLinkError(null);
    if (remaining === 0) return;
    const url = normalizeImageUrl(link);
    if (!url) {
      setLinkError('Enter a valid image URL (https://…)');
      return;
    }
    if (urls.includes(url)) {
      setLinkError('That URL is already added');
      return;
    }
    onChange([...urls, url]);
    setLink('');
  }

  return (
    <div>
      <label className="text-label-caps text-outline">{label}</label>
      <input type="file" accept={accept} multiple={max > 1} className="input-field" disabled={busy || remaining === 0} onChange={(e) => onFiles(e.target.files)} />
      <div className="flex gap-2 mt-2">
        <input
          className="input-field flex-1"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Or paste an image URL"
          disabled={remaining === 0}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={addLink} disabled={remaining === 0}>
          Add link
        </button>
      </div>
      {linkError && <p className="text-urgent-red text-body-sm mt-1">{linkError}</p>}
      {busy && <p className="text-body-sm text-on-surface-variant mt-1">Uploading…</p>}
      {remaining === 0 && <p className="text-body-sm text-on-surface-variant mt-1">Maximum {max} images.</p>}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {urls.map((u) => (
            <button key={u} type="button" className="relative w-20 h-24 rounded overflow-hidden border border-border-muted bg-surface-container-high flex items-center justify-center" onClick={() => onChange(urls.filter((x) => x !== u))}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="max-w-full max-h-full object-contain" />
            </button>
          ))}
        </div>
      )}
      <p className="text-body-sm text-outline mt-1">Upload a file or add a URL. Click a thumbnail to remove it.</p>
    </div>
  );
}
