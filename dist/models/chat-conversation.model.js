"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatConversationModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const roleMapping_1 = require("../utils/roleMapping");
const ChatConversationSchema = new mongoose_1.Schema({
    doctorId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        index: true,
    },
    doctorModel: {
        type: String,
        enum: ["Doctor", "User"],
        default: "Doctor",
    },
    patientId: {
        type: mongoose_1.Schema.Types.ObjectId,
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
        enum: roleMapping_1.chatRoleSchemaValues,
    },
    lastMessageAt: { type: Date },
}, { timestamps: true });
ChatConversationSchema.index({ doctorModel: 1, doctorId: 1, patientModel: 1, patientId: 1 }, { unique: true });
exports.ChatConversationModel = mongoose_1.default.model("ChatConversation", ChatConversationSchema);
exports.default = exports.ChatConversationModel;
