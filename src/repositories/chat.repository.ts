import mongoose from "mongoose";
import ChatConversationModel from "../models/chat-conversation.model";
import ChatMessageModel from "../models/chat-message.model";
import { ChatSenderRole } from "../interfaces/chat.interface";
import DoctorModel from "../models/doctor.model";
import UserModel from "../models/user.model";
import {
  ChatParticipantDescriptor,
  getConversationParticipantModel,
  normalizeConversationParticipants,
} from "../utils/chatParticipants";

export default class ChatRepository {
  private static buildModelClause(
    field: "doctorModel" | "patientModel",
    model: "Doctor" | "User",
  ) {
    const legacyDefault =
      field === "doctorModel" ? "Doctor" : "User";

    if (model === legacyDefault) {
      return {
        $or: [{ [field]: model }, { [field]: { $exists: false } }],
      };
    }

    return { [field]: model };
  }

  private static buildParticipantSlotQuery(
    slot: "doctor" | "patient",
    participant: ChatParticipantDescriptor,
  ) {
    const idField = slot === "doctor" ? "doctorId" : "patientId";
    const modelField = slot === "doctor" ? "doctorModel" : "patientModel";

    return {
      $and: [
        { [idField]: new mongoose.Types.ObjectId(participant.id) },
        this.buildModelClause(modelField, participant.model),
      ],
    };
  }

  private static async hydrateParticipants(conversations: any[]) {
    if (conversations.length === 0) return conversations;

    const doctorIds = new Set<string>();
    const userIds = new Set<string>();

    conversations.forEach((conversation) => {
      const slots: Array<"doctor" | "patient"> = ["doctor", "patient"];
      slots.forEach((slot) => {
        const idField = slot === "doctor" ? "doctorId" : "patientId";
        const slotValue = conversation[idField];
        const slotId =
          typeof slotValue === "string"
            ? slotValue
            : slotValue?._id?.toString?.() || slotValue?.toString?.();

        if (!slotId) return;

        if (getConversationParticipantModel(conversation, slot) === "Doctor") {
          doctorIds.add(slotId);
        } else {
          userIds.add(slotId);
        }
      });
    });

    const [doctors, users] = await Promise.all([
      doctorIds.size
        ? DoctorModel.find({ _id: { $in: [...doctorIds] } }).select(
            "fullName email role",
          )
        : [],
      userIds.size
        ? UserModel.find({ _id: { $in: [...userIds] } }).select(
            "personalInfo.fullName personalInfo.profilePicture email role",
          )
        : [],
    ]);

    const doctorMap = new Map(
      doctors.map((doctor) => [doctor._id.toString(), doctor]),
    );
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));

    return conversations.map((conversation) => {
      const hydrated = conversation.toObject ? conversation.toObject() : { ...conversation };
      hydrated.doctorModel = getConversationParticipantModel(conversation, "doctor");
      hydrated.patientModel = getConversationParticipantModel(conversation, "patient");

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

  static async findConversationByParticipants(
    participantA: ChatParticipantDescriptor,
    participantB: ChatParticipantDescriptor,
  ) {
    const { first, second } = normalizeConversationParticipants(
      participantA,
      participantB,
    );

    return await ChatConversationModel.findOne({
      $and: [
        { doctorId: new mongoose.Types.ObjectId(first.id) },
        this.buildModelClause("doctorModel", first.model),
        { patientId: new mongoose.Types.ObjectId(second.id) },
        this.buildModelClause("patientModel", second.model),
      ],
    });
  }

  static async createConversation(data: {
    participantA: ChatParticipantDescriptor;
    participantB: ChatParticipantDescriptor;
  }) {
    const { first, second } = normalizeConversationParticipants(
      data.participantA,
      data.participantB,
    );

    return await ChatConversationModel.create({
      doctorId: new mongoose.Types.ObjectId(first.id),
      doctorModel: first.model,
      patientId: new mongoose.Types.ObjectId(second.id),
      patientModel: second.model,
    });
  }

  static async findConversationById(conversationId: string) {
    return await ChatConversationModel.findById(conversationId);
  }

  static async listConversationsForParticipant(
    participant: ChatParticipantDescriptor,
    page: number,
    limit: number,
  ) {
    const conversations = await ChatConversationModel.find({
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

  static async countConversationsForParticipant(
    participant: ChatParticipantDescriptor,
  ) {
    return await ChatConversationModel.countDocuments({
      $or: [
        this.buildParticipantSlotQuery("doctor", participant),
        this.buildParticipantSlotQuery("patient", participant),
      ],
    });
  }

  static async createMessage(data: {
    conversationId: string;
    senderRole: ChatSenderRole;
    senderId: string;
    content: string;
  }) {
    return await ChatMessageModel.create({
      conversationId: new mongoose.Types.ObjectId(data.conversationId),
      senderRole: data.senderRole,
      senderId: new mongoose.Types.ObjectId(data.senderId),
      content: data.content,
      readByDoctor: data.senderRole === "user",
      readByPatient: data.senderRole === "sender",
    });
  }

  static async listMessages(
    conversationId: string,
    options: { before?: Date; limit: number },
  ) {
    const match: any = {
      conversationId: new mongoose.Types.ObjectId(conversationId),
    };
    if (options.before) {
      match.createdAt = { $lt: options.before };
    }
    return await ChatMessageModel.find(match)
      .sort({ createdAt: -1 })
      .limit(options.limit);
  }

  static async markMessagesRead(
    conversationId: string,
    role: ChatSenderRole,
  ) {
    const update =
      role === "user"
        ? { readByDoctor: true }
        : { readByPatient: true };
    return await ChatMessageModel.updateMany(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        ...(role === "user" ? { readByDoctor: false } : { readByPatient: false }),
      },
      { $set: update },
    );
  }

  static async updateConversationLastMessage(
    conversationId: string,
    lastMessageText: string,
    lastMessageSenderRole: ChatSenderRole,
    lastMessageAt: Date,
  ) {
    return await ChatConversationModel.findByIdAndUpdate(
      conversationId,
      {
        lastMessageText,
        lastMessageSenderRole,
        lastMessageAt,
      },
      { new: true },
    );
  }
}
