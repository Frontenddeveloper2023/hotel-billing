import mongoose from "mongoose";

const hotelRegistrationSchema = new mongoose.Schema(
  {
    // ==========================================
    // HOTEL DETAILS
    // ==========================================
    hotelName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

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

    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },

    taxEnabled: {
      type: Boolean,
      default: false,
    },


    // ==========================================
    // SELECTED PLAN
    // ==========================================
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plans",
      required: true,
    },

    billingCycle: {
      type: String,
      enum: [
        "monthly",
        "quarterly",
        "halfYearly",
        "yearly",
        "custom",
      ],
      required: true,
    },


    // ==========================================
    // APPLICATION STATUS
    // ==========================================
    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
      ],
      default: "pending",
      index: true,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },


    // ==========================================
    // PAYMENT STATUS
    // ==========================================
    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_paid",
      ],
      default: "pending",
    },

    paymentTransactionId: {
      type: String,
      trim: true,
      default: "",
    },


    // ==========================================
    // CREATED RECORD REFERENCES
    // ==========================================
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      default: null,
    },

    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },


    // ==========================================
    // ADMIN APPROVAL DETAILS
    // ==========================================
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const saasHotelRegistration = mongoose.model(
  "HotelRegistration",
  hotelRegistrationSchema
);

export default saasHotelRegistration;