"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = require("express");
const chat_controller_1 = __importDefault(require("../controllers/chat.controller"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validate_middleware_1 = require("../middlewares/validate.middleware");
const chat_validator_1 = require("../validators/chat.validator");
exports.chatRoutes = (0, express_1.Router)();
exports.chatRoutes.post("/conversations", auth_middleware_1.authMiddleware, (0, auth_middleware_1.restrictTo)("user", "sender"), (0, validate_middleware_1.validate)(chat_validator_1.createConversationSchema), chat_controller_1.default.getOrCreateConversation);
exports.chatRoutes.get("/conversations", auth_middleware_1.authMiddleware, (0, auth_middleware_1.restrictTo)("user", "sender"), chat_controller_1.default.listConversations);
exports.chatRoutes.get("/contacts", auth_middleware_1.authMiddleware, (0, auth_middleware_1.restrictTo)("user", "sender"), chat_controller_1.default.listContacts);
exports.chatRoutes.get("/conversations/:conversationId/messages", auth_middleware_1.authMiddleware, (0, auth_middleware_1.restrictTo)("user", "sender"), chat_controller_1.default.listMessages);
exports.chatRoutes.post("/conversations/:conversationId/messages", auth_middleware_1.authMiddleware, (0, auth_middleware_1.restrictTo)("user", "sender"), (0, validate_middleware_1.validate)(chat_validator_1.sendMessageSchema), chat_controller_1.default.sendMessage);
exports.chatRoutes.post("/conversations/:conversationId/read", auth_middleware_1.authMiddleware, (0, auth_middleware_1.restrictTo)("user", "sender"), chat_controller_1.default.markRead);
