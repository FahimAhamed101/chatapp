import { normalizeChatRole } from "./roleMapping";

export type ChatParticipantModel = "Doctor" | "User";

export interface ChatParticipantDescriptor {
  id: string;
  model: ChatParticipantModel;
  role?: "user" | "sender";
}

export const getParticipantFromCurrentUser = (
  currentUser: any,
): ChatParticipantDescriptor | null => {
  const role = normalizeChatRole(currentUser?.role);
  if (!role || !currentUser?._id) {
    return null;
  }

  return {
    id: currentUser._id.toString(),
    model: role === "user" ? "Doctor" : "User",
    role,
  };
};

export const getParticipantKey = (participant: ChatParticipantDescriptor) =>
  `${participant.model}:${participant.id}`;

export const normalizeConversationParticipants = (
  participantA: ChatParticipantDescriptor,
  participantB: ChatParticipantDescriptor,
) => {
  const [first, second] =
    getParticipantKey(participantA) <= getParticipantKey(participantB)
      ? [participantA, participantB]
      : [participantB, participantA];

  return { first, second };
};

export const getConversationParticipantModel = (
  conversation: any,
  slot: "doctor" | "patient",
): ChatParticipantModel => {
  const modelField = slot === "doctor" ? "doctorModel" : "patientModel";
  const legacyDefault = slot === "doctor" ? "Doctor" : "User";
  return (conversation?.[modelField] as ChatParticipantModel | undefined) || legacyDefault;
};

export const matchesConversationParticipant = (
  conversation: any,
  slot: "doctor" | "patient",
  participant: ChatParticipantDescriptor,
) => {
  const idField = slot === "doctor" ? "doctorId" : "patientId";
  const slotValue = conversation?.[idField];
  const slotId =
    typeof slotValue === "string"
      ? slotValue
      : slotValue?._id?.toString?.() || slotValue?.toString?.();

  return (
    slotId === participant.id &&
    getConversationParticipantModel(conversation, slot) === participant.model
  );
};
