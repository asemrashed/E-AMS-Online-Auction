import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: [process.env.WEB_URL || 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // Optional auth — token lets us join a private per-user room for outbid/notification pushes
    const token = socket.handshake.auth?.token as string | undefined;
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        socket.join(`user:${payload.userId}`);
      } catch {
        // ignore — socket still works for anonymous public auction-room viewing
      }
    }

    // Client explicitly joins/leaves an auction room to watch live bidding
    socket.on('auction:join', (auctionId: string) => {
      socket.join(`auction:${auctionId}`);
    });

    socket.on('auction:leave', (auctionId: string) => {
      socket.leave(`auction:${auctionId}`);
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io not initialized — call initSocket(httpServer) first');
  return io;
}
