import Invoice from "../models/invoice.js";
import Booking from "../models/booking.js";
import Customer from "../models/customers.js";
import Food from "../models/food.js";
import Room from "../models/room.js";

// ============================================================
// GET DASHBOARD SUMMARY
// GET /dashboard/summary
// Permission: dashboard
// ============================================================

export const getDashboardSummary = async (req, res) => {
    try {
        const hotelId  = req.user?.hotelId;
        const branchId = req.user?.branchId;

        if (!hotelId || !branchId) {
            return res.status(403).json({
                success: false,
                message: "Hotel and branch information is required.",
            });
        }

        const [
            totalBookings,
            totalCustomers,
            totalFoodItems,
            totalRooms,
            totalBills,
            revenueResult,
            recentInvoices,
        ] = await Promise.all([
            Booking.countDocuments({ hotelId, branchId }),
            Customer.countDocuments({ hotelId, branchId }),
            Food.countDocuments({ hotelId, branchId }),
            Room.countDocuments({ hotelId, branchId }),
            Invoice.countDocuments({ hotelId, branchId }),

            // total revenue aggregate
            Invoice.aggregate([
                { $match: { hotelId, branchId } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: { $ifNull: ["$financials.grandTotal", 0] },
                        },
                    },
                },
            ]),

            // recent 10 invoices
            Invoice.find({ hotelId, branchId })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean(),
        ]);

        const totalRevenue = revenueResult?.[0]?.totalRevenue || 0;

        const recentTransactions = recentInvoices.map((inv) => ({
            _id: inv._id,
            invoiceNo: inv.invoiceNo || "-",
            customer: {
                customerName: inv.customer?.customerName || "N/A",
            },
            rooms:
                Array.isArray(inv.rooms) && inv.rooms.length > 0
                    ? inv.rooms
                    : inv.customer?.rooms || [],
            roomNumber:
                inv.room?.roomNumber ||
                inv.customer?.roomNumber ||
                "-",
            invoiceDate: inv.invoiceDate || "",
            grandTotal: Number(inv.financials?.grandTotal || 0),
            status: inv.status || "ISSUED",
        }));

        return res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalBookings,
                    totalRevenue,
                    totalBills,
                    totalFoodItems,
                    totalRooms,
                    totalCustomers,
                },
                recentTransactions,
            },
        });
    } catch (error) {
        console.error("GET DASHBOARD SUMMARY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load dashboard summary.",
            error: error.message,
        });
    }
};
