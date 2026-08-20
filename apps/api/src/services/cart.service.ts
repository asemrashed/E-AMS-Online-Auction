import { prisma } from '@e-ams/db';
import { ApiError } from '../middleware/errorHandler';

export async function addAuctionToCart(buyerId: string, auctionId: string) {
  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw new ApiError(404, 'Auction not found');
  if (auction.sellerId === buyerId) throw new ApiError(403, 'You cannot add your own listing');
  if (auction.status !== 'LIVE' && auction.status !== 'ENDED') {
    throw new ApiError(409, 'This listing cannot be added to cart');
  }

  const cart = await prisma.cart.upsert({
    where: { buyerId },
    update: {},
    create: { buyerId },
  });

  return prisma.cartItem.upsert({
    where: { cartId_auctionId: { cartId: cart.id, auctionId: auction.id } },
    update: {},
    create: { cartId: cart.id, auctionId: auction.id },
  });
}
