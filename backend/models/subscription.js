import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      required: true,
      index: true,
    },

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

    startDate: {
  type: Date,
  required: true,
},

endDate: {
  type: Date,
  required: true,
},

expiryReminder7DaysSentAt: {
  type: Date,
  default: null,
},

expiryReminder1DaySentAt: {
  type: Date,
  default: null,
},

expiryNotificationSentAt: {
  type: Date,
  default: null,
},

status: {
  type: String,
  enum: [
    "trial",
    "active",
    "expiring_soon",
    "expired",
    "suspended",
    "cancelled",
    "payment_failed",
    "grace_period",
  ],
  default: "active",
  index: true,
},

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

    autoRenewal: {
      type: Boolean,
      default: false,
    },

    trialStatus: {
      type: String,
      enum: [
        "not_started",
        "active",
        "completed",
        "cancelled",
      ],
      default: "not_started",
    },

    customDurationDays: {
      type: Number,
      default: null,
      min: 1,
    },

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

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    finalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentTransactionId: {
      type: String,
      trim: true,
      default: "",
    },

    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


const Subscription =
  mongoose.models.Subscription ||
  mongoose.model("Subscription", subscriptionSchema);

export default Subscription;