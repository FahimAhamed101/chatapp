import { Document, Types } from "mongoose";
import { ChatParticipantModel } from "../utils/chatParticipants";

export type ChatSenderRole = "user" | "sender";
export type StoredChatSenderRole = ChatSenderRole | "doctor" | "patient";

export interface IChatConversation extends Document {
  doctorId: Types.ObjectId;
  doctorModel?: ChatParticipantModel;
  patientId: Types.ObjectId;
  patientModel?: ChatParticipantModel;
  lastMessageText?: string;
  lastMessageSenderRole?: StoredChatSenderRole;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessage extends Document {
  conversationId: Types.ObjectId;
  senderRole: StoredChatSenderRole;
  senderId: Types.ObjectId;
  content: string;
  readByDoctor: boolean;
  readByPatient: boolean;
  createdAt: Date;
  updatedAt: Date;
}
