import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
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
        // ROOM NUMBER
        // ============================================================
        roomNumber: {
            type: String,
            trim: true,
            required: true,
        },

        // ============================================================
        // ROOM TYPE
        // ============================================================
        roomType: {
            type: String,
            trim: true,
        },

        // ============================================================
        // BED TYPE
        // ============================================================
        bedType: {
            type: String,
            trim: true,
        },

        // ============================================================
        // PRICE PER NIGHT
        // ============================================================
        pricePerNight: {
            type: Number,
            min: 0,
        },

        // ============================================================
        // ROOM STATUS
        // ============================================================
        status: {
            type: String,
            default: "available",
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================================
// ROOM NUMBER MUST BE UNIQUE INSIDE A BRANCH
// ============================================================
//
// Branch A → Room 101
// Branch B → Room 101       ✅ allowed
//
// Branch A → Room 101
// Branch A → Room 101       ❌ not allowed
// ============================================================

roomSchema.index(
    {
        hotelId: 1,
        branchId: 1,
        roomNumber: 1,
    },
    {
        unique: true,
    }
);

const Room =
    mongoose.models.Room ||
    mongoose.model("Room", roomSchema);

export default Room;