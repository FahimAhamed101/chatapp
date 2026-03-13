import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import { validate } from "../middlewares/validate.middleware";
import { registerSchema, loginSchema } from "../validators/auth.validator";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), AuthController.register);
authRoutes.post("/login", validate(loginSchema), AuthController.login);
