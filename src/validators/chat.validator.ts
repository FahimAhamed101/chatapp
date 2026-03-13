import Joi from "joi";

export const createConversationSchema = Joi.object({
  recipientId: Joi.string(),
  recipientModel: Joi.string().valid("Doctor", "User"),
  userId: Joi.string(),
  senderId: Joi.string(),
  doctorId: Joi.string(),
  patientId: Joi.string(),
}).or("recipientId", "userId", "senderId", "doctorId", "patientId");

export const sendMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(2000).required(),
});
