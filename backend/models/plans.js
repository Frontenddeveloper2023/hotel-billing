import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    // ============================================================
    // PLAN NAME
    // ============================================================
    planName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    // ============================================================
    // DESCRIPTION
    // ============================================================
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================================
    // PRICING
    // ============================================================
    pricing: {
      monthly: {
        type: Number,
        default: 0,
        min: 0,
      },

      quarterly: {
        type: Number,
        default: 0,
        min: 0,
      },

      halfYearly: {
        type: Number,
        default: 0,
        min: 0,
      },

      yearly: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // ============================================================
    // TRIAL
    // ============================================================
    trialDays: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================================
    // SETUP FEE
    // ============================================================
    setupFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================================
    // PLAN LIMITS
    // ============================================================
    limits: {
      rooms: {
        type: Number,
        default: 0,
        min: 0,
      },

      branches: {
        type: Number,
        default: 0,
        min: 0,
      },

      receptionists: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // ============================================================
    // PLAN FEATURES
    // ============================================================
    features: {
      foodService: {
        type: Boolean,
        default: false,
      },

      roomService: {
        type: Boolean,
        default: false,
      },
    },

    // ============================================================
    // VALIDITY
    // ============================================================
    validityDays: {
      type: Number,
      default: 30,
      min: 1,
    },

    // ============================================================
    // AUTO RENEWAL
    // ============================================================
    autoRenewalAllowed: {
      type: Boolean,
      default: true,
    },

    // ============================================================
    // PLAN ACTIVE / INACTIVE
    // ============================================================
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Plans =
  mongoose.models.Plans ||
  mongoose.model("Plans", planSchema);

export default Plans;