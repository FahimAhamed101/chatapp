import Joi from "joi";

const allowedRoles = ["sender", "user", "admin", "clinic_owner", "patient", "doctor"];

export const registerSchema = Joi.object({
  role: Joi.string().valid(...allowedRoles).default("sender"),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  fullName: Joi.when("role", {
    is: Joi.string().valid("user", "doctor"),
    then: Joi.string().trim().min(2),
    otherwise: Joi.forbidden(),
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid(...allowedRoles),
});
