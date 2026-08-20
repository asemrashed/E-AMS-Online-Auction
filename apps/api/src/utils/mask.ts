export function maskBidder(userId: string) {
  return `Bidder ${userId.slice(-4).toUpperCase()}`;
}