import { Document, Types } from "mongoose";

// -------- Personal Info --------
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface DriversLicense {
  licenseNumber: string;
  frontImage: string;
  backImage: string;
}

export interface PersonalInfo {
  fullName: {
    first: string;
    middle?: string;
    last: string;
  };
  dob: Date;
  sex: "Male" | "Female" | "Other";
  maritalStatus: string;
  bloodGroup?: string;
  numberOfChildren?: number;
  email: string;
  phone: string;
  address: Address;
  employer?: string;
  driversLicense: DriversLicense;
  last4SSN: string;
  profilePicture?: string;
}

// -------- Medical Info --------
export interface Allergy {
  name: string;
  severity: "Mild" | "Moderate" | "Severe";
}

export interface Medication {
  name: string;
  dosage: string;
  reminderTime: string[];
  notify: boolean;
}

export interface MedicalInfo {
  allergies: Allergy[];
  medications: Medication[];
  existingConditions: { name: string; diagnosedDate: Date }[];
  lifestyleFactors: { type: string; status: string; details?: string }[];
}

// -------- Insurance Info --------
export interface InsuranceSubscriber {
  firstName: string;
  middleName?: string;
  lastName: string;
  dob: Date;
  sex: "Male" | "Female" | "Other";
  employerName?: string;
  address: Address;
  phone?: string;
}

export interface InsuranceInfo {
  insuranceName: string;
  contractId: string;
  groupNumber: string;
  expirationDate: Date;
  patientRelationship: "Self" | "Spouse" | "Child" | "Other";
  claimForm?: {
    box1InsuranceType?: string;
    box1aInsuredIdNumber?: string;
    box4InsuredName?: {
      first?: string;
      middle?: string;
      last?: string;
    };
    box6PatientRelationshipToInsured?: string;
    box7InsuredAddress?: {
      streetAddress?: string;
      city?: string;
      state?: string;
      zip?: string;
      phone?: string;
    };
    box9OtherInsuredName?: {
      first?: string;
      middle?: string;
      last?: string;
    };
    box9bDob?: Date;
    box9bSex?: "Male" | "Female" | "Other";
    box9aPolicyOrGroupNumber?: string;
    box9dPlanName?: string;
    box11PolicyGroupOrFeca?: string;
    box11aDob?: Date;
    box11aSex?: "Male" | "Female" | "Other";
    box11bOtherClaimId?: string;
    box11cPlanName?: string;
    box11dHasAnotherPlan?: boolean;
    box12Signature?: string;
    box12Date?: Date;
    box13Signature?: string;
  };
  subscriber: InsuranceSubscriber;
  insuranceCard: string;
  digitalSignature: string;
}

// -------- Note --------
export interface Note {
  doctorId: Types.ObjectId;
  note: string;
  createdAt: Date;
}

// -------- User --------
export interface User extends Document {
  googleId?: string;
  email: string;
  password?: string;
  authProvider: string;
  isVerified: boolean;
  verificationOtp?: string;
  verificationOtpExpires?: Date;
  personalInfo: PersonalInfo;
  medicalInfo: MedicalInfo;
  insuranceInfo: InsuranceInfo[];
  notes: Note[];
  onboardingStep: number;
  clinicId?: Types.ObjectId;
  role: "sender" | "patient" | "admin" | "clinic_owner";
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  favoriteDoctors?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;

  // Methods
  verifyPassword(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}
