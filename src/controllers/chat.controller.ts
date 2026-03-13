import { NextFunction, Request, Response } from "express";
import ChatService from "../services/chat.service";
import {
  formatChatContactForClient,
  formatConversationForClient,
  formatMessageForClient,
} from "../utils/chatPresenter";

export default class ChatController {
  private static getConversationId(req: Request) {
    const { conversationId } = req.params;
    return Array.isArray(conversationId) ? conversationId[0] : conversationId;
  }

  static async getOrCreateConversation(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const conversation = await ChatService.getOrCreateConversation(
        (req as any).user,
        req.body,
      );
      res.status(201).json({ conversationId: conversation._id });
    } catch (error) {
      next(error);
    }
  }

  static async listConversations(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await ChatService.listConversations((req as any).user, {
        page,
        limit,
      });
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const currentUser = (req as any).user;

      const data = result.data.map((conversation: any) =>
        formatConversationForClient(conversation, currentUser, baseUrl),
      );

      res.json({
        total: result.total,
        page: result.page,
        limit: result.limit,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listContacts(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const result = await ChatService.listContacts((req as any).user, {
        search:
          typeof req.query.search === "string" ? req.query.search : undefined,
      });

      res.json({
        data: result.map((contact: any) =>
          formatChatContactForClient(contact, baseUrl),
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  static async listMessages(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const conversationId = ChatController.getConversationId(req);
      const limit = parseInt(req.query.limit as string) || 20;
      const before = req.query.before
        ? new Date(req.query.before as string)
        : undefined;
      const result = await ChatService.listMessages(
        (req as any).user,
        conversationId,
        { limit, before },
      );
      res.json({
        ...result,
        data: result.data.map((message: any) => formatMessageForClient(message)),
      });
    } catch (error) {
      next(error);
    }
  }

  static async sendMessage(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const conversationId = ChatController.getConversationId(req);
      const { content } = req.body;
      const message = await ChatService.sendMessage(
        (req as any).user,
        conversationId,
        content,
      );
      res.status(201).json(formatMessageForClient(message));
    } catch (error) {
      next(error);
    }
  }

  static async markRead(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const conversationId = ChatController.getConversationId(req);
      await ChatService.markRead((req as any).user, conversationId);
      res.json({ message: "Messages marked as read." });
    } catch (error) {
      next(error);
    }
  }
}
