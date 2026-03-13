import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

const userSocketMap = new Map<string, string>();

let io: SocketIOServer;

const extractToken = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;
  return undefined;
};

const authenticateSocket = (socket: Socket, next: (err?: Error) => void) => {
  const tokenHeader = extractToken(socket.handshake.headers.token);
  const authHeader = extractToken(socket.handshake.headers.authorization);
  const authToken = extractToken((socket.handshake.auth as any)?.token);
  const queryToken = extractToken((socket.handshake.query as any)?.token);

  const rawToken = authToken || queryToken || tokenHeader || authHeader;
  const actualToken = rawToken?.startsWith("Bearer ")
    ? rawToken.slice(7)
    : rawToken;

  if (!actualToken) {
    return next(new Error("Authentication failed: No token provided."));
  }

  try {
    const decoded = jwt.verify(
      actualToken,
      process.env.ACCESS_TOKEN_SECRET || "defaultsecret",
    ) as any;

    if (!decoded?._id) {
      return next(new Error("Authentication failed: Invalid token payload."));
    }

    (socket as any).userId = decoded._id.toString();
    (socket as any).userRole = decoded.role;
    return next();
  } catch (error) {
    return next(new Error("Authentication failed: Invalid token."));
  }
};

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    const userRole = (socket as any).userRole;

    if (userId) {
      userSocketMap.set(userId, socket.id);
      console.log(`Socket connected: ${socket.id} for user ${userId} (${userRole})`);
    } else {
      socket.disconnect();
      return;
    }

    socket.on("disconnect", (reason) => {
      const disconnectUserId = (socket as any).userId;
      if (disconnectUserId) {
        userSocketMap.delete(disconnectUserId);
      }
      console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });

    socket.on("error", (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const emitToUser = (userId: string, event: string, data: any) => {
  const socketId = userSocketMap.get(userId.toString());
  if (socketId) {
    getIO().to(socketId).emit(event, data);
    return true;
  }
  return false;
};
