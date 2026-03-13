"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const appError_1 = __importDefault(require("../utils/appError"));
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return next(new appError_1.default(error.details[0].message, 400));
    }
    next();
};
exports.validate = validate;
