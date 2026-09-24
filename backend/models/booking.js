import mongoose from "mongoose";

// ============================================================
// BOOKED ROOM SUB-SCHEMA
// ============================================================

const bookingRoomSchema = new mongoose.Schema(
  {
    // Physical Room reference
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    // Snapshot from Room collection
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },

    roomType: {
      type: String,
      required: true,
      trim: true,
    },

    bedType: {
      type: String,
      required: true,
      trim: true,
    },

    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
    },

    adults: {
      type: Number,
      required: true,
      min: 1,
    },

    children: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ========================================================
    // STAY DATES
    // ========================================================

    checkIn: {
      type: Date,
      required: true,
    },

    checkInTime: {
      type: String,
      default: "",
      trim: true,
    },

    checkOut: {
      type: Date,
      required: true,
    },

    checkOutTime: {
      type: String,
      default: "",
      trim: true,
    },

    // ========================================================
    // ACTUAL CHECKOUT
    // ========================================================

    actualCheckoutDate: {
      type: String,
      default: "",
      trim: true,
    },

    actualCheckoutTime: {
      type: String,
      default: "",
      trim: true,
    },

    // ========================================================
    // ROOM STATUS
    // ========================================================

    checkoutStatus: {
      type: String,
      enum: [
        "Staying",
        "Overstayed",
        "Checked Out",
      ],
      default: "Staying",
    },

    // ========================================================
    // FOOD SERVICES
    // ========================================================

    foodServices: {
      type: [
        {
          foodId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Food",
            default: null,
          },

          name: {
            type: String,
            default: "",
            trim: true,
          },

          price: {
            type: Number,
            default: 0,
            min: 0,
          },

          quantity: {
            type: Number,
            default: 1,
            min: 0,
          },

          total: {
            type: Number,
            default: 0,
            min: 0,
          },

          paymentStatus: {
            type: String,
            enum: ["Pending", "Paid"],
            default: "Pending",
          },
        },
      ],
      default: [],
    },

    // ========================================================
    // ROOM SERVICES
    // ========================================================

    roomServices: {
      type: [
        {
          serviceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RoomService",
            default: null,
          },

          name: {
            type: String,
            default: "",
            trim: true,
          },

          fees: {
            type: Number,
            default: 0,
            min: 0,
          },

          quantity: {
            type: Number,
            default: 1,
            min: 0,
          },

          total: {
            type: Number,
            default: 0,
            min: 0,
          },

          paymentStatus: {
            type: String,
            enum: ["Pending", "Paid"],
            default: "Pending",
          },
        },
      ],
      default: [],
    },
  },
  {
    _id: true,
  }
);

// ============================================================
// BOOKING SCHEMA
// ============================================================

const bookingSchema = new mongoose.Schema(
  {
    // ========================================================
    // HOTEL ID
    // ========================================================

    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotels",
      required: true,
      index: true,
    },

    // ========================================================
    // BRANCH ID
    // ========================================================

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BranchHotels",
      required: true,
      index: true,
    },

    // ========================================================
    // CUSTOMER REFERENCE
    // ========================================================

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    // ========================================================
    // ROOMS BELONGING TO THIS BOOKING
    // ========================================================

    rooms: {
      type: [bookingRoomSchema],
      required: true,
      default: [],
    },

    // ========================================================
    // BOOKING LEVEL STATUS
    // ========================================================

    bookingStatus: {
      type: String,
      enum: [
        "Active",
        "Partially Checked Out",
        "Completed",
        "Cancelled",
      ],
      default: "Active",
    },

    // ========================================================
    // BOOKING PAYMENT
    // ========================================================

    initialPaidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    initialPaidVia: {
      type: String,
      default: "Cash",
      trim: true,
    },

    initialPaidUsedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ========================================================
    // PAYMENT HISTORY
    // ========================================================

    payments: {
      type: [
        {
          amount: {
            type: Number,
            required: true,
            min: 0,
          },

          paymentType: {
            type: String,
            enum: [
              "Initial",
              "Checkout",
              "Service",
              "Other",
            ],
            default: "Checkout",
          },

          paymentVia: {
            type: String,
            default: "Cash",
            trim: true,
          },

          paidAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    // ========================================================
    // BOOKING TOTALS
    // ========================================================

    financials: {
      roomTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      foodTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      roomServiceTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      extraChargeTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      gstAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      grandTotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalPaid: {
        type: Number,
        default: 0,
        min: 0,
      },

      balanceDue: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

bookingSchema.index({
  hotelId: 1,
  branchId: 1,
});

bookingSchema.index({
  hotelId: 1,
  branchId: 1,
  customerId: 1,
});

bookingSchema.index({
  createdAt: -1,
});

// ============================================================
// MODEL
// ============================================================

const Booking =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

export default Booking;