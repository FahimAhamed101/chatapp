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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const roleMapping_1 = require("../utils/roleMapping");
// -------- Schemas --------
const AddressSchema = new mongoose_1.Schema({
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
});
const PersonalInfoSchema = new mongoose_1.Schema({
    fullName: {
        first: { type: String, required: true },
        middle: { type: String },
        last: { type: String, required: true },
    },
    dob: { type: Date, required: true },
    sex: { type: String, enum: ["Male", "Female", "Other"], required: true },
    maritalStatus: {
        type: String,
        enum: ["Single", "Married", "Divorced", "Windowed", "Separated", "Unknown"],
        required: true,
    },
    bloodGroup: {
        type: String,
        enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },
    numberOfChildren: { type: Number },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: AddressSchema, required: true },
    employer: { type: String },
    profilePicture: { type: String },
});
const UserSchema = new mongoose_1.Schema({
    googleId: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, required: true, index: true },
    password: { type: String },
    authProvider: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationOtp: { type: String },
    verificationOtpExpires: { type: Date },
    personalInfo: { type: PersonalInfoSchema },
    role: {
        type: String,
        enum: ["sender", "patient", "admin", "clinic_owner"],
        default: "sender",
        index: true,
    },
    passwordResetToken: { type: String, index: true },
    passwordResetExpires: { type: Date },
    favoriteDoctors: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Doctor" }],
}, { timestamps: true });
UserSchema.index({ "medicalInfo.medications.reminderTime": 1 });
UserSchema.index({ clinicId: 1, email: 1 }, { unique: true });
UserSchema.pre("save", async function (next) {
    const user = this;
    if (!user.isModified("password") || !user.password)
        return next();
    user.password = await bcryptjs_1.default.hash(user.password, 10);
    next();
});
UserSchema.methods.verifyPassword = async function (password) {
    return bcryptjs_1.default.compare(password, this.password);
};
UserSchema.methods.generateAccessToken = function () {
    return jsonwebtoken_1.default.sign({
        _id: this._id,
        email: this.email,
        role: (0, roleMapping_1.normalizeAppRole)(this.role) || this.role,
    }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" });
};
UserSchema.methods.generateRefreshToken = function () {
    return jsonwebtoken_1.default.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
    });
};
UserSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.passwordResetToken;
    delete userObject.passwordResetExpires;
    delete userObject.verificationOtp;
    delete userObject.verificationOtpExpires;
    userObject.role = (0, roleMapping_1.normalizeAppRole)(userObject.role) || userObject.role;
    return userObject;
};
const UserModel = mongoose_1.default.model("User", UserSchema);
exports.default = UserModel;
