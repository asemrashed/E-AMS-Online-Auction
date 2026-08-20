import { prisma } from '@e-ams/db';
import { getIo } from '../sockets/auction.socket';

export async function pushNotification(userId: string, type: string, title: string, body: string, link?: string) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, body, link },
  });
  try {
    getIo().to(`user:${userId}`).emit('notification:new', notification);
  } catch {
    // socket server not initialized (e.g. during tests) — safe to ignore
  }
  return notification;
}
