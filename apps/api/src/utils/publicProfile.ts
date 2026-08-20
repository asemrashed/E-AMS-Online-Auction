import { prisma } from '@e-ams/db';

export async function getPublicProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      organization: true,
      phone: true,
      bio: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      addresses: { take: 1, select: { line1: true, city: true, state: true, country: true } },
    },
  });
  if (!user) return null;

  const [sells, buys, ratingAgg, recentReviews] = await Promise.all([
    prisma.order.count({
      where: {
        auction: { sellerId: userId },
        status: { in: ['PAID_ESCROW', 'SHIPPED', 'RECEIVED_CONFIRMED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED'] },
      },
    }),
    prisma.order.count({
      where: {
        buyerId: userId,
        status: { in: ['PAID_ESCROW', 'SHIPPED', 'RECEIVED_CONFIRMED', 'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED'] },
      },
    }),
    prisma.review.aggregate({ where: { toUserId: userId }, _avg: { rating: true }, _count: true }),
    prisma.review.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        fromUser: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
  ]);

  const address = user.addresses[0] ?? null;
  return {
    id: user.id,
    fullName: user.fullName,
    organization: user.organization,
    phone: user.phone,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
    memberSince: user.createdAt,
    address,
    stats: {
      totalSells: sells,
      totalBuys: buys,
      ratingAvg: ratingAgg._avg.rating ? Number(ratingAgg._avg.rating.toFixed(1)) : null,
      ratingCount: ratingAgg._count,
    },
    reviews: recentReviews,
  };
}
