"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchesConversationParticipant = exports.getConversationParticipantModel = exports.normalizeConversationParticipants = exports.getParticipantKey = exports.getParticipantFromCurrentUser = void 0;
const roleMapping_1 = require("./roleMapping");
const getParticipantFromCurrentUser = (currentUser) => {
    const role = (0, roleMapping_1.normalizeChatRole)(currentUser?.role);
    if (!role || !currentUser?._id) {
        return null;
    }
    return {
        id: currentUser._id.toString(),
        model: role === "user" ? "Doctor" : "User",
        role,
    };
};
exports.getParticipantFromCurrentUser = getParticipantFromCurrentUser;
const getParticipantKey = (participant) => `${participant.model}:${participant.id}`;
exports.getParticipantKey = getParticipantKey;
const normalizeConversationParticipants = (participantA, participantB) => {
    const [first, second] = (0, exports.getParticipantKey)(participantA) <= (0, exports.getParticipantKey)(participantB)
        ? [participantA, participantB]
        : [participantB, participantA];
    return { first, second };
};
exports.normalizeConversationParticipants = normalizeConversationParticipants;
const getConversationParticipantModel = (conversation, slot) => {
    const modelField = slot === "doctor" ? "doctorModel" : "patientModel";
    const legacyDefault = slot === "doctor" ? "Doctor" : "User";
    return conversation?.[modelField] || legacyDefault;
};
exports.getConversationParticipantModel = getConversationParticipantModel;
const matchesConversationParticipant = (conversation, slot, participant) => {
    const idField = slot === "doctor" ? "doctorId" : "patientId";
    const slotValue = conversation?.[idField];
    const slotId = typeof slotValue === "string"
        ? slotValue
        : slotValue?._id?.toString?.() || slotValue?.toString?.();
    return (slotId === participant.id &&
        (0, exports.getConversationParticipantModel)(conversation, slot) === participant.model);
};
exports.matchesConversationParticipant = matchesConversationParticipant;
