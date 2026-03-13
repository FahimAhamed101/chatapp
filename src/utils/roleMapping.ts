export type ChatRole = "user" | "sender";
export type AppRole = ChatRole | "admin" | "clinic_owner";
export type SupportedRole =
  | AppRole
  | "doctor"
  | "patient";

export const normalizeAppRole = (role?: string): AppRole | undefined => {
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

export const normalizeChatRole = (role?: string): ChatRole | undefined => {
  const normalizedRole = normalizeAppRole(role);
  if (normalizedRole === "user" || normalizedRole === "sender") {
    return normalizedRole;
  }
  return undefined;
};

export const isUserRole = (role?: string) => normalizeChatRole(role) === "user";

export const isSenderRole = (role?: string) =>
  normalizeChatRole(role) === "sender";

export const chatRoleSchemaValues = [
  "user",
  "sender",
  "doctor",
  "patient",
];
