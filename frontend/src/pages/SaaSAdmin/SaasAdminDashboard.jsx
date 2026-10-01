import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2, CreditCard, Package, Users, Clock3, AlertCircle,
  ArrowRight, TrendingUp, Bell, ShieldCheck, RotateCw,
  Crown, Layers, Zap,
} from "lucide-react";

import { getAdminNotifications } from "../../service/saasNotificationApi.js";
import { getAllHotels } from "../../service/hotelApi";
import { getAllPlans } from "../../service/planApi";
import { getAllSubscriptions } from "../../service/subscriptionApi";
import { getAllRegistrations } from "../../service/hotelRegistrationApi";

// ======================================================
// HELPERS
// ======================================================

const getArrayFromResponse = (response) => {
  const keys = ["hotels", "plans", "subscriptions", "registrations"];
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  for (const k of keys) if (Array.isArray(response?.data?.[k])) return response.data[k];
  for (const k of keys) if (Array.isArray(response?.[k])) return response[k];
  return [];
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(amount || 0));

const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getStatusClass = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "active": case "approved": case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending": case "trial": case "expiring_soon":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "expired": case "rejected": case "cancelled": case "payment_failed":
      return "bg-red-50 text-red-700 border-red-200";
    case "suspended":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

const formatStatus = (status) => {
  if (!status) return "Unknown";
  return String(status).replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

const getPlanTierMeta = (planName = "") => {
  const name = String(planName || "").toLowerCase();
  if (name.includes("gold") || name.includes("enterprise")) {
    return {
      tierBadge: "Enterprise Tier",
      icon: Crown,
      badgeCls: "bg-amber-100 text-amber-800 border-amber-300",
      accentBar: "from-amber-400 via-amber-500 to-yellow-600",
      cardBorder: "border-amber-100 hover:border-amber-300",
      cardBg: "hover:bg-amber-50/20",
    };
  }
  if (name.includes("premium") || name.includes("pro")) {
    return {
      tierBadge: "Pro Tier",
      icon: Zap,
      badgeCls: "bg-indigo-100 text-indigo-800 border-indigo-300",
      accentBar: "from-indigo-500 via-purple-500 to-indigo-600",
      cardBorder: "border-indigo-100 hover:border-indigo-300",
      cardBg: "hover:bg-indigo-50/20",
    };
  }
  return {
    tierBadge: "Starter Tier",
    icon: Layers,
    badgeCls: "bg-blue-100 text-blue-800 border-blue-300",
    accentBar: "from-blue-500 via-sky-500 to-cyan-500",
    cardBorder: "border-blue-100 hover:border-blue-300",
    cardBg: "hover:bg-blue-50/20",
  };
};

const formatPlanName = (name = "") => {
  if (!name) return "Plan";
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// ======================================================
// SHARED UI
// ======================================================

const card = "rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.28)]";
const eyebrow = "text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-[#6b7f99]";

const styles = `
@keyframes sa-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes sa-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes sa-draw{from{stroke-dashoffset:1200}to{stroke-dashoffset:0}}
@keyframes sa-pulse{0%,100%{opacity:.5}50%{opacity:1}}
.sa-in{opacity:0;animation:sa-up .55s cubic-bezier(.2,.7,.2,1) forwards}
.sa-bar{transform-origin:left;animation:sa-grow .9s .3s cubic-bezier(.2,.7,.2,1) both}
.sa-line{stroke-dasharray:1200;animation:sa-draw 1.6s .2s ease-out forwards}
.sa-dot{animation:sa-pulse 2s infinite}
@media (prefers-reduced-motion:reduce){.sa-in,.sa-bar,.sa-line,.sa-dot{animation:none;opacity:1;stroke-dasharray:none}}
`;

const delay = (i) => ({ animationDelay: `${i * 70}ms` });

const StatCard = memo(({ title, value, description, icon: Icon, iconWrapperClass, loading, index = 0 }) => (
  <div
    style={delay(index)}
    className={`sa-in ${card} p-4 sm:p-5 hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(6,20,52,0.35)] transition-all duration-300`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#5b7089]">{title}</p>
        {loading ? (
          <div className="mt-2 h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <h3 className="mt-2 text-3xl font-extrabold tracking-tight text-[#0e2a4a]">{value}</h3>
        )}
        <p className="mt-2 text-xs text-[#6b7f99]">{description}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${iconWrapperClass}`}>
        <Icon size={22} />
      </div>
    </div>
  </div>
));

const PanelHead = ({ eyebrowText, title, to, linkText, count }) => (
  <div className="p-4 sm:p-5 border-b border-[#e7eff8] flex items-center justify-between gap-3">
    <div>
      <p className={eyebrow}>{eyebrowText}</p>
      <h2 className="mt-1 text-lg font-bold text-[#0e2a4a]">{title}</h2>
    </div>
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2568e0] hover:text-[#1a50b8] transition-all shrink-0 group"
    >
      <span>{linkText}</span>
      {typeof count === "number" && (
        <span className="rounded-full bg-[#EAF3FF] px-2 py-0.5 text-[10px] font-bold text-[#2568e0]">
          {count}
        </span>
      )}
      <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
    </Link>
  </div>
);

const PanelButton = ({ to, children, count }) => (
  <div className="p-4 pt-2 mt-auto border-t border-[#edf2f8]">
    <Link
      to={to}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2568e0] to-[#1a50b8] hover:from-[#1e58c7] hover:to-[#14429e] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 hover:shadow-md transition-all active:scale-[0.99]"
    >
      <span>{children}</span>
      {typeof count === "number" && (
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
      <ArrowRight size={14} />
    </Link>
  </div>
);

const Skeleton = ({ n = 4, h = "h-16" }) => (
  <div className="p-4 sm:p-5 space-y-3">
    {Array.from({ length: n }).map((_, i) => <div key={i} className={`${h} bg-slate-100 rounded-2xl animate-pulse`} />)}
  </div>
);

const Empty = ({ icon: Icon, text }) => (
  <div className="p-10 text-center flex-1">
    <Icon size={32} className="mx-auto text-slate-300" />
    <p className="mt-3 text-sm text-slate-500">{text}</p>
  </div>
);

// ======================================================
// MAIN COMPONENT
// ======================================================

const SaaSAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({ hotels: [], plans: [], subscriptions: [], registrations: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    const fetchUnreadNotificationCount = async () => {
      try {
        const response = await getAdminNotifications();
        const notifications = response?.data || response?.notifications || [];
        setUnreadNotificationCount(notifications.filter((n) => n.isRead === false).length);
      } catch (err) {
        console.error("Failed to fetch notification count:", err);
        setUnreadNotificationCount(0);
      }
    };
    fetchUnreadNotificationCount();
  }, []);

  const fetchDashboardData = useCallback(async (isRefresh = false, silent = false) => {
    try {
      setError("");
      if (!silent) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
      } else {
        setRefreshing(true);
      }

      const results = await Promise.allSettled([
        getAllHotels(),
        getAllPlans(),
        getAllSubscriptions(),
        getAllRegistrations(),
      ]);
      const [hotelsResult, plansResult, subscriptionsResult, registrationsResult] = results;

      const pick = (r) => (r.status === "fulfilled" ? getArrayFromResponse(r.value) : []);
      const hotels = pick(hotelsResult);
      const plans = pick(plansResult);
      const subscriptions = pick(subscriptionsResult);
      const registrations = pick(registrationsResult);

      const failedApis = [];
      if (hotelsResult.status === "rejected") failedApis.push("Hotels");
      if (plansResult.status === "rejected") failedApis.push("Plans");
      if (subscriptionsResult.status === "rejected") failedApis.push("Subscriptions");
      if (registrationsResult.status === "rejected") failedApis.push("Registrations");

      if (failedApis.length > 0 && !silent) {
        setError(`${failedApis.join(", ")} data could not be loaded. Please check your permissions or backend APIs.`);
      }

      setDashboardData({ hotels, plans, subscriptions, registrations });
    } catch (err) {
      console.error("SaaS dashboard error:", err);
      if (!silent) {
        setError(err?.message || "Unable to load dashboard data. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // High-speed auto-sync without page refresh:
  // 1. Silent polling every 12 seconds
  // 2. Immediate refetch on window focus / tab visibility change
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(true, true);
    }, 12000);

    const handleFocus = () => {
      fetchDashboardData(true, true);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchDashboardData]);

  const { hotels, plans, subscriptions, registrations } = dashboardData;

  // HOTEL STATS (Real-time pipeline)
  const totalHotels = hotels.length;
  const activeHotels = hotels.filter((h) => String(h.status || "").toLowerCase() === "active").length;

  // REGISTRATION & APPLICATION PIPELINE STATS
  const pendingRegistrations = registrations.filter((r) => String(r.status || "").toLowerCase() === "pending").length;
  const rejectedRegistrations = registrations.filter((r) => String(r.status || "").toLowerCase() === "rejected").length;
  const approvedRegistrations = registrations.filter((r) => String(r.status || "").toLowerCase() === "approved").length;

  // Overview Total: Active Hotels + Pending For Approval + Rejected Applications
  const overviewTotal = activeHotels + pendingRegistrations + rejectedRegistrations;
  const overviewDenominator = overviewTotal > 0 ? overviewTotal : 1;
  const activeHotelPercent = overviewTotal > 0 ? (activeHotels / overviewDenominator) * 100 : 0;
  const pendingHotelPercent = overviewTotal > 0 ? (pendingRegistrations / overviewDenominator) * 100 : 0;
  const rejectedHotelPercent = overviewTotal > 0 ? (rejectedRegistrations / overviewDenominator) * 100 : 0;

  // Conic gradient: Active (#087A58), Pending Approval (#F59E0B), Rejected (#DC2626)
  const donutGradient = overviewTotal === 0
    ? "#E2E8F0 0% 100%"
    : `conic-gradient(#087A58 0% ${activeHotelPercent}%, #F59E0B ${activeHotelPercent}% ${activeHotelPercent + pendingHotelPercent}%, #DC2626 ${activeHotelPercent + pendingHotelPercent}% 100%)`;

  // SUBSCRIPTION STATS
  const activeSubscriptions = subscriptions.filter((s) => {
    const st = String(s.status || "").toLowerCase();
    return st === "active" || st === "trial" || st === "expiring_soon";
  }).length;

  const expiredSubscriptions = subscriptions.filter((s) => {
    return String(s.status || "").toLowerCase() === "expired";
  }).length;

  const cancelledSubscriptions = subscriptions.filter((s) => {
    return String(s.status || "").toLowerCase() === "cancelled";
  }).length;

  // REVENUE (Paid & Partially Paid)
  const totalRevenue = useMemo(
    () =>
      subscriptions.reduce((total, s) => {
        const pStatus = String(s.paymentStatus || "").toLowerCase();
        if (pStatus === "paid" || pStatus === "partially_paid") {
          return total + Number(s.finalAmount ?? s.amount ?? 0);
        }
        return total;
      }, 0),
    [subscriptions]
  );

  const paidSubscriptions = subscriptions.filter((s) => {
    const pStatus = String(s.paymentStatus || "").toLowerCase();
    return pStatus === "paid" || pStatus === "partially_paid";
  }).length;

  // PLAN DISTRIBUTION
  const planDistribution = useMemo(
    () =>
      plans.map((plan) => {
        const count = subscriptions.filter((s) => {
          const id = s.planId?._id || s.planId;
          return String(id) === String(plan._id);
        }).length;
        return { ...plan, subscriptionCount: count };
      }),
    [plans, subscriptions]
  );

  const maxPlanSubscriptions = Math.max(...planDistribution.map((p) => p.subscriptionCount || 0), 1);

  // STRICT RECENT 5 ENTRIES
  const recentRegistrations = useMemo(
    () => [...registrations].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
    [registrations]
  );

  const recentSubscriptions = useMemo(
    () => [...subscriptions].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5),
    [subscriptions]
  );

  const miniStats = [
    ["Paid", paidSubscriptions],
    ["Active", activeSubscriptions],
    ["Expired", expiredSubscriptions],
    ["Cancelled", cancelledSubscriptions],
  ];

  const quickActions = [
    { to: "/saas-admin/hotels?tab=hotels", icon: Building2, title: "Manage Hotels", text: "View and manage active properties", cls: "bg-[#EAF3FF] text-[#2568e0]" },
    { to: "/saas-admin/plans", icon: Package, title: "Manage Plans", text: "Configure pricing and features", cls: "bg-[#E7F0FF] text-[#2568e0]" },
    { to: "/saas-admin/subscriptions", icon: CreditCard, title: "Subscriptions", text: "Manage hotel subscriptions", cls: "bg-[#E1FAF0] text-[#087A58]" },
    { to: "/saas-admin/hotels?tab=applications", icon: Clock3, title: "Applications", text: "Review pending applications", cls: "bg-[#FFF7DD] text-[#C56A00]" },
  ];

  return (
    <div className="min-h-full text-[#0F2F57] font-['Inter']">
      <style>{styles}</style>
      <div className="mx-auto w-full max-w-[1500px]">

        {/* HEADER */}
        <header className="mb-6 sa-in">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="min-w-0">
             
              <h1 className="text-[18px] sm:text-[24px] lg:text-[30px] leading-tight font-extrabold tracking-[-0.035em] text-white">
                SaaS Admin Dashboard
              </h1>
             
            </div>

            <div className="flex items-center gap-3">
             

           

              <Link
                to="/saas-admin/notifications"
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md text-white hover:bg-white/20 transition"
                aria-label={`Notifications${unreadNotificationCount > 0 ? `, ${unreadNotificationCount} unread` : ""}`}
              >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none border-2 border-[#1d3f70]">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="sa-in mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 flex items-start gap-3">
            <AlertCircle size={19} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Dashboard warning</p>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* TOP METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard index={1} title="Total Hotels" value={totalHotels} description={`${activeHotels} currently active`} icon={Building2} iconWrapperClass="bg-[#EAF3FF] text-[#2568e0]" loading={loading} />
          <StatCard index={2} title="Pending Applications" value={pendingRegistrations} description={`${approvedRegistrations} approved registrations`} icon={Clock3} iconWrapperClass="bg-[#FFF7DD] text-[#C56A00]" loading={loading} />
          <StatCard index={3} title="Active Subscriptions" value={activeSubscriptions} description={`${expiredSubscriptions} expired subscriptions`} icon={CreditCard} iconWrapperClass="bg-[#E1FAF0] text-[#087A58]" loading={loading} />
          <StatCard index={4} title="Total Plans" value={plans.length} description={`${plans.filter((p) => p.isActive).length} active plans`} icon={Package} iconWrapperClass="bg-[#E7F0FF] text-[#2568e0]" loading={loading} />
        </div>

        {/* REVENUE + HOTEL STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 mt-4 sm:mt-5">
          {/* Revenue hero (blue gradient with live status sync) */}
          <section style={delay(5)} className="sa-in lg:col-span-3 rounded-3xl bg-gradient-to-br from-[#5b9bf5] via-[#3b82f0] to-[#2260da] p-5 sm:p-6 text-white shadow-[0_18px_45px_rgba(6,20,52,0.35)] overflow-hidden relative">
            <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] font-bold text-blue-100">Subscription Billing</p>
                  <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold text-blue-50 border border-white/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Sync
                  </span>
                </div>
                <h2 className="mt-1 text-lg sm:text-xl font-bold">Collected Revenue</h2>
              </div>

              
            </div>

            <div className="relative mt-4 flex items-end gap-2 flex-wrap">
              {loading ? (
                <div className="h-10 w-52 rounded-lg bg-white/20 animate-pulse" />
              ) : (
                <span className="text-[34px] sm:text-[44px] leading-none font-extrabold tracking-[-0.045em]">
                  {formatCurrency(totalRevenue)}
                </span>
              )}
              <span className="pb-1 text-xs sm:text-sm text-blue-100">Collected subscription revenue</span>
            </div>

            <div className="relative mt-5 h-[105px] w-full overflow-hidden">
              <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M 0 100 C 50 88, 80 90, 120 91 C 165 92, 190 78, 230 65 C 270 52, 305 55, 335 66 C 370 78, 405 62, 440 48 C 475 34, 500 30, 530 40 C 555 49, 575 44, 600 27 L 600 120 L 0 120 Z" fill="url(#revenueGradient)" />
                <path className="sa-line" d="M 0 100 C 50 88, 80 90, 120 91 C 165 92, 190 78, 230 65 C 270 52, 305 55, 335 66 C 370 78, 405 62, 440 48 C 475 34, 500 30, 530 40 C 555 49, 575 44, 600 27" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                <circle cx="335" cy="66" r="5" fill="#fff" />
                <circle className="sa-dot" cx="596" cy="28" r="6" fill="#7dffc4" />
              </svg>
            </div>

            <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
              {miniStats.map(([label, val]) => (
                <div key={label} className="rounded-2xl bg-white/15 border border-white/20 backdrop-blur-sm p-3">
                  <p className="text-[10px] text-blue-100">{label}</p>
                  <p className="mt-1 text-lg font-bold">{loading ? "—" : val}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Hotel overview (Active, Pending for Approval, Rejected) */}
       <section style={delay(6)} className={`sa-in lg:col-span-2 ${card} p-4 sm:p-5 justify-between`}>
  <div >
    <div className="flex  items-start justify-between gap-3">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-[#0e2a4a]">Hotel Overview</h2>
        <p className="text-xs sm:text-sm text-[#60758D]">Current hotel status</p>
      </div>
      <span className="rounded-full bg-[#EAF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#2568e0] whitespace-nowrap">
        {overviewTotal} Total
      </span>
    </div>

    <div className="mt-3.5  grid grid-cols-[110px_1fr] sm:grid-cols-[130px_1fr] items-center gap-2">
      <div
        className="relative mx-auto h-[130px] w-[130px] sm:h-[175px] sm:w-[175px] rounded-full transition-all duration-700 shadow-sm"
        style={{ background: donutGradient }}
      >
        <div className="absolute inset-[10px] rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-xl sm:text-2xl font-extrabold text-[#0e2a4a]">
            {loading ? "—" : `${Math.round(activeHotelPercent)}%`}
          </span>
          <span className="text-[10px] font-medium text-[#667C92]">Active</span>
        </div>
      </div>

      <div className="space-y-6 ml-15 min-w-0">
        {[
          { color: "#087A58", count: activeHotels, label: "Active", sub: "Currently active" },
          { color: "#F59E0B", count: pendingRegistrations, label: "Pending", sub: "Awaiting approval" },
          { color: "#DC2626", count: rejectedRegistrations, label: "Rejected", sub: "Declined applications" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-2.5">
            <span className="mt-1 h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ background: item.color }} />
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-[#0e2a4a]">{item.count} {item.label}</p>
              <p className="text-[10px] sm:text-xs text-[#667C92]">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>


        </div>

        {/* THREE DATA PANELS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mt-4 sm:mt-5">
          {/* PLAN DISTRIBUTION */}
          <section style={delay(7)} className={`sa-in ${card} overflow-hidden flex flex-col min-h-[460px]`}>
            <PanelHead
              title="Plan Distribution"
              to="/saas-admin/plans"
              linkText="Manage Plans"
              count={plans.length}
            />
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
              {loading ? (
                <Skeleton n={3} h="h-20" />
              ) : planDistribution.length === 0 ? (
                <Empty icon={Package} text="No plans available." />
              ) : (
                <div className="space-y-3">
                  {planDistribution.map((plan) => {
                    const meta = getPlanTierMeta(plan.planName);
                    const TierIcon = meta.icon;
                    const planCount = plan.subscriptionCount || 0;
                    const planPercent = Math.min(100, (planCount / maxPlanSubscriptions) * 100);
                    const shareOfTotal = activeSubscriptions > 0 ? Math.round((planCount / activeSubscriptions) * 100) : 0;
                    const priceText = plan.pricing?.monthly
                      ? `${formatCurrency(plan.pricing.monthly)}/mo`
                      : (plan.price ? formatCurrency(plan.price) : "Custom");

                    return (
                      <div
                        key={plan._id}
                        className={`rounded-2xl border ${meta.cardBorder} bg-[#F8FAFD] ${meta.cardBg} p-3.5 transition-all duration-200 hover:shadow-sm`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeCls}`}>
                              <TierIcon size={15} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-[#0e2a4a] truncate">
                                {formatPlanName(plan.planName)}
                              </h4>
                              <p className="text-[11px] font-semibold text-[#2568e0]">
                                {priceText}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAF3FF] text-[#2568e0]">
                              {planCount} active
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="h-2 rounded-full bg-[#E3EDF8] overflow-hidden">
                            <div
                              className={`sa-bar h-full rounded-full bg-gradient-to-r ${meta.accentBar}`}
                              style={{ width: `${planPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Plan Limits preview */}
                        <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-[#667C92] pt-1.5 border-t border-[#ebf2fa]">
                          <span>
                            {plan.limits?.rooms ? `${plan.limits.rooms} Rooms` : "Unlimited Rooms"} • {plan.limits?.branches || 1} {Number(plan.limits?.branches || 1) === 1 ? "Branch" : "Branches"}
                          </span>
                          <span className="font-semibold text-[#0e2a4a]">
                            {plan.limits?.receptionists ? `${plan.limits.receptionists} Staff` : "Unlimited Staff"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <PanelButton to="/saas-admin/plans" count={plans.length}>
                Manage All Plans
              </PanelButton>
            </div>
          </section>

          {/* RECENT APPLICATIONS (Strict 5 items + View All) */}
          <section style={delay(8)} className={`sa-in ${card} overflow-hidden flex flex-col min-h-[460px]`}>
            <PanelHead
              title="Recent Applications"
              to="/saas-admin/hotels?tab=applications"
              linkText="View All"
              count={registrations.length}
            />
            {loading ? (
              <Skeleton n={5} />
            ) : recentRegistrations.length === 0 ? (
              <Empty icon={Users} text="No registration applications found." />
            ) : (
              <div className="p-3 sm:p-4 space-y-2.5 flex-1">
                {recentRegistrations.map((r) => (
                  <div
                    key={r._id}
                    className="rounded-2xl bg-[#F8FAFD] border border-[#eef3f9] hover:bg-[#EAF3FF] hover:border-[#BFD8FF] transition-all px-3.5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0e2a4a] truncate">{r.hotelName || "Unnamed Hotel"}</p>
                      <p className="text-[11px] text-[#60758D] truncate mt-0.5">{r.ownerName || r.email || "No owner information"}</p>
                      <p className="text-[10px] text-[#7890A8] mt-0.5">{formatDate(r.createdAt)}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center px-2.5 py-1 rounded-lg border text-[10px] font-semibold ${getStatusClass(r.status)}`}>
                      {formatStatus(r.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <PanelButton to="/saas-admin/hotels?tab=applications" count={registrations.length}>
              View All Applications
            </PanelButton>
          </section>

          {/* RECENT SUBSCRIPTIONS (Strict 5 items + View All) */}
          <section style={delay(9)} className={`sa-in ${card} overflow-hidden flex flex-col min-h-[460px]`}>
            <PanelHead
              title="Recent Subscriptions"
              to="/saas-admin/subscriptions"
              linkText="View All"
              count={subscriptions.length}
            />
            {loading ? (
              <Skeleton n={5} />
            ) : recentSubscriptions.length === 0 ? (
              <Empty icon={CreditCard} text="No subscriptions found." />
            ) : (
              <div className="p-3 sm:p-4 space-y-2.5 flex-1">
                {recentSubscriptions.map((s) => (
                  <div
                    key={s._id}
                    className="rounded-2xl bg-[#F8FAFD] border border-[#eef3f9] hover:bg-[#EAF3FF] hover:border-[#BFD8FF] transition-all px-3.5 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0e2a4a] truncate">{s.hotelId?.hotelName || "Hotel"}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-semibold text-[#2568e0] bg-[#EAF3FF] px-2 py-0.5 rounded-md">
                          {formatPlanName(s.planId?.planName || "Plan")}
                        </span>
                        <span className="text-[10px] text-[#7890A8]">{formatDate(s.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#0e2a4a]">{formatCurrency(s.finalAmount ?? s.amount ?? 0)}</p>
                      <span className={`inline-flex mt-1 items-center px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${getStatusClass(s.status)}`}>
                        {formatStatus(s.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <PanelButton to="/saas-admin/subscriptions" count={subscriptions.length}>
              View All Subscriptions
            </PanelButton>
          </section>
        </div>

        {/* QUICK ACTIONS */}
        <section className="mt-5 mb-4">
          <div className="px-1 mb-3 sa-in" style={delay(10)}>
            <h2 className="mt-1 text-base sm:text-lg font-bold text-white">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map(({ to, icon: Icon, title, text, cls }, i) => (
              <Link
                key={title}
                to={to}
                style={delay(11 + i)}
                className="sa-in group rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md p-4 hover:bg-white hover:-translate-y-1 transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${cls}`}><Icon size={20} /></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-white group-hover:text-[#0e2a4a] transition-colors">{title}</p>
                    <p className="text-xs text-blue-100/80 group-hover:text-[#60758D] mt-1 line-clamp-2 transition-colors">{text}</p>
                  </div>
                </div>
                <span className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-blue-100 group-hover:text-[#2568e0] transition-colors">
                  Open <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SaaSAdminDashboard;