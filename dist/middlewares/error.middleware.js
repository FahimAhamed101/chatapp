"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const appError_1 = __importDefault(require("../utils/appError"));
const multer_1 = require("multer");
const errorHandler = (err, req, res, next) => {
    let statusCode;
    let message;
    if (err instanceof multer_1.MulterError) {
        statusCode = 400;
        message = err.message;
    }
    else if (err instanceof appError_1.default) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else {
        statusCode = 500;
        message = "Internal Server Error";
    }
    console.error("Error:", { message: err.message, stack: err.stack });
    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message,
    });
};
exports.errorHandler = errorHandler;
