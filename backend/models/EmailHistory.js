import mongoose from "mongoose";

const emailHistorySchema = new mongoose.Schema(
  {
    // ==========================================================
    // TENANT IDENTIFICATION
    // ==========================================================

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      required: true,
      index: true,
    },

    // null = main hotel
    // value = specific sub-hotel / branch
    subHotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BranchHotels",
      default: null,
      index: true,
    },

    // ==========================================================
    // RECIPIENT
    // ==========================================================

    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    recipientName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    // ==========================================================
    // RELATED RECORD
    // ==========================================================

    registrationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HotelRegistration",
      default: null,
      index: true,
    },

    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
      index: true,
    },

    // ==========================================================
    // EMAIL CONTENT
    // ==========================================================

    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    message: {
      type: String,
      required: true,
      maxlength: 10000,
    },

    // ==========================================================
    // SENDER
    // ==========================================================

    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },

    // ==========================================================
    // STATUS
    // ==========================================================

    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
      default: "sent",
      index: true,
    },

    errorMessage: {
      type: String,
      maxlength: 2000,
      default: "",
    },

    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);


// ==========================================================
// INDEXES
// ==========================================================

// Quickly fetch one hotel's email history
emailHistorySchema.index({
  hotelId: 1,
  sentAt: -1,
});

// Quickly fetch one specific sub-hotel's history
emailHistorySchema.index({
  hotelId: 1,
  subHotelId: 1,
  sentAt: -1,
});

const EmailHistory =
  mongoose.models.EmailHistory ||
  mongoose.model("EmailHistory", emailHistorySchema);

export default EmailHistory;