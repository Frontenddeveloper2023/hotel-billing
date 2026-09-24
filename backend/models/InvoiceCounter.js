import mongoose from "mongoose";

const invoiceCounterSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BranchHotels",
      required: true,
      index: true,
    },

    year: {
      type: Number,
      required: true,
      index: true,
    },

    sequence: {
      type: Number,
      default: 0,
      min: 0,
    },
  },

  { timestamps: true }
);

invoiceCounterSchema.index(
  {
    hotelId: 1,
    branchId: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

const InvoiceCounter =
  mongoose.models.InvoiceCounter ||
  mongoose.model("InvoiceCounter", invoiceCounterSchema);

export default InvoiceCounter;