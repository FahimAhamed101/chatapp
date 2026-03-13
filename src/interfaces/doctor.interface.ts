import { Document } from "mongoose";

export interface Doctor extends Document {
  fullName?: string;
  email: string;
  password?: string;
  role: "user" | "doctor";
  createdAt?: Date;
  updatedAt?: Date;

  // Methods
  verifyPassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}
