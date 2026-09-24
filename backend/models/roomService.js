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
    // CUSTOMER
    // ============================================================
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    // ============================================================
    // ROOM NUMBER
    // ============================================================
    roomNumber: {
      type: String,
      required: [true, "Room number is required."],
      trim: true,
      index: true,
    },

    // ============================================================
    // SERVICE DETAILS
    // ============================================================
    serviceName: {
      type: String,
      required: true,
      trim: true,
    },

    serviceFees: {
      type: Number,
      required: true,
      min: 0,
    },

    // ============================================================
    // PAYMENT STATUS
    // ============================================================
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },

    // ============================================================
    // SERVICE DATE
    // ============================================================
    serviceDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const RoomService =
  mongoose.models.RoomService ||
  mongoose.model("RoomService", serviceSchema);

export default RoomService;