import { Router } from "express";
import ChatController from "../controllers/chat.controller";
import { authMiddleware, restrictTo } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createConversationSchema,
  sendMessageSchema,
} from "../validators/chat.validator";

export const chatRoutes = Router();

chatRoutes.post(
  "/conversations",
  authMiddleware,
  restrictTo("user", "sender"),
  validate(createConversationSchema),
  ChatController.getOrCreateConversation,
);

chatRoutes.get(
  "/conversations",
  authMiddleware,
  restrictTo("user", "sender"),
  ChatController.listConversations,
);

chatRoutes.get(
  "/contacts",
  authMiddleware,
  restrictTo("user", "sender"),
  ChatController.listContacts,
);

chatRoutes.get(
  "/conversations/:conversationId/messages",
  authMiddleware,
  restrictTo("user", "sender"),
  ChatController.listMessages,
);

chatRoutes.post(
  "/conversations/:conversationId/messages",
  authMiddleware,
  restrictTo("user", "sender"),
  validate(sendMessageSchema),
  ChatController.sendMessage,
);

chatRoutes.post(
  "/conversations/:conversationId/read",
  authMiddleware,
  restrictTo("user", "sender"),
  ChatController.markRead,
);
