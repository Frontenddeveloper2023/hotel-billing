import mongoose from "mongoose";

const registrationOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    otp: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// TTL index to automatically clean up expired documents after 15 minutes
registrationOtpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 900 });

export default mongoose.model("RegistrationOTP", registrationOtpSchema);
