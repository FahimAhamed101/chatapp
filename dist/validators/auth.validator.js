"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const joi_1 = __importDefault(require("joi"));
const allowedRoles = ["sender", "user", "admin", "clinic_owner", "patient", "doctor"];
exports.registerSchema = joi_1.default.object({
    role: joi_1.default.string().valid(...allowedRoles).default("sender"),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).max(128).required(),
    fullName: joi_1.default.when("role", {
        is: joi_1.default.string().valid("user", "doctor"),
        then: joi_1.default.string().trim().min(2),
        otherwise: joi_1.default.forbidden(),
    }),
});
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).max(128).required(),
    role: joi_1.default.string().valid(...allowedRoles),
});
