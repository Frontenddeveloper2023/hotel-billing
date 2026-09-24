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

        // recent 10 invoices
        const recentInvoices = await Invoice.find({ hotelId, branchId })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const recentTransactions = recentInvoices.map((inv) => ({
            _id: inv._id,
            invoiceNo: inv.invoiceNo || "-",
            customer: { customerName: inv.customer?.customerName || "N/A" },
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
