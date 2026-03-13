import ChatRepository from "../repositories/chat.repository";
import DoctorRepository from "../repositories/doctor.repository";
import UserRepository from "../repositories/user.repository";
import AppError from "../utils/appError";
import { emitToUser } from "../socket";
import { formatMessageForClient } from "../utils/chatPresenter";
import { normalizeChatRole } from "../utils/roleMapping";
import {
  ChatParticipantDescriptor,
  ChatParticipantModel,
  getConversationParticipantModel,
  getParticipantFromCurrentUser,
  matchesConversationParticipant,
} from "../utils/chatParticipants";
import DoctorModel from "../models/doctor.model";
import UserModel from "../models/user.model";

export default class ChatService {
  private static resolveRequestedParticipant(
    payload: {
      recipientId?: string;
      recipientModel?: ChatParticipantModel;
      userId?: string;
      senderId?: string;
      doctorId?: string;
      patientId?: string;
    },
  ): ChatParticipantDescriptor | null {
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

  private static async findParticipantRecord(
    participant: ChatParticipantDescriptor,
  ) {
    return participant.model === "Doctor"
      ? DoctorRepository.findById(participant.id)
      : UserRepository.findById(participant.id);
  }

  private static getOtherConversationParticipant(conversation: any, currentUser: any) {
    const currentParticipant = getParticipantFromCurrentUser(currentUser);
    if (currentParticipant && matchesConversationParticipant(conversation, "doctor", currentParticipant)) {
      return {
        id: conversation.patientId.toString(),
        model: getConversationParticipantModel(conversation, "patient"),
      };
    }

    return {
      id: conversation.doctorId.toString(),
      model: getConversationParticipantModel(conversation, "doctor"),
    };
  }

  static async getOrCreateConversation(
    currentUser: any,
    payload: {
      recipientId?: string;
      recipientModel?: ChatParticipantModel;
      userId?: string;
      senderId?: string;
      doctorId?: string;
      patientId?: string;
    },
  ) {
    const currentParticipant = getParticipantFromCurrentUser(currentUser);
    const recipient = this.resolveRequestedParticipant(payload);

    if (!currentParticipant) {
      throw new AppError("Only users and senders can create chats.", 403);
    }

    if (!recipient?.id || !recipient?.model) {
      throw new AppError("recipientId and recipientModel are required.", 400);
    }

    if (
      currentParticipant.id === recipient.id &&
      currentParticipant.model === recipient.model
    ) {
      throw new AppError("You cannot start a conversation with yourself.", 400);
    }

    const currentRecord = await this.findParticipantRecord(currentParticipant);
    if (!currentRecord) {
      throw new AppError("Current user not found.", 404);
    }

    const recipientRecord = await this.findParticipantRecord(recipient);
    if (!recipientRecord) {
      throw new AppError("Recipient not found.", 404);
    }

    let conversation = await ChatRepository.findConversationByParticipants(
      currentParticipant,
      recipient,
    );

    if (!conversation) {
      conversation = await ChatRepository.createConversation({
        participantA: currentParticipant,
        participantB: recipient,
      });
    }

    return conversation;
  }

  static async listConversations(
    currentUser: any,
    options: { page: number; limit: number },
  ) {
    const currentParticipant = getParticipantFromCurrentUser(currentUser);
    if (!currentParticipant) {
      throw new AppError("Only users and senders can view chats.", 403);
    }

    const [data, total] = await Promise.all([
      ChatRepository.listConversationsForParticipant(
        currentParticipant,
        options.page,
        options.limit,
      ),
      ChatRepository.countConversationsForParticipant(currentParticipant),
    ]);
    return { total, page: options.page, limit: options.limit, data };
  }

  static async listContacts(
    currentUser: any,
    options: { search?: string },
  ) {
    const currentParticipant = getParticipantFromCurrentUser(currentUser);
    if (!currentParticipant) {
      throw new AppError("Only users and senders can view contacts.", 403);
    }

    const search = options.search?.trim();
    const searchRegex = search ? new RegExp(search, "i") : undefined;

    const [users, senders] = await Promise.all([
      DoctorModel.find({
        ...(currentParticipant.model === "Doctor"
          ? { _id: { $ne: currentParticipant.id } }
          : {}),
        ...(searchRegex
          ? { $or: [{ fullName: searchRegex }, { email: searchRegex }] }
          : {}),
      }).select("fullName email role"),
      UserModel.find({
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

  static async listMessages(
    currentUser: any,
    conversationId: string,
    options: { before?: Date; limit: number },
  ) {
    const conversation = await ChatRepository.findConversationById(
      conversationId,
    );
    if (!conversation) {
      throw new AppError("Conversation not found.", 404);
    }

    this.assertParticipantAccess(currentUser, conversation);

    const messages = await ChatRepository.listMessages(conversationId, options);
    const ordered = [...messages].reverse();
    return { data: ordered, limit: options.limit };
  }

  static async sendMessage(
    currentUser: any,
    conversationId: string,
    content: string,
  ) {
    const conversation = await ChatRepository.findConversationById(
      conversationId,
    );
    if (!conversation) {
      throw new AppError("Conversation not found.", 404);
    }

    this.assertParticipantAccess(currentUser, conversation);

    const senderRole = normalizeChatRole(currentUser.role);
    if (!senderRole) {
      throw new AppError("Only users and senders can send messages.", 403);
    }
    const senderId = currentUser._id.toString();

    const message = await ChatRepository.createMessage({
      conversationId,
      senderRole,
      senderId,
      content,
    });

    await ChatRepository.updateConversationLastMessage(
      conversationId,
      content,
      senderRole,
      message.createdAt,
    );

    const recipient = this.getOtherConversationParticipant(conversation, currentUser);
    emitToUser(recipient.id, "chat:message", {
      conversationId,
      message: formatMessageForClient(message),
    });

    return message;
  }

  static async markRead(currentUser: any, conversationId: string) {
    const conversation = await ChatRepository.findConversationById(
      conversationId,
    );
    if (!conversation) {
      throw new AppError("Conversation not found.", 404);
    }

    this.assertParticipantAccess(currentUser, conversation);

    const currentRole = normalizeChatRole(currentUser.role);
    if (!currentRole) {
      throw new AppError("Only users and senders can mark chats as read.", 403);
    }
    const result = await ChatRepository.markMessagesRead(conversationId, currentRole);
    const recipient = this.getOtherConversationParticipant(conversation, currentUser);
    emitToUser(recipient.id, "chat:read", {
      conversationId,
      readerRole: currentRole,
    });
    return result;
  }

  private static assertParticipantAccess(currentUser: any, conversation: any) {
    const currentParticipant = getParticipantFromCurrentUser(currentUser);
    if (!currentParticipant) {
      throw new AppError("Only users and senders can access chats.", 403);
    }

    if (
      matchesConversationParticipant(conversation, "doctor", currentParticipant) ||
      matchesConversationParticipant(conversation, "patient", currentParticipant)
    ) {
      return;
    }

    throw new AppError("You do not have access to this conversation.", 403);
  }
}
