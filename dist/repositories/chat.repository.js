"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const chat_conversation_model_1 = __importDefault(require("../models/chat-conversation.model"));
const chat_message_model_1 = __importDefault(require("../models/chat-message.model"));
const doctor_model_1 = __importDefault(require("../models/doctor.model"));
const user_model_1 = __importDefault(require("../models/user.model"));
const chatParticipants_1 = require("../utils/chatParticipants");
class ChatRepository {
    static buildModelClause(field, model) {
        const legacyDefault = field === "doctorModel" ? "Doctor" : "User";
        if (model === legacyDefault) {
            return {
                $or: [{ [field]: model }, { [field]: { $exists: false } }],
            };
        }
        return { [field]: model };
    }
    static buildParticipantSlotQuery(slot, participant) {
        const idField = slot === "doctor" ? "doctorId" : "patientId";
        const modelField = slot === "doctor" ? "doctorModel" : "patientModel";
        return {
            $and: [
                { [idField]: new mongoose_1.default.Types.ObjectId(participant.id) },
                this.buildModelClause(modelField, participant.model),
            ],
        };
    }
    static async hydrateParticipants(conversations) {
        if (conversations.length === 0)
            return conversations;
        const doctorIds = new Set();
        const userIds = new Set();
        conversations.forEach((conversation) => {
            const slots = ["doctor", "patient"];
            slots.forEach((slot) => {
                const idField = slot === "doctor" ? "doctorId" : "patientId";
                const slotValue = conversation[idField];
                const slotId = typeof slotValue === "string"
                    ? slotValue
                    : slotValue?._id?.toString?.() || slotValue?.toString?.();
                if (!slotId)
                    return;
                if ((0, chatParticipants_1.getConversationParticipantModel)(conversation, slot) === "Doctor") {
                    doctorIds.add(slotId);
                }
                else {
                    userIds.add(slotId);
                }
            });
        });
        const [doctors, users] = await Promise.all([
            doctorIds.size
                ? doctor_model_1.default.find({ _id: { $in: [...doctorIds] } }).select("fullName email role")
                : [],
            userIds.size
                ? user_model_1.default.find({ _id: { $in: [...userIds] } }).select("personalInfo.fullName personalInfo.profilePicture email role")
                : [],
        ]);
        const doctorMap = new Map(doctors.map((doctor) => [doctor._id.toString(), doctor]));
        const userMap = new Map(users.map((user) => [user._id.toString(), user]));
        return conversations.map((conversation) => {
            const hydrated = conversation.toObject ? conversation.toObject() : { ...conversation };
            hydrated.doctorModel = (0, chatParticipants_1.getConversationParticipantModel)(conversation, "doctor");
            hydrated.patientModel = (0, chatParticipants_1.getConversationParticipantModel)(conversation, "patient");
            const doctorId = hydrated.doctorId?.toString?.() || hydrated.doctorId;
            const patientId = hydrated.patientId?.toString?.() || hydrated.patientId;
            hydrated.doctorId =
                hydrated.doctorModel === "Doctor"
                    ? doctorMap.get(doctorId)
                    : userMap.get(doctorId);
            hydrated.patientId =
                hydrated.patientModel === "Doctor"
                    ? doctorMap.get(patientId)
                    : userMap.get(patientId);
            return hydrated;
        });
    }
    static async findConversationByParticipants(participantA, participantB) {
        const { first, second } = (0, chatParticipants_1.normalizeConversationParticipants)(participantA, participantB);
        return await chat_conversation_model_1.default.findOne({
            $and: [
                { doctorId: new mongoose_1.default.Types.ObjectId(first.id) },
                this.buildModelClause("doctorModel", first.model),
                { patientId: new mongoose_1.default.Types.ObjectId(second.id) },
                this.buildModelClause("patientModel", second.model),
            ],
        });
    }
    static async createConversation(data) {
        const { first, second } = (0, chatParticipants_1.normalizeConversationParticipants)(data.participantA, data.participantB);
        return await chat_conversation_model_1.default.create({
            doctorId: new mongoose_1.default.Types.ObjectId(first.id),
            doctorModel: first.model,
            patientId: new mongoose_1.default.Types.ObjectId(second.id),
            patientModel: second.model,
        });
    }
    static async findConversationById(conversationId) {
        return await chat_conversation_model_1.default.findById(conversationId);
    }
    static async listConversationsForParticipant(participant, page, limit) {
        const conversations = await chat_conversation_model_1.default.find({
            $or: [
                this.buildParticipantSlotQuery("doctor", participant),
                this.buildParticipantSlotQuery("patient", participant),
            ],
        })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        return await this.hydrateParticipants(conversations);
    }
    static async countConversationsForParticipant(participant) {
        return await chat_conversation_model_1.default.countDocuments({
            $or: [
                this.buildParticipantSlotQuery("doctor", participant),
                this.buildParticipantSlotQuery("patient", participant),
            ],
        });
    }
    static async createMessage(data) {
        return await chat_message_model_1.default.create({
            conversationId: new mongoose_1.default.Types.ObjectId(data.conversationId),
            senderRole: data.senderRole,
            senderId: new mongoose_1.default.Types.ObjectId(data.senderId),
            content: data.content,
            readByDoctor: data.senderRole === "user",
            readByPatient: data.senderRole === "sender",
        });
    }
    static async listMessages(conversationId, options) {
        const match = {
            conversationId: new mongoose_1.default.Types.ObjectId(conversationId),
        };
        if (options.before) {
            match.createdAt = { $lt: options.before };
        }
        return await chat_message_model_1.default.find(match)
            .sort({ createdAt: -1 })
            .limit(options.limit);
    }
    static async markMessagesRead(conversationId, role) {
        const update = role === "user"
            ? { readByDoctor: true }
            : { readByPatient: true };
        return await chat_message_model_1.default.updateMany({
            conversationId: new mongoose_1.default.Types.ObjectId(conversationId),
            ...(role === "user" ? { readByDoctor: false } : { readByPatient: false }),
        }, { $set: update });
    }
    static async updateConversationLastMessage(conversationId, lastMessageText, lastMessageSenderRole, lastMessageAt) {
        return await chat_conversation_model_1.default.findByIdAndUpdate(conversationId, {
            lastMessageText,
            lastMessageSenderRole,
            lastMessageAt,
        }, { new: true });
    }
}
exports.default = ChatRepository;
