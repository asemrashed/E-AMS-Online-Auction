import path from 'path';
import dotenv from 'dotenv';

const candidates = [
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const file of candidates) {
  dotenv.config({ path: file, override: false });
}

export function normalizeDatabaseUrl(raw: string | undefined): string {
  if (!raw) return '';
  let url = String(raw).replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  url = url.replace(/^['"`]+/, '').replace(/['"`]+$/, '').trim();
  if (/^DATABASE_URL\s*=/i.test(url)) {
    url = url.replace(/^DATABASE_URL\s*=\s*/i, '').trim();
    url = url.replace(/^['"`]+/, '').replace(/['"`]+$/, '').trim();
  }
  url = url.replace(/^jdbc:/i, '');
  const embedded = url.match(/postgres(?:ql)?:\/\/\S+/i);
  if (embedded) {
    url = embedded[0].replace(/[,'"`);]+$/, '');
  }
  return url;
}

process.env.DATABASE_URL = normalizeDatabaseUrl(
  process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.DB_URL
);

export function describeDatabaseUrl(url = process.env.DATABASE_URL || '') {
  const protocol = (url.match(/^[^:/]+/) || ['(empty)'])[0];
  return {
    set: Boolean(url),
    length: url.length,
    protocol,
    ok: /^postgres(?:ql)?:\/\//i.test(url),
  };
}
