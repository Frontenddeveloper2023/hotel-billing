import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    // ============================================================
    // TENANT
    // ============================================================

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BranchHotels",
      required: true,
      index: true,
    },

    // ============================================================
    // COMPANY / HOTEL INFORMATION
    // ============================================================

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    gstNumber: {
      type: String,
      required: false,
      default: "",
      trim: true,
    },

    phoneNumbers: {
      type: [String],
      default: [],
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    companyLogo: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // GST SETTINGS
    // ============================================================

    gstCalculationEnabled: {
      type: Boolean,
      default: false,
    },

    gstRate: {
      type: Number,
      default: 0,
    },

    // ============================================================
    // CHECKOUT SETTINGS
    // ============================================================

    beforeCheckoutPolicyType: {
      type: String,
      default: "percentage",
    },

    beforeCheckoutValue: {
      type: Number,
      default: 0,
    },

    afterCheckoutPolicyType: {
      type: String,
      default: "full",
    },

    afterCheckoutValue: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// ONE SETTINGS DOCUMENT PER HOTEL + BRANCH
// ============================================================

settingsSchema.index(
  {
    hotelId: 1,
    branchId: 1,
  },
  {
    unique: true,
  }
);

const Settings =
  mongoose.models.Settings ||
  mongoose.model("Settings", settingsSchema);

export default Settings;