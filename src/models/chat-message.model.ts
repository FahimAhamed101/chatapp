import mongoose, { Schema, Model } from "mongoose";
import { IChatMessage } from "../interfaces/chat.interface";
import { chatRoleSchemaValues } from "../utils/roleMapping";

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: chatRoleSchemaValues,
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    readByDoctor: { type: Boolean, default: false },
    readByPatient: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ChatMessageSchema.index({ conversationId: 1, createdAt: -1 });

export const ChatMessageModel: Model<IChatMessage> =
  mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
export default ChatMessageModel;
