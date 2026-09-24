import mongoose from "mongoose";

const foodServiceSchema = new mongoose.Schema(
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
      required: [true, "Customer ID is required."],
      index: true,
    },

    // ============================================================
    // ROOM
    // ============================================================
    roomNumber: {
      type: String,
      required: [true, "Room number is required."],
      trim: true,
      index: true,
    },

    // ============================================================
    // FOOD MASTER RECORD
    // ============================================================
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Food",
      required: [true, "Food ID is required."],
    },

    foodName: {
      type: String,
      required: [true, "Food name is required."],
      trim: true,
    },

    foodPrice: {
      type: Number,
      required: [true, "Food price is required."],
      min: [0, "Price cannot be negative."],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required."],
      min: [1, "Quantity must be at least 1."],
      default: 1,
    },

    totalPrice: {
      type: Number,
      required: [true, "Total price is required."],
      min: [0, "Total price cannot be negative."],
    },

    // ============================================================
    // PAYMENT STATUS
    // ============================================================
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

const FoodService =
  mongoose.models.FoodService ||
  mongoose.model("FoodService", foodServiceSchema);

export default FoodService;