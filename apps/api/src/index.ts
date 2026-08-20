import './load-env';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { initSocket } from './sockets/auction.socket';
import { errorHandler, notFound } from './middleware/errorHandler';
import { startAuctionCloser } from './services/auction-closer';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import auctionRoutes from './routes/auction.routes';
import bidRoutes from './routes/bid.routes';
import cartRoutes from './routes/cart.routes';
import sellerRoutes from './routes/seller.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import payoutRoutes from './routes/payout.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin.routes';
import superAdminRoutes from './routes/superadmin.routes';
import watchlistRoutes from './routes/watchlist.routes';
import uploadRoutes from './routes/upload.routes';
import contactRoutes from './routes/contact.routes';
import reviewRoutes from './routes/review.routes';

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.WEB_URL || 'http://localhost:3000', credentials: true }));

app.use('/api/payments', paymentRoutes);
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false });
const bidLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/bids', bidLimiter, bidRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/super-admin', superAdminRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(notFound);
app.use(errorHandler);

initSocket(httpServer);
startAuctionCloser();

const PORT = process.env.API_PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`e-AMS API listening on port ${PORT}`);
});