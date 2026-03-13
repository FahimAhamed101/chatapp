"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const doctor_model_1 = __importDefault(require("../models/doctor.model"));
class DoctorRepository {
    static async findById(id) {
        return await doctor_model_1.default.findById(id);
    }
}
exports.default = DoctorRepository;
