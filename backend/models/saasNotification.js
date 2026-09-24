import mongoose from "mongoose";

const saasNotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "payment_submitted",
        "registration_submitted",
        "payment_verified",
        "registration_approved",
        "registration_rejected",
      ],
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HotelRegistration",
      default: null,
      index: true,
    },

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      default: null,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// PREVENT OverwriteModelError
// ============================================================

const SaasNotification =
  mongoose.models.SaasNotification ||
  mongoose.model(
    "SaasNotification",
    saasNotificationSchema
  );

export default SaasNotification;