import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
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
    // CUSTOMER NAME
    // ============================================================
    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // PHONE NUMBER
    // ============================================================
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // ALTERNATIVE PHONE
    // ============================================================
    alternativePhone: {
      type: String,
      default: "",
      trim: true,
    },

    // ============================================================
    // EMAIL
    // ============================================================
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    // ============================================================
    // ADDRESS
    // ============================================================
    address: {
      type: String,
      required: true,
      trim: true,
    },

    // ============================================================
    // ID PROOF
    // ============================================================
    idProofType: {
      type: String,
      required: true,
      trim: true,
    },

    idProofNumber: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Customer =
  mongoose.models.Customer ||
  mongoose.model("Customer", customerSchema);

export default Customer;