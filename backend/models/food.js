import mongoose from "mongoose";

const foodSchema = new mongoose.Schema(
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
    // FOOD NAME
    // ============================================================
    foodName: {
      type: String,
      required: [true, "Food name is required."],
      trim: true,
    },

    // ============================================================
    // DESCRIPTION
    // ============================================================
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================================
    // FOOD PRICE
    // ============================================================
    foodPrice: {
      type: Number,
      required: [true, "Food price is required."],
      min: [0, "Price cannot be negative."],
    },

    // ============================================================
    // FOOD IMAGE
    // ============================================================
    foodImage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// PREVENT DUPLICATE FOOD NAME INSIDE SAME BRANCH
// ============================================================
//
// Chennai Branch → Chicken Biryani ✅
// Bangalore Branch → Chicken Biryani ✅
//
// Chennai Branch → Chicken Biryani again ❌
// ============================================================

foodSchema.index(
  {
    hotelId: 1,
    branchId: 1,
    foodName: 1,
  },
  {
    unique: true,
  }
);

const Food =
  mongoose.models.Food ||
  mongoose.model("Food", foodSchema);

export default Food;