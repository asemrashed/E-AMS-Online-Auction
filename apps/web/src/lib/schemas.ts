import { z } from 'zod';

export const roleSchema = z.enum(['BUYER', 'SELLER', 'ADMIN', 'SUPER_ADMIN']);
export const kycSchema = z.enum(['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED']);
export const auctionStatusSchema = z.enum(['DRAFT', 'LIVE', 'ENDED', 'CANCELLED', 'FLAGGED']);
export const orderStatusSchema = z.enum([
  'AWAITING_PAYMENT', 'PAID_ESCROW', 'SHIPPED', 'RECEIVED_CONFIRMED',
  'PAYOUT_REQUESTED', 'PAYOUT_COMPLETED', 'DISPUTED', 'REFUNDED', 'CANCELLED',
]);

const money = z.union([z.string(), z.number()]).transform((v) => String(v));

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  organization: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  emailVerified: z.boolean().optional(),
  role: roleSchema,
  kycStatus: kycSchema,
  kycDocumentUrls: z.array(z.string()).optional(),
  avatarUrl: z.string().nullable().optional(),
  mfaEnabled: z.boolean().optional(),
  createdAt: z.string().optional(),
  address: z.object({
    line1: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
  }).nullable().optional(),
  bankAccount: z.object({
    accountName: z.string(),
    accountNumber: z.string(),
    bankName: z.string(),
    routingOrBranch: z.string(),
    verified: z.boolean(),
  }).nullable().optional(),
});

export const auctionSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.string(),
  condition: z.string(),
  images: z.array(z.string()).default([]),
  startingBid: money,
  reservePrice: money.nullable().optional(),
  buyNowPrice: money.nullable().optional(),
  currentBid: money,
  minIncrement: money,
  status: auctionStatusSchema,
  antiSnipe: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
  reserveMet: z.boolean(),
  winnerId: z.string().nullable().optional(),
  soldViaBuyNow: z.boolean().optional(),
  seller: z.object({
    id: z.string().optional(),
    fullName: z.string(),
    organization: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  }).optional(),
  _count: z.object({ bids: z.number().optional(), watchers: z.number().optional() }).optional(),
}).passthrough();

export const bidSchema = z.object({
  id: z.string(),
  auctionId: z.string(),
  bidderId: z.string(),
  amount: money,
  isProxy: z.boolean().optional(),
  maxProxyAmt: money.nullable().optional(),
  createdAt: z.string(),
  bidder: z.object({ id: z.string().optional(), fullName: z.string() }).optional(),
  auction: auctionSchema.optional(),
}).passthrough();

export const reviewSchema = z.object({
  id: z.string(),
  orderId: z.string().optional(),
  fromUserId: z.string(),
  toUserId: z.string(),
  rating: z.number(),
  comment: z.string().nullable().optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const orderSchema = z.object({
  id: z.string(),
  auctionId: z.string(),
  buyerId: z.string(),
  finalAmount: money,
  platformFeeAmt: money,
  sellerPayoutAmt: money,
  status: orderStatusSchema,
  auction: auctionSchema.optional(),
  buyer: z.object({
    id: z.string().optional(),
    fullName: z.string(),
    organization: z.string().nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
  }).optional(),
  payment: z.object({ gateway: z.string(), status: z.string() }).nullable().optional(),
  reviews: z.array(reviewSchema).optional(),
  promptReview: z.boolean().optional(),
  reviewTarget: z.object({ id: z.string(), fullName: z.string() }).optional(),
}).passthrough();

export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable().optional(),
  read: z.boolean(),
  createdAt: z.string(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  organization: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['BUYER', 'SELLER']),
});

export const listingSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  category: z.string(),
  condition: z.string(),
  startingBid: z.coerce.number().positive(),
  reservePrice: z.string().optional(),
  buyNowPrice: z.string().optional(),
  minIncrement: z.coerce.number().positive(),
  antiSnipe: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
  images: z.array(z.string()).default([]),
});

export const bankSchema = z.object({
  accountName: z.string().min(2),
  accountNumber: z.string().min(4),
  bankName: z.string().min(2),
  routingOrBranch: z.string().min(2),
});

export const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10),
});

export type User = z.infer<typeof userSchema>;
export type Auction = z.infer<typeof auctionSchema>;
export type Bid = z.infer<typeof bidSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type Role = z.infer<typeof roleSchema>;