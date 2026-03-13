import mongoose, { Schema, Model } from "mongoose";
import { IChatConversation } from "../interfaces/chat.interface";
import { chatRoleSchemaValues } from "../utils/roleMapping";

const ChatConversationSchema = new Schema<IChatConversation>(
  {
    doctorId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    doctorModel: {
      type: String,
      enum: ["Doctor", "User"],
      default: "Doctor",
    },
    patientId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    patientModel: {
      type: String,
      enum: ["Doctor", "User"],
      default: "User",
    },
    lastMessageText: { type: String, trim: true },
    lastMessageSenderRole: {
      type: String,
      enum: chatRoleSchemaValues,
    },
    lastMessageAt: { type: Date },
  },
  { timestamps: true },
);

ChatConversationSchema.index(
  { doctorModel: 1, doctorId: 1, patientModel: 1, patientId: 1 },
  { unique: true },
);

export const ChatConversationModel: Model<IChatConversation> =
  mongoose.model<IChatConversation>("ChatConversation", ChatConversationSchema);
export default ChatConversationModel;
