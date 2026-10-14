import mongoose from "mongoose";

const freeTrialSettingsSchema = new mongoose.Schema(
  {
    isEnabled: {
      type: Boolean,
      default: true,
    },
    trialDays: {
      type: Number,
      default: 14,
      min: 1,
      max: 365,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const FreeTrialSettings =
  mongoose.models.FreeTrialSettings ||
  mongoose.model("FreeTrialSettings", freeTrialSettingsSchema);

export default FreeTrialSettings;
