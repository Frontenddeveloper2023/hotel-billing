import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
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
    // BRANCH ID
    // ============================================================
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BranchHotels",
      required: true,
      index: true,
    },

    // ============================================================
    // SERVICE NAME
    // ============================================================
    serviceName: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },

    // ============================================================
    // SERVICE FEES
    // ============================================================
    serviceFees: {
      type: Number,
      required: [true, "Service fee is required"],
      min: [0, "Service fee cannot be negative"],
    },

    // ============================================================
    // ENABLE / DISABLE
    // ============================================================
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// UNIQUE SERVICE PER BRANCH
// ============================================================
//
// Same hotel can have the same service in different branches.
//
// Hotel A
//   Chennai Branch → Laundry
//   Bangalore Branch → Laundry
//
// Allowed.
//
// But within the same branch:
//   Chennai Branch → Laundry
//   Chennai Branch → Laundry
//
// Not allowed.
// ============================================================

serviceSchema.index(
  {
    hotelId: 1,
    branchId: 1,
    serviceName: 1,
  },
  {
    unique: true,
  }
);

const ServiceListControle =
  mongoose.models.ServiceListControle ||
  mongoose.model("ServiceListControle", serviceSchema);

export default ServiceListControle;