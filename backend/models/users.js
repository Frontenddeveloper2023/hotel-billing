import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        

        role: {
            type: String,
            required: true,
            enum: [
                "admin",
                "receptionist",
                "hotelOwner",
            ],
        },

        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },

        hotelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Hotels",
            default: null,
            index: true,
        },

        branchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BranchHotels",
            default: null,
            index: true,
        },

        status: {
            type: String,
            enum: ["active", "inactive"],
            default: "active",
        },

        otp: {
            type: Number,
            default: null,
        },

        otpExpiresAt: {
            type: Date,
            default: null,
        },

        permission: {
            type: Object,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

const Users =
    mongoose.models.Users ||
    mongoose.model("Users", userSchema);

export default Users;