import { Doctor } from "../interfaces/doctor.interface";
import DoctorModel from "../models/doctor.model";

export default class DoctorRepository {
  static async findById(id: string): Promise<Doctor | null> {
    return await DoctorModel.findById(id);
  }
}
