'use strict';

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, '');
}

const prismaClient = require('@prisma/client');
const { PrismaClient } = prismaClient;

const globalForPrisma = globalThis;

const prisma = globalForPrisma.__eamsPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__eamsPrisma = prisma;
}

module.exports = Object.assign({}, prismaClient, { prisma });
