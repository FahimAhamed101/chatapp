import mongoose from "mongoose";
import { Doctor } from "../interfaces/doctor.interface";
import { User, Note } from "../interfaces/user.interface";
import UserModel from "../models/user.model";

export default class UserRepository {
  /**
   * @description Find all users
   * @returns {Promise<User[]>}
   */
  static async findAll(): Promise<User[]> {
    return await UserModel.find({}).select("-password");
  }

  /**
   * @description Find user by email
   * @param {string} email
   * @returns {Promise<User | null>}
   */
  static async findByEmail(email: string): Promise<User | null> {
    return await UserModel.findOne({ email });
  }

  /**
   * @description Find user by Google ID
   * @param {string} googleId
   * @returns {Promise<User | null>}
   */
  static async findByGoogleId(googleId: string): Promise<User | null> {
    return await UserModel.findOne({ googleId });
  }

  /**
   * @description Find user by password reset token
   * @param {string} token
   * @returns {Promise<User | null>}
   */
  static async findByPasswordResetToken(token: string): Promise<User | null> {
    return await UserModel.findOne({ passwordResetToken: token });
  }

  /**
   * @description Find user by ID
   * @param {string} id
   * @returns {Promise<User | null>}
   */
  static findById(id: string): any {
    return UserModel.findById(id);
  }

  /**
   * @description Create a new user
   * @param {User} userData
   * @returns {Promise<User>}
   */
  static async createUser(userData: User): Promise<User> {
    const user = await UserModel.create(userData);
    return user;
  }

  static async favoriteDoctor(
    userId: string,
    doctorId: string,
  ): Promise<User | null> {
    return await UserModel.findByIdAndUpdate(
      userId,
      { $addToSet: { favoriteDoctors: doctorId } },
      { new: true },
    );
  }

  static async getFavoriteDoctors(
    userId: string,
    page: number,
    limit: number,
  ): Promise<Doctor[] | null> {
    const skip = (page - 1) * limit;
    const user = await UserModel.findById(userId)
      .populate({
        path: "favoriteDoctors",
        options: {
          skip,
          limit,
        },
      })
      .select("favoriteDoctors");

    return user ? (user.favoriteDoctors as unknown as Doctor[]) : null;
  }

  static async addNoteToPatient(
    patientId: string,
    noteData: { doctorId: string; note: string },
  ): Promise<User | null> {
    return await UserModel.findByIdAndUpdate(
      patientId,
      { $push: { notes: noteData } },
      { new: true },
    );
  }

  /**
   * @description Get medications for a user by ID
   * @param {string} userId
   * @returns {Promise<User | null>}
   */
  static async getMedicationsByUserId(userId: string): Promise<User | null> {
    return (await UserModel.findById(userId)
      .select("medicalInfo.medications")
      .lean()) as unknown as User | null;
  }

  /**
   * @description Add a medication to a user's medical info
   * @param {string} userId
   * @param {Medication} medication
   * @returns {Promise<User | null>}
   */
  static async addMedication(
    userId: string,
    medication: any,
  ): Promise<User | null> {
    return await UserModel.findByIdAndUpdate(
      userId,
      { $push: { "medicalInfo.medications": medication } },
      { new: true },
    );
  }

  /**
   * @description Find users by medication reminder time
   * @param {string} time
   * @returns {Promise<User[]>}
   */
  static async findUsersByMedicationTime(time: string): Promise<User[]> {
    return (await UserModel.find({
      "medicalInfo.medications.reminderTime": time,
    }).lean()) as unknown as User[];
  }

  static async toggleMedicationNotification(
    userId: string,
    medicationId: string,
  ): Promise<User | null> {
    const user = await UserModel.findById(userId).select(
      "medicalInfo.medications",
    );
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, "medicalInfo.medications._id": medicationId },
      [
        {
          $set: {
            "medicalInfo.medications": {
              $map: {
                input: "$medicalInfo.medications",
                as: "med",
                in: {
                  $cond: [
                    {
                      $eq: [
                        "$$med._id",
                        new mongoose.Types.ObjectId(medicationId),
                      ],
                    },
                    {
                      $mergeObjects: [
                        "$$med",
                        { notify: { $not: "$$med.notify" } },
                      ],
                    },
                    "$$med",
                  ],
                },
              },
            },
          },
        },
      ],
      { new: true },
    );

    return updatedUser;
  }

  /**
   * @description Query users with filtering
   * @param {Object} filters - Filter criteria with regex support
   * @param {number} page - Page number for pagination
   * @param {number} limit - Items per page
   * @returns {Promise<{users: User[], total: number, page: number, limit: number}>}
   */
  static async queryUsers(
    filters: {
      search?: string;
      email?: string;
      role?: string;
      isVerified?: boolean;
      [key: string]: any;
    },
    page: number,
    limit: number,
  ): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const query: any = {};

    // Build regex filters for text search
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$or = [
        { "fullName.first": searchRegex },
        { "fullName.last": searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Add other specific filters
    if (filters.email) {
      query.email = new RegExp(filters.email, "i");
    }

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.isVerified !== undefined) {
      query.isVerified = filters.isVerified;
    }

    // Add any additional filters passed
    Object.keys(filters).forEach((key) => {
      if (!["search", "email", "role", "isVerified"].includes(key) && filters[key] !== undefined) {
        if (typeof filters[key] === "string" && filters[key].length > 0) {
          query[key] = new RegExp(filters[key], "i");
        } else {
          query[key] = filters[key];
        }
      }
    });

    const [users, total] = await Promise.all([
      UserModel.find(query)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(query),
    ]);

    return {
      users: users as unknown as User[],
      total,
      page,
      limit,
    };
  }

  static async getAllPatientsWithStats(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: { role: { $in: ["patient", "sender"] } } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "appointments",
          let: { patientId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$patientId", "$$patientId"] } } },
            { $sort: { dateTime: -1 } },
            {
              $group: {
                _id: null,
                lastVisit: { $first: "$dateTime" },
                lastStatus: { $first: "$status" },
                lastVisitType: { $first: "$visitType" },
                totalAppointments: { $sum: 1 },
                completedAppointments: {
                  $sum: {
                    $cond: [
                      { $eq: [{ $toLower: "$status" }, "completed"] },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: "appointmentStats",
        },
      },
      {
        $unwind: {
          path: "$appointmentStats",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "clinics",
          localField: "clinicId",
          foreignField: "_id",
          as: "clinicInfo",
        },
      },
      {
        $unwind: {
          path: "$clinicInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          id: "$_id",
          patientId: "$_id",
          patientName: {
            $ifNull: [
              {
                $concat: [
                  "$personalInfo.fullName.first",
                  " ",
                  "$personalInfo.fullName.last",
                ],
              },
              { $arrayElemAt: [{ $split: ["$email", "@"] }, 0] },
            ],
          },
          contact: "$personalInfo.phone",
          contactEmail: { $ifNull: ["$personalInfo.email", "$email"] },
          contactPhone: "$personalInfo.phone",
          gender: "$personalInfo.sex",
          clinicName: "$clinicInfo.name",
          engagement: {
            $cond: [
              {
                $gt: [
                  { $ifNull: ["$appointmentStats.totalAppointments", 0] },
                  0,
                ],
              },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          "$appointmentStats.completedAppointments",
                          "$appointmentStats.totalAppointments",
                        ],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
              0,
            ],
          },
          lastVisit: "$appointmentStats.lastVisit",
          status: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      { $toLower: "$appointmentStats.lastStatus" },
                      "completed",
                    ],
                  },
                  then: "Recovered",
                },
                {
                  case: {
                    $eq: [
                      { $toLower: "$appointmentStats.lastStatus" },
                      "booked",
                    ],
                  },
                  then: "In Care",
                },
                {
                  case: {
                    $eq: [
                      { $toLower: "$appointmentStats.lastStatus" },
                      "cancelled",
                    ],
                  },
                  then: "Cancelled",
                },
              ],
              default: "N/A",
            },
          },
          lastStatus: "$appointmentStats.lastStatus",
          visitType: "$appointmentStats.lastVisitType",
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await UserModel.aggregate(pipeline);
    return result[0];
  }
}
