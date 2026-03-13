import path from "path";

export const toUploadPath = (filePath: string): string => {
  if (!filePath) return filePath;

  const normalized = filePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();

  if (lower.startsWith("uploads/")) {
    return normalized;
  }

  const uploadsIndex = lower.lastIndexOf("/uploads/");
  if (uploadsIndex !== -1) {
    return normalized.slice(uploadsIndex + 1);
  }

  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  if (rel.startsWith("uploads/")) {
    return rel;
  }

  return `uploads/${path.basename(filePath)}`;
};
