"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoleSchemaValues = exports.isSenderRole = exports.isUserRole = exports.normalizeChatRole = exports.normalizeAppRole = void 0;
const normalizeAppRole = (role) => {
    switch (role) {
        case "doctor":
        case "user":
            return "user";
        case "patient":
        case "sender":
            return "sender";
        case "admin":
        case "clinic_owner":
            return role;
        default:
            return undefined;
    }
};
exports.normalizeAppRole = normalizeAppRole;
const normalizeChatRole = (role) => {
    const normalizedRole = (0, exports.normalizeAppRole)(role);
    if (normalizedRole === "user" || normalizedRole === "sender") {
        return normalizedRole;
    }
    return undefined;
};
exports.normalizeChatRole = normalizeChatRole;
const isUserRole = (role) => (0, exports.normalizeChatRole)(role) === "user";
exports.isUserRole = isUserRole;
const isSenderRole = (role) => (0, exports.normalizeChatRole)(role) === "sender";
exports.isSenderRole = isSenderRole;
exports.chatRoleSchemaValues = [
    "user",
    "sender",
    "doctor",
    "patient",
];
