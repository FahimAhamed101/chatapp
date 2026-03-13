"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restrictTo = exports.restrictToOnboarded = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const appError_1 = __importDefault(require("../utils/appError"));
const user_repository_1 = __importDefault(require("../repositories/user.repository"));
const doctor_repository_1 = __importDefault(require("../repositories/doctor.repository"));
const roleMapping_1 = require("../utils/roleMapping");
const authMiddleware = async (req, res, next) => {
    let token;
    if (req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return next(new appError_1.default("You are not logged in! Please log in to get access.", 401));
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.ACCESS_TOKEN_SECRET || "defaultsecret");
        let currentUser;
        const normalizedRole = (0, roleMapping_1.normalizeAppRole)(decoded.role);
        if (normalizedRole === "user") {
            currentUser = await doctor_repository_1.default.findById(decoded._id);
        }
        else {
            currentUser = await user_repository_1.default.findById(decoded._id);
        }
        if (!currentUser) {
            return next(new appError_1.default("The user belonging to this token does no longer exist.", 401));
        }
        currentUser.role =
            (0, roleMapping_1.normalizeAppRole)(currentUser.role) || currentUser.role;
        req.user = currentUser;
        next();
    }
    catch (error) {
        return next(new appError_1.default("Invalid token.", 401));
    }
};
exports.authMiddleware = authMiddleware;
const restrictToOnboarded = (req, res, next) => {
    next();
};
exports.restrictToOnboarded = restrictToOnboarded;
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new appError_1.default("You do not have permission to perform this action", 403));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
