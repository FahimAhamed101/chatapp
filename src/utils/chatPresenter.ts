import { toUploadPath } from "./uploadPath";
import { normalizeChatRole } from "./roleMapping";
import {
  ChatParticipantModel,
  getConversationParticipantModel,
  getParticipantFromCurrentUser,
  matchesConversationParticipant,
} from "./chatParticipants";

const normalizeProfilePicture = (value: string | undefined, baseUrl: string) => {
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  return `${baseUrl}/${toUploadPath(value)}`;
};

export const formatMessageForClient = (message: any) => ({
  _id: message._id,
  conversationId: message.conversationId,
  senderRole: normalizeChatRole(message.senderRole) ?? "sender",
  senderId: message.senderId,
  content: message.content,
  readByUser: Boolean(message.readByDoctor),
  readBySender: Boolean(message.readByPatient),
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const getParticipantName = (record: any, model: ChatParticipantModel) => {
  if (!record) return undefined;

  if (model === "Doctor") {
    return record.fullName || record.email?.split?.("@")?.[0];
  }

  if (record.personalInfo?.fullName) {
    const { first, last } = record.personalInfo.fullName;
    return `${first || ""} ${last || ""}`.trim();
  }

  return record.email?.split?.("@")?.[0];
};

const formatParticipantForClient = (
  record: any,
  model: ChatParticipantModel,
  baseUrl: string,
) => ({
  id: record?._id,
  name: getParticipantName(record, model),
  email: record?.email,
  profilePicture:
    model === "User"
      ? normalizeProfilePicture(record?.personalInfo?.profilePicture, baseUrl)
      : undefined,
});

export const formatConversationForClient = (
  conversation: any,
  currentUser: any,
  baseUrl: string,
) => {
  const currentParticipant = getParticipantFromCurrentUser(currentUser);
  const baseConversation = {
    conversationId: conversation._id,
    lastMessageText: conversation.lastMessageText,
    lastMessageSenderRole: conversation.lastMessageSenderRole
      ? normalizeChatRole(conversation.lastMessageSenderRole)
      : undefined,
    lastMessageAt: conversation.lastMessageAt,
  };

  const currentIsDoctorSlot = currentParticipant
    ? matchesConversationParticipant(conversation, "doctor", currentParticipant)
    : false;
  const otherSlot = currentIsDoctorSlot ? "patient" : "doctor";
  const otherRecord =
    otherSlot === "doctor" ? conversation.doctorId : conversation.patientId;
  const otherModel = getConversationParticipantModel(conversation, otherSlot);
  const otherRole =
    normalizeChatRole(otherRecord?.role) ||
    (otherModel === "Doctor" ? "user" : "sender");
  const otherKey = otherRole === "user" ? "user" : "sender";

  return {
    ...baseConversation,
    [otherKey]: otherRecord
      ? formatParticipantForClient(otherRecord, otherModel, baseUrl)
      : undefined,
  };
};

export const formatChatContactForClient = (record: any, baseUrl: string) => {
  const role =
    normalizeChatRole(record?.role) ||
    (record?.fullName ? "user" : "sender");

  if (!role) {
    return undefined;
  }

  return {
    role,
    model: record.fullName ? "Doctor" : "User",
    ...formatParticipantForClient(
      record,
      record.fullName ? "Doctor" : "User",
      baseUrl,
    ),
  };
};
