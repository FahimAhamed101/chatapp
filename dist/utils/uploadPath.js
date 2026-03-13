"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUploadPath = void 0;
const path_1 = __importDefault(require("path"));
const toUploadPath = (filePath) => {
    if (!filePath)
        return filePath;
    const normalized = filePath.replace(/\\/g, "/");
    const lower = normalized.toLowerCase();
    if (lower.startsWith("uploads/")) {
        return normalized;
    }
    const uploadsIndex = lower.lastIndexOf("/uploads/");
    if (uploadsIndex !== -1) {
        return normalized.slice(uploadsIndex + 1);
    }
    const rel = path_1.default.relative(process.cwd(), filePath).replace(/\\/g, "/");
    if (rel.startsWith("uploads/")) {
        return rel;
    }
    return `uploads/${path_1.default.basename(filePath)}`;
};
exports.toUploadPath = toUploadPath;
