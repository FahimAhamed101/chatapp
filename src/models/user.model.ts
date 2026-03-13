import mongoose, { Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  User,
  Address,
  PersonalInfo,

} from "../interfaces/user.interface";
import { normalizeAppRole } from "../utils/roleMapping";

// -------- Schemas --------

const AddressSchema = new Schema<Address>({
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zip: { type: String, required: true },
});

const PersonalInfoSchema = new Schema<PersonalInfo>({
  fullName: {
    first: { type: String, required: true },
    middle: { type: String },
    last: { type: String, required: true },
  },
  dob: { type: Date, required: true },
  sex: { type: String, enum: ["Male", "Female", "Other"], required: true },
  maritalStatus: {
    type: String,
    enum: ["Single", "Married", "Divorced", "Windowed", "Separated", "Unknown"],
    required: true,
  },
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },
  numberOfChildren: { type: Number },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: AddressSchema, required: true },
  employer: { type: String },
 

  profilePicture: { type: String },
});







const UserSchema = new Schema<User>(
  {
    googleId: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, required: true, index: true },
    password: { type: String },
    authProvider: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationOtp: { type: String },
    verificationOtpExpires: { type: Date },
    personalInfo: { type: PersonalInfoSchema },

   
  
 
 
    role: {
      type: String,
      enum: ["sender", "patient", "admin", "clinic_owner"],
      default: "sender",
      index: true,
    },
    passwordResetToken: { type: String, index: true },
    passwordResetExpires: { type: Date },
    favoriteDoctors: [{ type: Schema.Types.ObjectId, ref: "Doctor" }],
  },
  { timestamps: true },
);

UserSchema.index({ "medicalInfo.medications.reminderTime": 1 });
UserSchema.index({ clinicId: 1, email: 1 }, { unique: true });

UserSchema.pre("save", async function (next) {
  const user = this as User;
  if (!user.isModified("password") || !user.password) return next();
  user.password = await bcrypt.hash(user.password, 10);
  next();
});

UserSchema.methods.verifyPassword = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function (): string {
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

UserSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  } as jwt.SignOptions);
};

UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordResetToken;
  delete userObject.passwordResetExpires;
  delete userObject.verificationOtp;
  delete userObject.verificationOtpExpires;
  userObject.role = normalizeAppRole(userObject.role) || userObject.role;
  return userObject;
};

const UserModel: Model<User> = mongoose.model<User>("User", UserSchema);
export default UserModel;
