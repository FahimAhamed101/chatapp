import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Doctor } from "../interfaces/doctor.interface";
import { normalizeAppRole } from "../utils/roleMapping";

const DoctorSchema = new Schema<Doctor>(
  {
    fullName: { type: String },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String },
    role: { type: String, enum: ["user", "doctor"], default: "user" },
  },
  { timestamps: true },
);

DoctorSchema.pre("save", async function (next) {
  const doctor = this as Doctor;
  if (doctor.isModified("password") && doctor.password) {
    doctor.password = await bcrypt.hash(doctor.password, 10);
  }
  next();
});

DoctorSchema.methods.verifyPassword = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

DoctorSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      role: normalizeAppRole(this.role) || this.role,
    },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" } as jwt.SignOptions,
  );
};

DoctorSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" } as jwt.SignOptions,
  );
};

const DoctorModel: Model<Doctor> = mongoose.model<Doctor>(
  "Doctor",
  DoctorSchema,
);
export default DoctorModel;
