"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToUser = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userSocketMap = new Map();
let io;
const extractToken = (value) => {
    if (!value)
        return undefined;
    if (Array.isArray(value))
        return value[0];
    if (typeof value === "string")
        return value;
    return undefined;
};
const authenticateSocket = (socket, next) => {
    const tokenHeader = extractToken(socket.handshake.headers.token);
    const authHeader = extractToken(socket.handshake.headers.authorization);
    const authToken = extractToken(socket.handshake.auth?.token);
    const queryToken = extractToken(socket.handshake.query?.token);
    const rawToken = authToken || queryToken || tokenHeader || authHeader;
    const actualToken = rawToken?.startsWith("Bearer ")
        ? rawToken.slice(7)
        : rawToken;
    if (!actualToken) {
        return next(new Error("Authentication failed: No token provided."));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(actualToken, process.env.ACCESS_TOKEN_SECRET || "defaultsecret");
        if (!decoded?._id) {
            return next(new Error("Authentication failed: Invalid token payload."));
        }
        socket.userId = decoded._id.toString();
        socket.userRole = decoded.role;
        return next();
    }
    catch (error) {
        return next(new Error("Authentication failed: Invalid token."));
    }
};
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
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
        const userId = socket.userId;
        const userRole = socket.userRole;
        if (userId) {
            userSocketMap.set(userId, socket.id);
            console.log(`Socket connected: ${socket.id} for user ${userId} (${userRole})`);
        }
        else {
            socket.disconnect();
            return;
        }
        socket.on("disconnect", (reason) => {
            const disconnectUserId = socket.userId;
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
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
exports.getIO = getIO;
const emitToUser = (userId, event, data) => {
    const socketId = userSocketMap.get(userId.toString());
    if (socketId) {
        (0, exports.getIO)().to(socketId).emit(event, data);
        return true;
    }
    return false;
};
exports.emitToUser = emitToUser;
