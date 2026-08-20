import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Password123!', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@eams.com' },
    update: {},
    create: {
      email: 'superadmin@eams.com',
      passwordHash: password,
      fullName: 'Platform Owner',
      role: 'SUPER_ADMIN',
      kycStatus: 'VERIFIED',
      emailVerified: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eams.com' },
    update: {},
    create: {
      email: 'admin@eams.com',
      passwordHash: password,
      fullName: 'Ops Admin',
      role: 'ADMIN',
      kycStatus: 'VERIFIED',
      emailVerified: true,
      createdByAdmin: superAdmin.id,
    },
  });

  const seller = await prisma.user.upsert({
    where: { email: 'seller@eams.com' },
    update: {},
    create: {
      email: 'seller@eams.com',
      passwordHash: password,
      fullName: 'National Earthworks Co.',
      organization: 'National Earthworks Co.',
      role: 'SELLER',
      kycStatus: 'VERIFIED',
      emailVerified: true,
      bankAccount: {
        create: {
          accountName: 'National Earthworks Co.',
          accountNumber: '000123456789',
          bankName: 'Chase Business',
          routingOrBranch: '021000021',
          verified: true,
        },
      },
    },
  });

  const buyer = await prisma.user.upsert({
    where: { email: 'buyer@eams.com' },
    update: {},
    create: {
      email: 'buyer@eams.com',
      passwordHash: password,
      fullName: 'Apex Construction Partners',
      organization: 'Apex Construction Partners LLC',
      role: 'BUYER',
      kycStatus: 'VERIFIED',
      emailVerified: true,
      cart: { create: {} },
    },
  });

  const auction = await prisma.auction.upsert({
    where: { slug: 'caterpillar-d9t-2018' },
    update: {},
    create: {
      sellerId: seller.id,
      title: 'Caterpillar D9T Track-Type Tractor (2018) - Low Hours',
      slug: 'caterpillar-d9t-2018',
      description:
        'Exceptionally maintained Caterpillar D9T Track-Type Tractor. Operated primarily in a controlled quarry environment. Single owner asset with complete service history.',
      category: 'Heavy Machinery',
      condition: 'Used - Excellent',
      images: [],
      startingBid: 100000,
      reservePrice: 140000,
      buyNowPrice: 185000,
      currentBid: 145000,
      minIncrement: 1000,
      status: 'LIVE',
      antiSnipe: true,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
      reserveMet: true,
    },
  });

  await prisma.bid.createMany({
    data: [
      { auctionId: auction.id, bidderId: buyer.id, amount: 135000 },
      { auctionId: auction.id, bidderId: buyer.id, amount: 140000 },
      { auctionId: auction.id, bidderId: buyer.id, amount: 145000 },
    ],
  });

  console.log('Seed complete:', { superAdmin: superAdmin.email, admin: admin.email, seller: seller.email, buyer: buyer.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
