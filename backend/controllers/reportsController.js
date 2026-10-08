import Invoice from "../models/invoice.js";

// ============================================================
// GET REPORTS SUMMARY
// GET /reports/summary
// Permission: reports
// ============================================================

export const getReportsSummary = async (req, res) => {
    try {
        const hotelId  = req.user?.hotelId;
        const branchId = req.user?.branchId;

        if (!hotelId || !branchId) {
            return res.status(403).json({
                success: false,
                message: "Hotel and branch information is required.",
            });
        }

        // total revenue
        const revenueAgg = await Invoice.aggregate([
            { $match: { hotelId, branchId } },
            {
                $group: {
                    _id: null,
                    totalRevenue: {
                        $sum: { $ifNull: ["$financials.grandTotal", 0] },
                    },
                },
            },
        ]);
        const totalRevenue = revenueAgg?.[0]?.totalRevenue || 0;

        // total bills
        const totalBills = await Invoice.countDocuments({ hotelId, branchId });

        // recent invoices
        const recentInvoices = await Invoice.find({ hotelId, branchId })
            .sort({ createdAt: -1 })
            .limit(500)
            .lean();

        const recentTransactions = recentInvoices.map((inv) => {
            const isPaid =
                inv.paymentInfo?.paymentStatus === "PAID" ||
                inv.status === "PAID" ||
                (inv.status !== "CANCELLED" && inv.status !== "REFUNDED");

            return {
                _id: inv._id,
                invoiceNo: inv.invoiceNo || "-",
                customer: { customerName: inv.customer?.customerName || "N/A" },
                roomNumber:
                    inv.room?.roomNumber ||
                    inv.customer?.roomNumber ||
                    (Array.isArray(inv.rooms) && inv.rooms.length > 0
                        ? inv.rooms.map((r) => r.roomNumber).filter(Boolean).join(", ")
                        : "-"),
                invoiceDate: inv.invoiceDate || "",
                grandTotal: Number(inv.financials?.grandTotal || 0),
                status: isPaid ? "PAID" : (inv.status || "PAID"),
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                totalBills,
                recentTransactions,
            },
        });
    } catch (err) {
        console.error("GET REPORTS SUMMARY ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to load reports summary.",
            error: err.message,
        });
    }
};
