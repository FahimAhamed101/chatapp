"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatChatContactForClient = exports.formatConversationForClient = exports.formatMessageForClient = void 0;
const uploadPath_1 = require("./uploadPath");
const roleMapping_1 = require("./roleMapping");
const chatParticipants_1 = require("./chatParticipants");
const normalizeProfilePicture = (value, baseUrl) => {
    if (!value)
        return value;
    if (value.startsWith("http://") || value.startsWith("https://")) {
        return value;
    }
    return `${baseUrl}/${(0, uploadPath_1.toUploadPath)(value)}`;
};
const formatMessageForClient = (message) => ({
    _id: message._id,
    conversationId: message.conversationId,
    senderRole: (0, roleMapping_1.normalizeChatRole)(message.senderRole) ?? "sender",
    senderId: message.senderId,
    content: message.content,
    readByUser: Boolean(message.readByDoctor),
    readBySender: Boolean(message.readByPatient),
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
});
exports.formatMessageForClient = formatMessageForClient;
const getParticipantName = (record, model) => {
    if (!record)
        return undefined;
    if (model === "Doctor") {
        return record.fullName || record.email?.split?.("@")?.[0];
    }
    if (record.personalInfo?.fullName) {
        const { first, last } = record.personalInfo.fullName;
        return `${first || ""} ${last || ""}`.trim();
    }
    return record.email?.split?.("@")?.[0];
};
const formatParticipantForClient = (record, model, baseUrl) => ({
    id: record?._id,
    name: getParticipantName(record, model),
    email: record?.email,
    profilePicture: model === "User"
        ? normalizeProfilePicture(record?.personalInfo?.profilePicture, baseUrl)
        : undefined,
});
const formatConversationForClient = (conversation, currentUser, baseUrl) => {
    const currentParticipant = (0, chatParticipants_1.getParticipantFromCurrentUser)(currentUser);
    const baseConversation = {
        conversationId: conversation._id,
        lastMessageText: conversation.lastMessageText,
        lastMessageSenderRole: conversation.lastMessageSenderRole
            ? (0, roleMapping_1.normalizeChatRole)(conversation.lastMessageSenderRole)
            : undefined,
        lastMessageAt: conversation.lastMessageAt,
    };
    const currentIsDoctorSlot = currentParticipant
        ? (0, chatParticipants_1.matchesConversationParticipant)(conversation, "doctor", currentParticipant)
        : false;
    const otherSlot = currentIsDoctorSlot ? "patient" : "doctor";
    const otherRecord = otherSlot === "doctor" ? conversation.doctorId : conversation.patientId;
    const otherModel = (0, chatParticipants_1.getConversationParticipantModel)(conversation, otherSlot);
    const otherRole = (0, roleMapping_1.normalizeChatRole)(otherRecord?.role) ||
        (otherModel === "Doctor" ? "user" : "sender");
    const otherKey = otherRole === "user" ? "user" : "sender";
    return {
        ...baseConversation,
        [otherKey]: otherRecord
            ? formatParticipantForClient(otherRecord, otherModel, baseUrl)
            : undefined,
    };
};
exports.formatConversationForClient = formatConversationForClient;
const formatChatContactForClient = (record, baseUrl) => {
    const role = (0, roleMapping_1.normalizeChatRole)(record?.role) ||
        (record?.fullName ? "user" : "sender");
    if (!role) {
        return undefined;
    }
    return {
        role,
        model: record.fullName ? "Doctor" : "User",
        ...formatParticipantForClient(record, record.fullName ? "Doctor" : "User", baseUrl),
    };
};
exports.formatChatContactForClient = formatChatContactForClient;
