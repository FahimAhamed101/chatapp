"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessageSchema = exports.createConversationSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createConversationSchema = joi_1.default.object({
    recipientId: joi_1.default.string(),
    recipientModel: joi_1.default.string().valid("Doctor", "User"),
    userId: joi_1.default.string(),
    senderId: joi_1.default.string(),
    doctorId: joi_1.default.string(),
    patientId: joi_1.default.string(),
}).or("recipientId", "userId", "senderId", "doctorId", "patientId");
exports.sendMessageSchema = joi_1.default.object({
    content: joi_1.default.string().trim().min(1).max(2000).required(),
});
