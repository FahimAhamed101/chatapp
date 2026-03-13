import { Request, Response, NextFunction } from "express";
import AppError from "../utils/appError";
import { MulterError } from "multer";

export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode: number;
  let message: string;

  if (err instanceof MulterError) {
    statusCode = 400;
    message = err.message;
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else {
    statusCode = 500;
    message = "Internal Server Error";
  }

  console.error("Error:", { message: err.message, stack: err.stack });

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
  });
};