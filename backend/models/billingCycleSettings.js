import mongoose from "mongoose";

const billingCycleSettingsSchema = new mongoose.Schema(
  {
    monthly: {
      type: Boolean,
      default: true,
    },
    quarterly: {
      type: Boolean,
      default: true,
    },
    halfYearly: {
      type: Boolean,
      default: true,
    },
    yearly: {
      type: Boolean,
      default: true,
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

const BillingCycleSettings =
  mongoose.models.BillingCycleSettings ||
  mongoose.model("BillingCycleSettings", billingCycleSettingsSchema);

export default BillingCycleSettings;
