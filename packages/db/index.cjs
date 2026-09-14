'use strict';

function normalizeDatabaseUrl(raw) {
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

const databaseUrl = normalizeDatabaseUrl(
  process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PRIVATE_URL ||
    process.env.DB_URL
);
if (databaseUrl) process.env.DATABASE_URL = databaseUrl;

const prismaClient = require('@prisma/client');
const { PrismaClient } = prismaClient;

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__eamsPrisma ??
  new PrismaClient(
    databaseUrl
      ? { datasources: { db: { url: databaseUrl } } }
      : undefined
  );
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__eamsPrisma = prisma;
}

module.exports = Object.assign({}, prismaClient, { prisma });
