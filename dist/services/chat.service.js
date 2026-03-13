"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chat_repository_1 = __importDefault(require("../repositories/chat.repository"));
const doctor_repository_1 = __importDefault(require("../repositories/doctor.repository"));
const user_repository_1 = __importDefault(require("../repositories/user.repository"));
const appError_1 = __importDefault(require("../utils/appError"));
const socket_1 = require("../socket");
const chatPresenter_1 = require("../utils/chatPresenter");
const roleMapping_1 = require("../utils/roleMapping");
const chatParticipants_1 = require("../utils/chatParticipants");
const doctor_model_1 = __importDefault(require("../models/doctor.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
class ChatService {
    static resolveRequestedParticipant(payload) {
        if (payload.recipientId && payload.recipientModel) {
            return {
                id: payload.recipientId,
                model: payload.recipientModel,
            };
        }
        if (payload.userId || payload.doctorId) {
            return {
                id: payload.userId || payload.doctorId || "",
                model: "Doctor",
            };
        }
        if (payload.senderId || payload.patientId) {
            return {
                id: payload.senderId || payload.patientId || "",
                model: "User",
            };
        }
        return null;
    }
    static async findParticipantRecord(participant) {
        return participant.model === "Doctor"
            ? doctor_repository_1.default.findById(participant.id)
            : user_repository_1.default.findById(participant.id);
    }
    static getOtherConversationParticipant(conversation, currentUser) {
        const currentParticipant = (0, chatParticipants_1.getParticipantFromCurrentUser)(currentUser);
        if (currentParticipant && (0, chatParticipants_1.matchesConversationParticipant)(conversation, "doctor", currentParticipant)) {
            return {
                id: conversation.patientId.toString(),
                model: (0, chatParticipants_1.getConversationParticipantModel)(conversation, "patient"),
            };
        }
        return {
            id: conversation.doctorId.toString(),
            model: (0, chatParticipants_1.getConversationParticipantModel)(conversation, "doctor"),
        };
    }
    static async getOrCreateConversation(currentUser, payload) {
        const currentParticipant = (0, chatParticipants_1.getParticipantFromCurrentUser)(currentUser);
        const recipient = this.resolveRequestedParticipant(payload);
        if (!currentParticipant) {
            throw new appError_1.default("Only users and senders can create chats.", 403);
        }
        if (!recipient?.id || !recipient?.model) {
            throw new appError_1.default("recipientId and recipientModel are required.", 400);
        }
        if (currentParticipant.id === recipient.id &&
            currentParticipant.model === recipient.model) {
            throw new appError_1.default("You cannot start a conversation with yourself.", 400);
        }
        const currentRecord = await this.findParticipantRecord(currentParticipant);
        if (!currentRecord) {
            throw new appError_1.default("Current user not found.", 404);
        }
        const recipientRecord = await this.findParticipantRecord(recipient);
        if (!recipientRecord) {
            throw new appError_1.default("Recipient not found.", 404);
        }
        let conversation = await chat_repository_1.default.findConversationByParticipants(currentParticipant, recipient);
        if (!conversation) {
            conversation = await chat_repository_1.default.createConversation({
                participantA: currentParticipant,
                participantB: recipient,
            });
        }
        return conversation;
    }
    static async listConversations(currentUser, options) {
        const currentParticipant = (0, chatParticipants_1.getParticipantFromCurrentUser)(currentUser);
        if (!currentParticipant) {
            throw new appError_1.default("Only users and senders can view chats.", 403);
        }
        const [data, total] = await Promise.all([
            chat_repository_1.default.listConversationsForParticipant(currentParticipant, options.page, options.limit),
            chat_repository_1.default.countConversationsForParticipant(currentParticipant),
        ]);
        return { total, page: options.page, limit: options.limit, data };
    }
    static async listContacts(currentUser, options) {
        const currentParticipant = (0, chatParticipants_1.getParticipantFromCurrentUser)(currentUser);
        if (!currentParticipant) {
            throw new appError_1.default("Only users and senders can view contacts.", 403);
        }
        const search = options.search?.trim();
        const searchRegex = search ? new RegExp(search, "i") : undefined;
        const [users, senders] = await Promise.all([
            doctor_model_1.default.find({
                ...(currentParticipant.model === "Doctor"
                    ? { _id: { $ne: currentParticipant.id } }
                    : {}),
                ...(searchRegex
                    ? { $or: [{ fullName: searchRegex }, { email: searchRegex }] }
                    : {}),
            }).select("fullName email role"),
            user_model_1.default.find({
                role: { $in: ["sender", "patient"] },
                ...(currentParticipant.model === "User"
                    ? { _id: { $ne: currentParticipant.id } }
                    : {}),
                ...(searchRegex
                    ? {
                        $or: [
                            { "personalInfo.fullName.first": searchRegex },
                            { "personalInfo.fullName.last": searchRegex },
                            { email: searchRegex },
                        ],
                    }
                    : {}),
            }).select("personalInfo.fullName personalInfo.profilePicture email role"),
        ]);
        return [...users, ...senders];
    }
    static async listMessages(currentUser, conversationId, options) {
        const conversation = await chat_repository_1.default.findConversationById(conversationId);
        if (!conversation) {
            throw new appError_1.default("Conversation not found.", 404);
        }
        this.assertParticipantAccess(currentUser, conversation);
        const messages = await chat_repository_1.default.listMessages(conversationId, options);
        const ordered = [...messages].reverse();
        return { data: ordered, limit: options.limit };
    }
    static async sendMessage(currentUser, conversationId, content) {
        const conversation = await chat_repository_1.default.findConversationById(conversationId);
        if (!conversation) {
            throw new appError_1.default("Conversation not found.", 404);
        }
        this.assertParticipantAccess(currentUser, conversation);
        const senderRole = (0, roleMapping_1.normalizeChatRole)(currentUser.role);
        if (!senderRole) {
            throw new appError_1.default("Only users and senders can send messages.", 403);
        }
        const senderId = currentUser._id.toString();
        const message = await chat_repository_1.default.createMessage({
            conversationId,
            senderRole,
            senderId,
            content,
        });
        await chat_repository_1.default.updateConversationLastMessage(conversationId, content, senderRole, message.createdAt);
        const recipient = this.getOtherConversationParticipant(conversation, currentUser);
        (0, socket_1.emitToUser)(recipient.id, "chat:message", {
            conversationId,
            message: (0, chatPresenter_1.formatMessageForClient)(message),
        });
        return message;
    }
    static async markRead(currentUser, conversationId) {
        const conversation = await chat_repository_1.default.findConversationById(conversationId);
        if (!conversation) {
            throw new appError_1.default("Conversation not found.", 404);
        }
        this.assertParticipantAccess(currentUser, conversation);
        const currentRole = (0, roleMapping_1.normalizeChatRole)(currentUser.role);
        if (!currentRole) {
            throw new appError_1.default("Only users and senders can mark chats as read.", 403);
        }
        const result = await chat_repository_1.default.markMessagesRead(conversationId, currentRole);
        const recipient = this.getOtherConversationParticipant(conversation, currentUser);
        (0, socket_1.emitToUser)(recipient.id, "chat:read", {
            conversationId,
            readerRole: currentRole,
        });
        return result;
    }
    static assertParticipantAccess(currentUser, conversation) {
        const currentParticipant = (0, chatParticipants_1.getParticipantFromCurrentUser)(currentUser);
        if (!currentParticipant) {
            throw new appError_1.default("Only users and senders can access chats.", 403);
        }
        if ((0, chatParticipants_1.matchesConversationParticipant)(conversation, "doctor", currentParticipant) ||
            (0, chatParticipants_1.matchesConversationParticipant)(conversation, "patient", currentParticipant)) {
            return;
        }
        throw new appError_1.default("You do not have access to this conversation.", 403);
    }
}
exports.default = ChatService;
