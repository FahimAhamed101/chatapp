"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const auth_controller_1 = __importDefault(require("../controllers/auth.controller"));
const validate_middleware_1 = require("../middlewares/validate.middleware");
const auth_validator_1 = require("../validators/auth.validator");
exports.authRoutes = (0, express_1.Router)();
exports.authRoutes.post("/register", (0, validate_middleware_1.validate)(auth_validator_1.registerSchema), auth_controller_1.default.register);
exports.authRoutes.post("/login", (0, validate_middleware_1.validate)(auth_validator_1.loginSchema), auth_controller_1.default.login);
