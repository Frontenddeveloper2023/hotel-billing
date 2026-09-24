import mongoose from "mongoose";

const checkoutBillSchema = new mongoose.Schema(
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
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer reference is required."],
      index: true,
    },


    

    // ============================================================
    // EXTRA CHARGES
    // ============================================================
    extraCharges: [
      {
        name: {
          type: String,
          required: [true, "Extra charge name is required."],
          trim: true,
        },

        fees: {
          type: Number,
          required: [true, "Fees amount is required."],
          min: [0, "Fees cannot be negative."],
        },
      },
    ],

    // ============================================================
    // ROOM EXTRA STAY
    // ============================================================
    roomExtraStay: {
      // ----------------------------------------------------------
      // EXTRA TIME STAY
      // ----------------------------------------------------------
      extraTimeStay: {
        // Before 12 PM
        before12PM: {
          type: {
            type: String,
            enum: ["percentage", "fixed", "full"],
            default: "percentage",
          },

          amount: {
            type: Number,
            default: 0,
            min: 0,
          },
        },

        // After 12 PM
        after12PM: {
          type: {
            type: String,
            enum: ["percentage", "fixed", "full"],
            default: "percentage",
          },

          amount: {
            type: Number,
            default: 0,
            min: 0,
          },
        },
      },

      // ----------------------------------------------------------
      // EXTRA DAY STAY
      // ----------------------------------------------------------
      extraDayStay: {
        numberOfDays: {
          type: Number,
          default: 0,
          min: 0,
        },

        amount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    },

    // ============================================================
    // ROOM BILLING
    // SERVER CALCULATED VALUES
    // ============================================================
    roomBilling: {
      // ----------------------------------------------------------
      // NORMAL NIGHTS
      // ----------------------------------------------------------
      nights: {
        type: Number,
        default: 0,
        min: 0,
      },

      // ----------------------------------------------------------
      // ROOM SUBTOTAL
      // ----------------------------------------------------------
      roomSubtotal: {
        type: Number,
        default: 0,
        min: 0,
      },

      // ----------------------------------------------------------
      // CHECKOUT POLICY
      // ----------------------------------------------------------
      checkoutPolicy: {
        type: {
          type: String,
          enum: ["before12PM", "after12PM", "none"],
          default: "none",
        },

        policyType: {
          type: String,
          enum: ["percentage", "fixed", "full"],
          default: "fixed",
        },

        policyValue: {
          type: Number,
          default: 0,
          min: 0,
        },

        amount: {
          type: Number,
          default: 0,
          min: 0,
        },
      },

      // ----------------------------------------------------------
      // EXPECTED CHECKOUT DATE
      // ----------------------------------------------------------
      expectedCheckoutDate: {
        type: Date,
        default: null,
      },

      // ----------------------------------------------------------
      // ACTUAL CHECKOUT DATE
      // ----------------------------------------------------------
      checkoutDate: {
        type: Date,
        default: null,
      },

      // ----------------------------------------------------------
      // ACTUAL CHECKOUT DATE + TIME
      // ----------------------------------------------------------
      actualCheckoutDateTime: {
        type: Date,
        default: null,
      },
    },

    // ============================================================
    // GST
    // ============================================================
    gst: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================================
    // INITIAL PAID AMOUNT
    // ============================================================
    initialPaidAmount: {
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

balanceDue: {
  type: Number,
  default: 0,
  min: 0,
},

    // ============================================================
    // GRAND TOTAL
    // ============================================================
    grandTotal: {
      type: Number,
      required: [true, "Grand total is required."],
      min: [0, "Grand total cannot be negative."],
    },

    // ============================================================
    // STAY STATUS
    // ============================================================
    stayStatus: {
      type: String,
      enum: {
        values: ["pending", "vacated"],
        message: "{VALUE} is not a valid stay status",
      },
      default: "pending",
      lowercase: true,
    },

    // ============================================================
    // CHECKOUT DATE TIME
    // ============================================================
    checkoutDateTime: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

checkoutBillSchema.index({
  hotelId: 1,
  branchId: 1,
});

checkoutBillSchema.index({
  hotelId: 1,
  branchId: 1,
  customer: 1,
});

checkoutBillSchema.index({
  createdAt: -1,
});

// Useful for checkout history/date searching
checkoutBillSchema.index({
  hotelId: 1,
  branchId: 1,
  checkoutDateTime: -1,
});

// ============================================================
// MODEL
// ============================================================

const CheckoutBill =
  mongoose.models.CheckoutBill ||
  mongoose.model("CheckoutBill", checkoutBillSchema);

export default CheckoutBill;