"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_service_1 = __importDefault(require("../services/chat.service"));
const chatPresenter_1 = require("../utils/chatPresenter");
class ChatController {
    static getConversationId(req) {
        const { conversationId } = req.params;
        return Array.isArray(conversationId) ? conversationId[0] : conversationId;
    }
    static async getOrCreateConversation(req, res, next) {
        try {
            const conversation = await chat_service_1.default.getOrCreateConversation(req.user, req.body);
            res.status(201).json({ conversationId: conversation._id });
        }
        catch (error) {
            next(error);
        }
    }
    static async listConversations(req, res, next) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const result = await chat_service_1.default.listConversations(req.user, {
                page,
                limit,
            });
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const currentUser = req.user;
            const data = result.data.map((conversation) => (0, chatPresenter_1.formatConversationForClient)(conversation, currentUser, baseUrl));
            res.json({
                total: result.total,
                page: result.page,
                limit: result.limit,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async listContacts(req, res, next) {
        try {
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const result = await chat_service_1.default.listContacts(req.user, {
                search: typeof req.query.search === "string" ? req.query.search : undefined,
            });
            res.json({
                data: result.map((contact) => (0, chatPresenter_1.formatChatContactForClient)(contact, baseUrl)),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async listMessages(req, res, next) {
        try {
            const conversationId = ChatController.getConversationId(req);
            const limit = parseInt(req.query.limit) || 20;
            const before = req.query.before
                ? new Date(req.query.before)
                : undefined;
            const result = await chat_service_1.default.listMessages(req.user, conversationId, { limit, before });
            res.json({
                ...result,
                data: result.data.map((message) => (0, chatPresenter_1.formatMessageForClient)(message)),
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async sendMessage(req, res, next) {
        try {
            const conversationId = ChatController.getConversationId(req);
            const { content } = req.body;
            const message = await chat_service_1.default.sendMessage(req.user, conversationId, content);
            res.status(201).json((0, chatPresenter_1.formatMessageForClient)(message));
        }
        catch (error) {
            next(error);
        }
    }
    static async markRead(req, res, next) {
        try {
            const conversationId = ChatController.getConversationId(req);
            await chat_service_1.default.markRead(req.user, conversationId);
            res.json({ message: "Messages marked as read." });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.default = ChatController;
