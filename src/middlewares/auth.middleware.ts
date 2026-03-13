import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import AppError from "../utils/appError";
import UserRepository from "../repositories/user.repository";
import DoctorRepository from "../repositories/doctor.repository";
import { normalizeAppRole } from "../utils/roleMapping";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401),
    );
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || "defaultsecret",
    ) as any;

    let currentUser;
    const normalizedRole = normalizeAppRole(decoded.role);
    if (normalizedRole === "user") {
      currentUser = await DoctorRepository.findById(decoded._id);
    } else {
      currentUser = await UserRepository.findById(decoded._id);
    }

    if (!currentUser) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist.",
          401,
        ),
      );
    }

    (currentUser as any).role =
      normalizeAppRole((currentUser as any).role) || (currentUser as any).role;
    (req as any).user = currentUser;
    next();
  } catch (error) {
    return next(new AppError("Invalid token.", 401));
  }
};

export const restrictToOnboarded = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  next();
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes((req as any).user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403),
      );
    }
    next();
  };
};

