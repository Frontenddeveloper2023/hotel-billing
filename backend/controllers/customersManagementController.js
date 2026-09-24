import Customer from "../models/customers.js";
import Booking from "../models/booking.js";

// ============================================================
// GET CUSTOMER MANAGEMENT DATA
// GET /customers/management-data
// Permission: customer
// ============================================================

export const getCustomerManagementData = async (req, res) => {
    try {
        const hotelId  = req.user?.hotelId;
        const branchId = req.user?.branchId;

        if (!hotelId || !branchId) {
            return res.status(403).json({
                success: false,
                message: "Hotel and branch information is required.",
            });
        }

        // all customers for this tenant
        const customers = await Customer.find({ hotelId, branchId }).lean();

        // bookings that belong to those customers
        const customerIds = customers.map((c) => c._id);
        const bookings = await Booking.find({
            hotelId,
            branchId,
            customerId: { $in: customerIds },
        }).lean();

        return res.status(200).json({
            success: true,
            data: {
                customers,
                bookings,
            },
        });
    } catch (err) {
        console.error("GET CUSTOMER MANAGEMENT DATA ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to load customer management data.",
            error: err.message,
        });
    }
};
