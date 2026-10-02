import React, { memo, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  BookmarkCheck, IndianRupee, Receipt, UtensilsCrossed, DoorClosed, Search, Filter,
  Loader2, TrendingUp, Sparkles,
} from "lucide-react";
import { getDashboardSummary } from "../../service/dashboardApi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";

// ======================================================
// STYLE + SHARED UI
// ======================================================

const styles = `
@keyframes hd-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes hd-row{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
@keyframes hd-spin{to{transform:rotate(360deg)}}
.hd-in{opacity:0;animation:hd-up .5s cubic-bezier(.2,.7,.2,1) forwards}
.hd-row{opacity:0;animation:hd-row .35s ease-out forwards}
.hd-scroll{scrollbar-width:thin;scrollbar-color:#9db8e6 transparent}
.hd-scroll::-webkit-scrollbar{height:8px}
.hd-scroll::-webkit-scrollbar-thumb{background:#9db8e6;border-radius:9px}
@media (prefers-reduced-motion:reduce){.hd-in,.hd-row{animation:none;opacity:1}}
`;

const delay = (i, step = 65) => ({ animationDelay: `${Math.min(i, 12) * step}ms` });
const card = "rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.16)]";
const inputCls = "text-xs sm:text-sm bg-[#f6f9fe] border border-[#dbe6f5] rounded-xl text-[#0e2a4a] placeholder:text-[#9aabc0] focus:bg-white focus:border-[#3b82f0] focus:ring-2 focus:ring-[#3b82f0]/20 focus:outline-none transition";

const StatCard = memo(({ title, value, icon, cls, index }) => (
  <div style={delay(index)} className={`hd-in ${card} p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300`}>
    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] font-semibold text-[#3d5473] leading-snug">{title}</span>
      <div className={`p-2 sm:p-2.5 rounded-xl transition-transform group-hover:scale-110 duration-300 shrink-0 ${cls}`}>{icon}</div>
    </div>
    <h3 className="mt-2.5 sm:mt-3 text-[clamp(1.1rem,0.9rem+0.7vw,1.5rem)] font-extrabold text-[#0e2a4a] tracking-tight tabular-nums">{value}</h3>
  </div>
));

export default function Dashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  
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
          const stats = response.data?.stats || {};
          
          // Auto-redirect to Rooms Booking to add a room if no rooms exist
          if (stats.totalRooms === 0) {
            // Check if user has permission to access Rooms Booking page
            const hasRoomBookingAccess = 
              userData?.role === "admin" || 
              userData?.role === "hotelOwner" || 
              userData?.permission?.roomsBooking;
              
            if (hasRoomBookingAccess) {
              navigate("/rooms-booking", { state: { autoOpenAddRoom: true } });
              return;
            }
          }
          
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
      cls: "bg-cyan-50",
    },
    {
      title: "Total Revenue",
      value: `₹${totalRevenueAmount.toLocaleString("en-IN")}`,
      icon: <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />,
      cls: "bg-emerald-50",
    },
    {
      title: "Total Bills",
      value: Number(statsData.totalBills || 0).toLocaleString("en-IN"),
      icon: <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-[#2568e0]" />,
      cls: "bg-[#eaf3ff]",
    },
    {
      title: "Food Menu Items",
      value: Number(statsData.totalFoodItems || 0).toLocaleString("en-IN"),
      icon: <UtensilsCrossed className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />,
      cls: "bg-amber-50",
    },
    {
      title: "Total Rooms",
      value: Number(statsData.totalRooms || 0).toLocaleString("en-IN"),
      icon: <DoorClosed className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />,
      cls: "bg-violet-50",
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

      const matchesStatus = statusFilter === "All" || inv?.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-white/20" />
          <Loader2 className="w-14 h-14 absolute inset-0 animate-spin text-white" strokeWidth={2.5} />
        </div>
        <p className="text-sm text-blue-100 font-medium">Loading dashboard…</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard — Hotel Billing System</title>
      </Helmet>

      <style>{styles}</style>

      <main className="max-w-7xl w-full mx-auto space-y-5 sm:space-y-6 font-['Inter']">

        {/* HEADER */}
        <div className="hd-in flex flex-col md:flex-row md:items-end md:justify-between gap-3 sm:gap-4">
          <div>
           
              <h1 className="text-[18px] sm:text-[24px] lg:text-[30px] leading-tight font-extrabold tracking-[-0.035em] text-white">
              Dashboard
            </h1>
          </div>
        </div>

        {error && (
          <div className="hd-in p-3.5 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
          {stats.map((stat, idx) => (
            <StatCard key={stat.title} index={idx + 1} title={stat.title} value={stat.value} icon={stat.icon} cls={stat.cls} />
          ))}
        </div>

        {/* BILLING TABLE */}
        <div style={delay(6)} className={`hd-in ${card} overflow-hidden`}>
          <div className="p-4 sm:p-6 border-b border-[#e7eff8] flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
                <TrendingUp size={18} />
              </div>
              <div>
                <h2 className="text-[clamp(1rem,0.9rem+0.4vw,1.125rem)] font-bold text-[#0e2a4a]">Recent Transactions &amp; Billing</h2>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa2ba]" />
                <input
                  type="text"
                  placeholder="Search customer, invoice, room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full sm:w-64 pl-9 pr-4 py-2.5 ${inputCls}`}
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa2ba] pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`w-full pl-9 pr-8 py-2.5 cursor-pointer font-medium ${inputCls}`}
                >
                  <option value="All">All Statuses</option>
                  <option value="PAID">Paid</option>
                  <option value="ISSUED">Issued</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto hd-scroll">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="bg-[#f4f8fd] border-y border-[#e2ebf7]">
                  {["Invoice No", "Customer", "Room", "Date", "Grand Total", "Status"].map((h) => (
                    <th key={h} className="px-4 sm:px-6 py-3 text-[10px] sm:text-[11px] font-bold text-[#5b7089] tracking-wider uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3fa] text-xs sm:text-sm">
                {filteredBills.length > 0 ? (
                  filteredBills.map((inv, i) => (
                    <tr key={inv._id} style={delay(i, 40)} className="hd-row hover:bg-[#f4f9ff] transition-colors">
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-semibold text-[#0e2a4a] tabular-nums whitespace-nowrap">
                        {inv.invoiceNo}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-medium text-[#0e2a4a] tracking-tight whitespace-nowrap">
                        {inv.customer?.customerName || "N/A"}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#eaf3ff] text-[11px] sm:text-xs font-semibold text-[#2568e0] whitespace-nowrap">
                          {getRoomDisplay(inv)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-[#5b7089] tabular-nums whitespace-nowrap">
                        {inv.invoiceDate}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-bold text-[#0e2a4a] tabular-nums whitespace-nowrap">
                        ₹ {Number(inv.grandTotal || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                        <span
                          className={`inline-flex items-center px-3 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold tracking-wide border whitespace-nowrap ${
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
                    <td colSpan="6" className="px-6 py-10 sm:py-12 text-center text-[#8fa2ba]">
                      <Receipt className="w-8 h-8 sm:w-9 sm:h-9 mx-auto text-[#c7d6ea] mb-2" />
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