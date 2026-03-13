import { Request, Response, NextFunction } from "express";
import { Schema } from "joi";
import AppError from "../utils/appError";

export const validate =
  (schema: Schema) => (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    next();
  };
