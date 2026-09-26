import mongoose from "mongoose";

// ============================================================
// INVOICE ITEM
// ============================================================

const invoiceItemSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: true,
            trim: true,
        },

        unitPrice: {
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
    },
    {
        _id: false,
    }
);


// ============================================================
// CUSTOMER SNAPSHOT
// ============================================================

const invoiceCustomerSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },

        customerName: {
            type: String,
            required: true,
            trim: true,
        },

        phoneNumber: {
            type: String,
            default: "",
            trim: true,
        },

        alternativePhone: {
            type: String,
            default: "",
            trim: true,
        },

        email: {
            type: String,
            default: "",
            trim: true,
        },

        address: {
            type: String,
            default: "",
            trim: true,
        },

        idProofType: {
            type: String,
            default: "",
            trim: true,
        },

        idProofNumber: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        _id: false,
    }
);


// ============================================================
// FOOD SERVICES
// ============================================================

const foodServiceSchema = new mongoose.Schema(
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
    },
    {
        _id: false,
    }
);


// ============================================================
// ROOM SERVICES
// ============================================================

const roomServiceSchema = new mongoose.Schema(
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
    },
    {
        _id: false,
    }
);


// ============================================================
// ROOM SNAPSHOT (Supports multiple rooms in the invoice)
// ============================================================

const invoiceRoomSchema = new mongoose.Schema(
    {
        roomNumber: {
            type: String,
            default: "",
            trim: true,
        },

        roomType: {
            type: String,
            default: "",
            trim: true,
        },

        bedType: {
            type: String,
            default: "",
            trim: true,
        },

        perNightRoomPrice: {
            type: Number,
            default: 0,
            min: 0,
        },

        adults: {
            type: Number,
            default: 0,
            min: 0,
        },

        children: {
            type: Number,
            default: 0,
            min: 0,
        },

        foodServicesDetails: {
            type: [foodServiceSchema],
            default: [],
        },

        roomServicesDetails: {
            type: [roomServiceSchema],
            default: [],
        },
    },
    {
        _id: false,
    }
);


// ============================================================
// STAY SUMMARY
// ============================================================

const staySummarySchema = new mongoose.Schema(
    {
        bookedCheckIn: { type: String, default: "" },
        bookedCheckInTime: { type: String, default: "" },
        bookedCheckOut: { type: String, default: "" },
        bookedCheckOutTime: { type: String, default: "" },
        actualCheckOut: { type: String, default: "" },
        actualCheckOutDate: { type: String, default: "" },
        actualCheckOutTime: { type: String, default: "" },
        bookedNights: { type: Number, default: 0, min: 0 },
        extraNights: { type: Number, default: 0, min: 0 },
        extraHours: { type: Number, default: 0, min: 0 },
        extraMinutes: { type: Number, default: 0, min: 0 },
        extraTime: { type: String, default: "" },
        totalExtraStayMinutes: { type: Number, default: 0, min: 0 },
        totalNightsStayed: { type: Number, default: 0, min: 0 },
        overstayDescription: { type: String, default: "" },
    },
    { _id: false }
);


// ============================================================
// EXTRA CHARGES
// ============================================================

const extraChargesSchema = new mongoose.Schema(
    {
        extraNightsStayed: { type: Number, default: 0, min: 0 },
        extraNightRate: { type: Number, default: 0, min: 0 },
        extraNightCharge: { type: Number, default: 0, min: 0 },
        extraHoursStayed: { type: Number, default: 0, min: 0 },
        extraMinutesStayed: { type: Number, default: 0, min: 0 },
        extraHoursCharge: { type: Number, default: 0, min: 0 },
        extraTimeCharge: { type: Number, default: 0, min: 0 },
        extraTimeChargeType: { type: String, default: "No extra time charge" },
        extraTimeRatePercentage: { type: Number, default: 0, min: 0 },
        lateCheckoutCharge: { type: Number, default: 0, min: 0 },
        damageCharge: { type: Number, default: 0, min: 0 },
        otherCharges: { type: Number, default: 0, min: 0 },
        otherChargesDescription: { type: String, default: "" },
        total: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);


// ============================================================
// FINANCIALS
// ============================================================

const financialsSchema = new mongoose.Schema(
    {
        roomRent: { type: Number, default: 0, min: 0 },
        roomRentPerNight: { type: Number, default: 0, min: 0 },
        foodServices: { type: Number, default: 0, min: 0 },
        roomServices: { type: Number, default: 0, min: 0 },
        extraNightCharge: { type: Number, default: 0, min: 0 },
        extraTimeCharge: { type: Number, default: 0, min: 0 },
        totalExtraStayCharges: { type: Number, default: 0, min: 0 },
        subTotal: { type: Number, default: 0, min: 0 },
        gstPercentage: { type: Number, default: 15, min: 0 },
        gstAmount: { type: Number, default: 0, min: 0 },
        grandTotal: { type: Number, default: 0, min: 0 },
        advancePaid: { type: Number, default: 0, min: 0 },
        advancePaidVia: { type: String, default: "cash" },
        currentPayment: { type: Number, default: 0, min: 0 },
        totalPaid: { type: Number, default: 0, min: 0 },
        balanceDue: { type: Number, default: 0, min: 0 },
    },
    { _id: false }
);


// ============================================================
// PAYMENT INFO
// ============================================================

const paymentInfoSchema = new mongoose.Schema(
    {
        paymentMode: { type: String, required: true, trim: true },
        paymentStatus: { type: String, default: "PAID", trim: true },
        paidAt: { type: String, default: "" },
        transactionId: { type: String, default: "", trim: true },
    },
    { _id: false }
);


// ============================================================
// MAIN INVOICE SCHEMA
// ============================================================

const invoiceSchema = new mongoose.Schema(
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
        
        invoiceNo: {
    type: String,
    required: true,
    trim: true,
},

        invoiceYear: {
            type: Number,
            default: () => new Date().getFullYear(),
            index: true,
        },

        invoiceSequence: {
            type: Number,
            default: 0,
            index: true,
        },

        invoiceDate: {
            type: String,
            required: true,
        },

        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
            index: true,
        },

        customer: {
            type: invoiceCustomerSchema,
            required: true,
        },

        // Changed from single room object to an array of rooms for multi-room checkout
        rooms: {
            type: [invoiceRoomSchema],
            default: [],
        },

        staySummary: {
            type: staySummarySchema,
            default: () => ({}),
        },

        items: {
            type: [invoiceItemSchema],
            default: [],
        },

        extraCharges: {
            type: extraChargesSchema,
            default: () => ({}),
        },

        financials: {
            type: financialsSchema,
            required: true,
        },

        billingDetails: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },

        paymentInfo: {
            type: paymentInfoSchema,
            required: true,
        },

        status: {
            type: String,
            enum: [
                "DRAFT",
                "ISSUED",
                "PAID",
                "PARTIAL",
                "CANCELLED",
                "REFUNDED",
            ],
            default: "PAID",
            index: true,
        },
    },
    {
        timestamps: true,
    }
);


// ============================================================
// SORTING INDEX
// ============================================================

invoiceSchema.index(
    {
        hotelId: 1,
        branchId: 1,
        invoiceNo: 1,
    },
    {
        unique: true,
    }
);



// ============================================================
// MODEL
// ============================================================

const Invoice =
    mongoose.models.Invoice ||
    mongoose.model("Invoice", invoiceSchema);

export default Invoice;