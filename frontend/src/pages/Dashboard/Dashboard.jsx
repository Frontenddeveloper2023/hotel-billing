import React, { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import {
  BookmarkCheck,
  IndianRupee,
  Receipt,
  UtensilsCrossed,
  DoorClosed,
  Search,
  Filter,
  Loader2,
} from "lucide-react";
import { getDashboardSummary } from "../../service/dashboardApi";

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalBookings: 0,
      totalRevenue: 0,
      totalBills: 0,
      totalFoodItems: 0,
      totalRooms: 0,
      totalCustomers: 0,
    },
    recentTransactions: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Fetch from dedicated /dashboard/summary — requires only `dashboard` permission
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getDashboardSummary();

        if (response?.success) {
          setDashboardData(response.data);
        } else {
          throw new Error(response?.message || "Failed to load dashboard.");
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        setError(err?.message || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const statsData = dashboardData.stats || {};
  const totalRevenueAmount = Number(statsData.totalRevenue || 0);

  const stats = [
    {
      title: "Total Bookings",
      value: Number(statsData.totalBookings || 0).toLocaleString("en-IN"),
      icon: <BookmarkCheck className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600" />,
      bgColor: "bg-orange-50",
      borderColor: "border-cyan-200",
    },
    {
      title: "Total Revenue",
      value: `₹${totalRevenueAmount.toLocaleString("en-IN")}`,
      icon: <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />,
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
    {
      title: "Total Bills",
      value: Number(statsData.totalBills || 0).toLocaleString("en-IN"),
      icon: <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />,
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
    {
      title: "Food Menu Items",
      value: Number(statsData.totalFoodItems || 0).toLocaleString("en-IN"),
      icon: <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />,
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    {
      title: "Total Rooms",
      value: Number(statsData.totalRooms || 0).toLocaleString("en-IN"),
      icon: <DoorClosed className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />,
      bgColor: "bg-violet-50",
      borderColor: "border-violet-200",
    },
  ];

  // Helper to display room number from recent transaction
  const getRoomDisplay = (inv) => {
    const roomsArray = inv?.rooms;
    if (Array.isArray(roomsArray) && roomsArray.length > 0) {
      return roomsArray.map((r) => r?.roomNumber || r).join(", ");
    }
    return inv?.roomNumber || "-";
  };

  const transactions = dashboardData.recentTransactions || [];

  const filteredBills = useMemo(() => {
    return transactions.filter((inv) => {
      const customerName = inv?.customer?.customerName || "";
      const invoiceNo = inv?.invoiceNo || "";
      const roomNum = getRoomDisplay(inv);

      const matchesSearch =
        customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roomNum.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "All" || inv?.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard — Hotel Billing System</title>
      </Helmet>

      <main className="max-w-7xl w-full mx-auto space-y-4 sm:space-y-6 font-['Inter'] bg-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
          <h1 className="text-[clamp(1.375rem,1.1rem+1.2vw,1.875rem)] font-bold tracking-tight text-black ">
            Dashboard
          </h1>
        </div>

        {error && (
          <div className="p-3.5 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* 5 Stats Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-slate-300 rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-100 to-transparent group-hover:via-indigo-400 transition-all duration-300" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[14px] font-medium text-black leading-snug">
                  {stat.title}
                </span>
                <div
                  className={`p-1.5 sm:p-2 rounded-lg ${stat.bgColor} border ${stat.borderColor} transition-transform group-hover:scale-110 duration-300 shrink-0`}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="mt-2.5 sm:mt-3">
                <h3 className="text-[clamp(1rem,0.85rem+0.6vw,1.25rem)] font-semibold text-black tracking-tight tabular-nums">
                  {stat.value}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* Billing Table Section */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
            <div>
              <h2 className="text-[clamp(1rem,0.9rem+0.4vw,1.125rem)] font-semibold text-black">
                Recent Transactions &amp; Billing
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5">
                Overview of live invoices, food tags, and extra stay charges.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer, invoice, room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-black placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg cursor-pointer text-black focus:bg-white focus:border-indigo-400 focus:outline-none font-medium transition-colors"
                >
                  <option value="All">All Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="ISSUED">Issued</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200">
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-semibold text-slate-600 tracking-wider uppercase whitespace-nowrap">
                    Invoice No
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-semibold text-slate-600 tracking-wider uppercase whitespace-nowrap">
                    Customer
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-semibold text-slate-600 tracking-wider uppercase whitespace-nowrap">
                    Room
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-semibold text-slate-600 tracking-wider uppercase whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-semibold text-slate-600 tracking-wider uppercase whitespace-nowrap">
                    Grand Total
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-semibold text-slate-600 tracking-wider uppercase whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredBills.length > 0 ? (
                  filteredBills.map((inv) => (
                    <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-semibold text-black tabular-nums whitespace-nowrap">
                        {inv.invoiceNo}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-medium text-black tracking-tight whitespace-nowrap">
                        {inv.customer?.customerName || "N/A"}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-[11px] sm:text-xs font-medium text-black whitespace-nowrap">
                          {getRoomDisplay(inv)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-slate-700 tabular-nums whitespace-nowrap">
                        {inv.invoiceDate}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-semibold text-black tabular-nums whitespace-nowrap">
                        ₹ {Number(inv.grandTotal || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-medium tracking-wide border whitespace-nowrap ${
                            inv.status === "PAID"
                              ? "bg-emerald-500 text-white border-emerald-200"
                              : "bg-amber-500 text-white border-amber-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 sm:py-12 text-center text-slate-500">
                      <Receipt className="w-7 h-7 sm:w-8 sm:h-8 mx-auto text-slate-300 mb-2" />
                      <span className="font-medium text-xs sm:text-sm">No billing records found</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}