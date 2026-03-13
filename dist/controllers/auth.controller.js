"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const appError_1 = __importDefault(require("../utils/appError"));
const user_model_1 = __importDefault(require("../models/user.model"));
const doctor_model_1 = __importDefault(require("../models/doctor.model"));
const roleMapping_1 = require("../utils/roleMapping");
const sanitizeRoleBasedUser = (record) => {
    const sanitized = record.toObject ? record.toObject() : { ...record };
    delete sanitized.password;
    delete sanitized.passwordResetToken;
    delete sanitized.passwordResetExpires;
    sanitized.role = (0, roleMapping_1.normalizeAppRole)(sanitized.role) || sanitized.role;
    return sanitized;
};
class AuthController {
    static async register(req, res, next) {
        try {
            const { email, password, role = "sender", fullName, } = req.body;
            const normalizedRole = (0, roleMapping_1.normalizeAppRole)(role) || "sender";
            const [existingSender, existingUser] = await Promise.all([
                user_model_1.default.findOne({ email }),
                doctor_model_1.default.findOne({ email }),
            ]);
            if (existingSender || existingUser) {
                return next(new appError_1.default("Email already in use.", 400));
            }
            if (normalizedRole === "user") {
                const userPayload = {
                    email,
                    password,
                    role: "user",
                };
                if (fullName)
                    userPayload.fullName = fullName;
                const userRecord = await doctor_model_1.default.create(userPayload);
                const accessToken = userRecord.generateAccessToken();
                const refreshToken = userRecord.generateRefreshToken();
                return res.status(201).json({
                    user: sanitizeRoleBasedUser(userRecord),
                    accessToken,
                    refreshToken,
                });
            }
            const user = await user_model_1.default.create({
                email,
                password,
                authProvider: "local",
                role: normalizedRole,
            });
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();
            return res.status(201).json({
                user: user.toJSON(),
                accessToken,
                refreshToken,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async login(req, res, next) {
        try {
            const { email, password, role } = req.body;
            const normalizedRole = (0, roleMapping_1.normalizeAppRole)(role) || "sender";
            if (normalizedRole === "user") {
                const userRecord = await doctor_model_1.default.findOne({ email });
                if (!userRecord || !(await userRecord.verifyPassword(password))) {
                    return next(new appError_1.default("Invalid email or password.", 401));
                }
                const accessToken = userRecord.generateAccessToken();
                const refreshToken = userRecord.generateRefreshToken();
                return res.json({
                    user: sanitizeRoleBasedUser(userRecord),
                    accessToken,
                    refreshToken,
                });
            }
            const user = await user_model_1.default.findOne({ email });
            if (!user || !(await user.verifyPassword(password))) {
                return next(new appError_1.default("Invalid email or password.", 401));
            }
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();
            return res.json({
                user: user.toJSON(),
                accessToken,
                refreshToken,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.default = AuthController;
