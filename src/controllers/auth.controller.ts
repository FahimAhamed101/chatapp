import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError";
import UserModel from "../models/user.model";
import DoctorModel from "../models/doctor.model";
import { normalizeAppRole } from "../utils/roleMapping";

const sanitizeRoleBasedUser = (record: any) => {
  const sanitized = record.toObject ? record.toObject() : { ...record };
  delete sanitized.password;
  delete sanitized.passwordResetToken;
  delete sanitized.passwordResetExpires;
  sanitized.role = normalizeAppRole(sanitized.role) || sanitized.role;
  return sanitized;
};

export default class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        email,
        password,
        role = "sender",
        fullName,
      } = req.body;
      const normalizedRole = normalizeAppRole(role) || "sender";

      const [existingSender, existingUser] = await Promise.all([
        UserModel.findOne({ email }),
        DoctorModel.findOne({ email }),
      ]);
      if (existingSender || existingUser) {
        return next(new AppError("Email already in use.", 400));
      }

      if (normalizedRole === "user") {
        const userPayload: any = {
          email,
          password,
          role: "user",
        };
        if (fullName) userPayload.fullName = fullName;

        const userRecord = await DoctorModel.create(userPayload);

        const accessToken = userRecord.generateAccessToken();
        const refreshToken = userRecord.generateRefreshToken();

        return res.status(201).json({
          user: sanitizeRoleBasedUser(userRecord),
          accessToken,
          refreshToken,
        });
      }

      const user = await UserModel.create({
        email,
        password,
        authProvider: "local",
        role: normalizedRole,
      } as any);

      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      return res.status(201).json({
        user: user.toJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, role } = req.body;
      const normalizedRole = normalizeAppRole(role) || "sender";

      if (normalizedRole === "user") {
        const userRecord = await DoctorModel.findOne({ email });
        if (!userRecord || !(await userRecord.verifyPassword(password))) {
          return next(new AppError("Invalid email or password.", 401));
        }

        const accessToken = userRecord.generateAccessToken();
        const refreshToken = userRecord.generateRefreshToken();

        return res.json({
          user: sanitizeRoleBasedUser(userRecord),
          accessToken,
          refreshToken,
        });
      }

      const user = await UserModel.findOne({ email });
      if (!user || !(await user.verifyPassword(password))) {
        return next(new AppError("Invalid email or password.", 401));
      }

      const accessToken = user.generateAccessToken();
      const refreshToken = user.generateRefreshToken();

      return res.json({
        user: user.toJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      next(error);
    }
  }
}
