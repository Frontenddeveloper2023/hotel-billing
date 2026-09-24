import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    // ============================================================
    // HOTEL ID
    // ============================================================
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      required: true,
      index: true,
    },

    // ============================================================
    // BRANCH NAME
    // ============================================================
    branchName: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // BRANCH CODE
    // ============================================================
    branchCode: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================================
    // PHONE
    // ============================================================
    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================================
    // EMAIL
    // ============================================================
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    // ============================================================
    // ADDRESS
    // ============================================================
    address: {
      street: {
        type: String,
        trim: true,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        default: "",
      },

      country: {
        type: String,
        trim: true,
        default: "",
      },

      pincode: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // ============================================================
    // OTP FIELDS FOR SUB-BRANCH LOGIN
    // ============================================================
    otp: {
      type: String,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    // ============================================================
    // BRANCH STATUS
    // ============================================================
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // ============================================================
    // MAIN BRANCH FLAG
    // ============================================================
    isMainBranch: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// BRANCH CODE UNIQUE PER HOTEL
// ============================================================
//
// Hotel A → MAIN       ✅
// Hotel B → MAIN       ✅
//
// Hotel A → MAIN       ❌ duplicate
// ============================================================

branchSchema.index(
  {
    hotelId: 1,
    branchCode: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      branchCode: {
        $exists: true,
        $ne: "",
      },
    },
  }
);

// ============================================================
// MODEL
// ============================================================

const BranchHotels =
  mongoose.models.BranchHotels ||
  mongoose.model("BranchHotels", branchSchema);

export default BranchHotels;