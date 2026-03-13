"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_model_1 = __importDefault(require("../models/user.model"));
class UserRepository {
    /**
     * @description Find all users
     * @returns {Promise<User[]>}
     */
    static async findAll() {
        return await user_model_1.default.find({}).select("-password");
    }
    /**
     * @description Find user by email
     * @param {string} email
     * @returns {Promise<User | null>}
     */
    static async findByEmail(email) {
        return await user_model_1.default.findOne({ email });
    }
    /**
     * @description Find user by Google ID
     * @param {string} googleId
     * @returns {Promise<User | null>}
     */
    static async findByGoogleId(googleId) {
        return await user_model_1.default.findOne({ googleId });
    }
    /**
     * @description Find user by password reset token
     * @param {string} token
     * @returns {Promise<User | null>}
     */
    static async findByPasswordResetToken(token) {
        return await user_model_1.default.findOne({ passwordResetToken: token });
    }
    /**
     * @description Find user by ID
     * @param {string} id
     * @returns {Promise<User | null>}
     */
    static findById(id) {
        return user_model_1.default.findById(id);
    }
    /**
     * @description Create a new user
     * @param {User} userData
     * @returns {Promise<User>}
     */
    static async createUser(userData) {
        const user = await user_model_1.default.create(userData);
        return user;
    }
    static async favoriteDoctor(userId, doctorId) {
        return await user_model_1.default.findByIdAndUpdate(userId, { $addToSet: { favoriteDoctors: doctorId } }, { new: true });
    }
    static async getFavoriteDoctors(userId, page, limit) {
        const skip = (page - 1) * limit;
        const user = await user_model_1.default.findById(userId)
            .populate({
            path: "favoriteDoctors",
            options: {
                skip,
                limit,
            },
        })
            .select("favoriteDoctors");
        return user ? user.favoriteDoctors : null;
    }
    static async addNoteToPatient(patientId, noteData) {
        return await user_model_1.default.findByIdAndUpdate(patientId, { $push: { notes: noteData } }, { new: true });
    }
    /**
     * @description Get medications for a user by ID
     * @param {string} userId
     * @returns {Promise<User | null>}
     */
    static async getMedicationsByUserId(userId) {
        return (await user_model_1.default.findById(userId)
            .select("medicalInfo.medications")
            .lean());
    }
    /**
     * @description Add a medication to a user's medical info
     * @param {string} userId
     * @param {Medication} medication
     * @returns {Promise<User | null>}
     */
    static async addMedication(userId, medication) {
        return await user_model_1.default.findByIdAndUpdate(userId, { $push: { "medicalInfo.medications": medication } }, { new: true });
    }
    /**
     * @description Find users by medication reminder time
     * @param {string} time
     * @returns {Promise<User[]>}
     */
    static async findUsersByMedicationTime(time) {
        return (await user_model_1.default.find({
            "medicalInfo.medications.reminderTime": time,
        }).lean());
    }
    static async toggleMedicationNotification(userId, medicationId) {
        const user = await user_model_1.default.findById(userId).select("medicalInfo.medications");
        if (!user) {
            throw new Error("User not found");
        }
        const updatedUser = await user_model_1.default.findOneAndUpdate({ _id: userId, "medicalInfo.medications._id": medicationId }, [
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
                                            new mongoose_1.default.Types.ObjectId(medicationId),
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
        ], { new: true });
        return updatedUser;
    }
    /**
     * @description Query users with filtering
     * @param {Object} filters - Filter criteria with regex support
     * @param {number} page - Page number for pagination
     * @param {number} limit - Items per page
     * @returns {Promise<{users: User[], total: number, page: number, limit: number}>}
     */
    static async queryUsers(filters, page, limit) {
        const skip = (page - 1) * limit;
        const query = {};
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
                }
                else {
                    query[key] = filters[key];
                }
            }
        });
        const [users, total] = await Promise.all([
            user_model_1.default.find(query)
                .select("-password")
                .skip(skip)
                .limit(limit)
                .lean(),
            user_model_1.default.countDocuments(query),
        ]);
        return {
            users: users,
            total,
            page,
            limit,
        };
    }
    static async getAllPatientsWithStats(page, limit) {
        const skip = (page - 1) * limit;
        const pipeline = [
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
        const result = await user_model_1.default.aggregate(pipeline);
        return result[0];
    }
}
exports.default = UserRepository;
