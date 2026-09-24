import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CreditCard,
  Package,
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  CalendarDays,
  Activity,
  Bell,
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
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.hotels)) {
    return response.data.hotels;
  }

  if (Array.isArray(response?.data?.plans)) {
    return response.data.plans;
  }

  if (Array.isArray(response?.data?.subscriptions)) {
    return response.data.subscriptions;
  }

  if (Array.isArray(response?.data?.registrations)) {
    return response.data.registrations;
  }

  if (Array.isArray(response?.hotels)) {
    return response.hotels;
  }

  if (Array.isArray(response?.plans)) {
    return response.plans;
  }

  if (Array.isArray(response?.subscriptions)) {
    return response.subscriptions;
  }

  if (Array.isArray(response?.registrations)) {
    return response.registrations;
  }

  return [];
};


const formatCurrency = (amount) => {
  const value = Number(amount || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};


const formatDate = (date) => {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


const getStatusClass = (status) => {
  switch (status) {
    case "active":
    case "approved":
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "pending":
    case "trial":
    case "expiring_soon":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "expired":
    case "rejected":
    case "cancelled":
    case "payment_failed":
      return "bg-red-50 text-red-700 border-red-200";

    case "suspended":
      return "bg-orange-50 text-orange-700 border-orange-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};


const formatStatus = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};


// ======================================================
// STAT CARD
// ======================================================

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconWrapperClass,
  loading,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          {loading ? (
            <div className="mt-2 h-8 w-24 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <h3 className="mt-2 text-2xl font-bold text-slate-900">
              {value}
            </h3>
          )}

          <p className="mt-2 text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconWrapperClass}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
};


// ======================================================
// MAIN COMPONENT
// ======================================================

const SaaSAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    hotels: [],
    plans: [],
    subscriptions: [],
    registrations: [],
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

useEffect(() => {
  const fetchUnreadNotificationCount = async () => {
    try {
      const response = await getAdminNotifications();

      const notifications =
        response?.data ||
        response?.notifications ||
        [];

      const unreadCount = notifications.filter(
        (notification) => notification.isRead === false
      ).length;

      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.error(
        "Failed to fetch notification count:",
        error
      );

      setUnreadNotificationCount(0);
    }
  };

  fetchUnreadNotificationCount();
}, []);

  // ====================================================
  // FETCH DASHBOARD DATA
  // ====================================================

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      setError("");

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const results = await Promise.allSettled([
        getAllHotels(),
        getAllPlans(),
        getAllSubscriptions(),
        getAllRegistrations(),
      ]);

      const [
        hotelsResult,
        plansResult,
        subscriptionsResult,
        registrationsResult,
      ] = results;

      const hotels =
        hotelsResult.status === "fulfilled"
          ? getArrayFromResponse(hotelsResult.value)
          : [];

      const plans =
        plansResult.status === "fulfilled"
          ? getArrayFromResponse(plansResult.value)
          : [];

      const subscriptions =
        subscriptionsResult.status === "fulfilled"
          ? getArrayFromResponse(subscriptionsResult.value)
          : [];

      const registrations =
        registrationsResult.status === "fulfilled"
          ? getArrayFromResponse(registrationsResult.value)
          : [];

      const failedApis = [];

      if (hotelsResult.status === "rejected") {
        failedApis.push("Hotels");
      }

      if (plansResult.status === "rejected") {
        failedApis.push("Plans");
      }

      if (subscriptionsResult.status === "rejected") {
        failedApis.push("Subscriptions");
      }

      if (registrationsResult.status === "rejected") {
        failedApis.push("Registrations");
      }

      if (failedApis.length > 0) {
        setError(
          `${failedApis.join(
            ", "
          )} data could not be loaded. Please check your permissions or backend APIs.`
        );
      }

      setDashboardData({
        hotels,
        plans,
        subscriptions,
        registrations,
      });
    } catch (err) {
      console.error("SaaS dashboard error:", err);

      setError(
        err?.message ||
          "Unable to load dashboard data. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);


  // ====================================================
  // DATA
  // ====================================================

  const {
    hotels,
    plans,
    subscriptions,
    registrations,
  } = dashboardData;


  // ====================================================
  // HOTEL STATS
  // ====================================================

  const totalHotels = hotels.length;

  const activeHotels = hotels.filter(
    (hotel) => hotel.status === "active"
  ).length;

  const inactiveHotels = hotels.filter(
    (hotel) => hotel.status === "inactive"
  ).length;

  const suspendedHotels = hotels.filter(
    (hotel) => hotel.status === "suspended"
  ).length;


  // ====================================================
  // REGISTRATION STATS
  // ====================================================

  const pendingRegistrations = registrations.filter(
    (registration) => registration.status === "pending"
  ).length;

  const approvedRegistrations = registrations.filter(
    (registration) => registration.status === "approved"
  ).length;

  const rejectedRegistrations = registrations.filter(
    (registration) => registration.status === "rejected"
  ).length;


  // ====================================================
  // SUBSCRIPTION STATS
  // ====================================================

  const activeSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === "active" ||
      subscription.status === "trial" ||
      subscription.status === "expiring_soon"
  ).length;

  const expiredSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === "expired"
  ).length;

  const cancelledSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.status === "cancelled"
  ).length;


  // ====================================================
  // REVENUE
  // ====================================================

  const totalRevenue = useMemo(() => {
    return subscriptions.reduce((total, subscription) => {
      const paymentStatus = subscription.paymentStatus;

      if (
        paymentStatus === "paid" ||
        paymentStatus === "partially_paid"
      ) {
        return (
          total +
          Number(
            subscription.finalAmount ??
              subscription.amount ??
              0
          )
        );
      }

      return total;
    }, 0);
  }, [subscriptions]);


  const paidSubscriptions = subscriptions.filter(
    (subscription) =>
      subscription.paymentStatus === "paid" ||
      subscription.paymentStatus === "partially_paid"
  ).length;


  // ====================================================
  // PLAN DISTRIBUTION
  // ====================================================

  const planDistribution = useMemo(() => {
    return plans.map((plan) => {
      const count = subscriptions.filter(
        (subscription) => {
          const subscriptionPlanId =
            subscription.planId?._id ||
            subscription.planId;

          return (
            String(subscriptionPlanId) ===
            String(plan._id)
          );
        }
      ).length;

      return {
        ...plan,
        subscriptionCount: count,
      };
    });
  }, [plans, subscriptions]);


  // ====================================================
  // RECENT REGISTRATIONS
  // ====================================================

  const recentRegistrations = useMemo(() => {
    return [...registrations]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )
      .slice(0, 5);
  }, [registrations]);


  // ====================================================
  // RECENT SUBSCRIPTIONS
  // ====================================================

  const recentSubscriptions = useMemo(() => {
    return [...subscriptions]
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )
      .slice(0, 5);
  }, [subscriptions]);


  // ====================================================
  // LAST UPDATED
  // ====================================================

  const lastUpdated = new Date().toLocaleTimeString(
    "en-IN",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );


  // ====================================================
  // RENDER
  // ====================================================

  const hotelHealthTotal = Math.max(totalHotels, 1);
  const activeHotelPercent = totalHotels > 0 ? (activeHotels / hotelHealthTotal) * 100 : 0;
  const inactiveHotelPercent = totalHotels > 0 ? (inactiveHotels / hotelHealthTotal) * 100 : 0;
  const suspendedHotelPercent = totalHotels > 0 ? (suspendedHotels / hotelHealthTotal) * 100 : 0;
  const paidPercent = subscriptions.length > 0 ? (paidSubscriptions / subscriptions.length) * 100 : 0;
  const activePercent = subscriptions.length > 0 ? (activeSubscriptions / subscriptions.length) * 100 : 0;
  const expiredPercent = subscriptions.length > 0 ? (expiredSubscriptions / subscriptions.length) * 100 : 0;
  const cancelledPercent = subscriptions.length > 0 ? (cancelledSubscriptions / subscriptions.length) * 100 : 0;
  const maxPlanSubscriptions = Math.max(...planDistribution.map((plan) => plan.subscriptionCount || 0), 1);

  return (
    <div className="min-h-full bg-[#F8F7FF] text-[#101936] font-['Inter']">
      <div className="max-w-[1500px]">

        {/* HEADER */}
        <header className="mb-5 sm:mb-6">
          <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-[#EDEBFF] px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-[#4338CA]">
                  Platform Admin
                </span>
                <span className="text-slate-300">/</span>
                <span className="text-[11px] sm:text-xs font-medium text-[#59647C]">Overview &amp; Telemetry</span>
              </div>
              <h1 className="text-[26px] sm:text-[31px] lg:text-[33px] leading-tight font-bold tracking-[-0.035em] text-[#0E1733]">
                SaaS Admin Dashboard
              </h1>
              <p className="mt-1 text-xs sm:text-sm leading-5 text-[#59647C] max-w-3xl">
                Overview of your hotels, plans, subscriptions and registrations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">

  {/* Notifications */}
  <Link
    to="/saas-admin/notifications"
    className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E8E5F5] bg-white text-[#29334D] shadow-[0_2px_8px_rgba(39,35,91,0.04)] hover:bg-[#F5F3FF] transition"
    aria-label={`Notifications${
      unreadNotificationCount > 0
        ? `, ${unreadNotificationCount} unread`
        : ""
    }`}
  >
    <Bell size={20} />

    {unreadNotificationCount > 0 && (
      <span
        className="
          absolute
          -right-1
          -top-1
          min-w-[18px]
          h-[18px]
          px-1
          flex
          items-center
          justify-center
          rounded-full
          bg-red-500
          text-white
          text-[9px]
          font-bold
          leading-none
          border-2
          border-white
        "
      >
        {unreadNotificationCount > 99
          ? "99+"
          : unreadNotificationCount}
      </span>
    )}
  </Link>



</div>
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 flex items-start gap-3">
            <AlertCircle size={19} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-900">Dashboard warning</p>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* TOP METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
          <StatCard title="Total Hotels" value={totalHotels} description={`${activeHotels} currently active`} icon={Building2} iconWrapperClass="bg-[#E9E7FF] text-[#4338CA]" loading={loading} />
          <StatCard title="Pending Applications" value={pendingRegistrations} description={`${approvedRegistrations} approved registrations`} icon={Clock3} iconWrapperClass="bg-[#FFF7DD] text-[#C56A00]" loading={loading} />
          <StatCard title="Active Subscriptions" value={activeSubscriptions} description={`${expiredSubscriptions} expired subscriptions`} icon={CreditCard} iconWrapperClass="bg-[#E1FAF0] text-[#087A58]" loading={loading} />
          <StatCard title="Total Plans" value={plans.length} description={`${plans.filter((plan) => plan.isActive).length} active plans`} icon={Package} iconWrapperClass="bg-[#E4E9FF] text-[#4338CA]" loading={loading} />
        </div>

        {/* REVENUE + HOTEL STATUS */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5 mt-4 sm:mt-5">
          <section className="lg:col-span-3 rounded-2xl border border-[#E9E6F5] bg-white p-4 sm:p-5 lg:p-6 shadow-[0_3px_12px_rgba(42,35,95,0.04)] overflow-hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] font-bold text-[#69728A]">Subscription Billing</p>
                <h2 className="mt-1 text-lg sm:text-xl font-bold tracking-[-0.02em] text-[#101936]">Collected Revenue</h2>
              </div>
              <div className="rounded-lg bg-[#E1FAF0] px-2.5 py-1.5 text-[11px] sm:text-xs font-bold text-[#087A58] whitespace-nowrap">
                <TrendingUp size={13} className="inline mr-1.5 -mt-0.5" />
                Paid &amp; Partially Paid
              </div>
            </div>

            <div className="mt-4 flex items-end gap-2 flex-wrap">
              {loading ? (
                <div className="h-9 w-48 rounded-lg bg-slate-100 animate-pulse" />
              ) : (
                <span className="text-[30px] sm:text-[38px] leading-none font-bold tracking-[-0.045em] text-[#101936]">
                  {formatCurrency(totalRevenue)}
                </span>
              )}
              <span className="pb-1 text-xs sm:text-sm text-[#59647C]">Collected subscription revenue</span>
            </div>

            {/* REVENUE TREND */}
<div className="mt-5 relative h-[105px] w-full overflow-hidden">
  <svg
    viewBox="0 0 600 120"
    preserveAspectRatio="none"
    className="absolute inset-0 h-full w-full"
  >
    {/* Gradient */}
    <defs>
      <linearGradient
        id="revenueGradient"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop
          offset="0%"
          stopColor="#4F46E5"
          stopOpacity="0.20"
        />
        <stop
          offset="100%"
          stopColor="#4F46E5"
          stopOpacity="0"
        />
      </linearGradient>
    </defs>

    {/* Area */}
    <path
      d="
        M 0 100
        C 50 88, 80 90, 120 91
        C 165 92, 190 78, 230 65
        C 270 52, 305 55, 335 66
        C 370 78, 405 62, 440 48
        C 475 34, 500 30, 530 40
        C 555 49, 575 44, 600 27
        L 600 120
        L 0 120
        Z
      "
      fill="url(#revenueGradient)"
    />

    {/* Main Line */}
    <path
      d="
        M 0 100
        C 50 88, 80 90, 120 91
        C 165 92, 190 78, 230 65
        C 270 52, 305 55, 335 66
        C 370 78, 405 62, 440 48
        C 475 34, 500 30, 530 40
        C 555 49, 575 44, 600 27
      "
      fill="none"
      stroke="#4F46E5"
      strokeWidth="3"
      strokeLinecap="round"
    />

    {/* Middle Point */}
    <circle
      cx="335"
      cy="66"
      r="5"
      fill="#4338CA"
    />

    {/* Latest Point */}
    <circle
      cx="600"
      cy="27"
      r="5"
      fill="#087A58"
    />
  </svg>
</div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
              <div className="rounded-xl bg-[#F3F2FF] p-3">
                <p className="text-[10px] text-[#5E6881]">Paid</p>
                <p className="mt-1 text-lg font-bold text-[#101936]">{loading ? "—" : paidSubscriptions}</p>
              </div>
              <div className="rounded-xl bg-[#F3F2FF] p-3">
                <p className="text-[10px] text-[#5E6881]">Active</p>
                <p className="mt-1 text-lg font-bold text-[#101936]">{loading ? "—" : activeSubscriptions}</p>
              </div>
              <div className="rounded-xl bg-[#F3F2FF] p-3">
                <p className="text-[10px] text-[#5E6881]">Expired</p>
                <p className="mt-1 text-lg font-bold text-[#101936]">{loading ? "—" : expiredSubscriptions}</p>
              </div>
              <div className="rounded-xl bg-[#F3F2FF] p-3">
                <p className="text-[10px] text-[#5E6881]">Cancelled</p>
                <p className="mt-1 text-lg font-bold text-[#101936]">{loading ? "—" : cancelledSubscriptions}</p>
              </div>
            </div>
          </section>

          <section className="lg:col-span-2 rounded-2xl border border-[#E9E6F5] bg-white p-4 sm:p-5 lg:p-6 shadow-[0_3px_12px_rgba(42,35,95,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.12em] font-bold text-[#69728A]">Property Fleet</p>
                <h2 className="mt-1 text-lg sm:text-xl font-bold text-[#101936]">Hotel Overview</h2>
                <p className="mt-1 text-xs sm:text-sm leading-5 text-[#59647C]">Current hotel status</p>
              </div>
              <span className="rounded-full bg-[#E9E7FF] px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold text-[#4338CA] whitespace-nowrap">
                {totalHotels} Total
              </span>
            </div>

            <div className="mt-5 grid grid-cols-[110px_1fr] sm:grid-cols-[125px_1fr] items-center gap-5">
              <div
                className="relative mx-auto h-[105px] w-[105px] sm:h-[118px] sm:w-[118px] rounded-full"
                style={{
                  background: `conic-gradient(#087A58 0 ${activeHotelPercent}%, #CFD6F1 ${activeHotelPercent}% ${activeHotelPercent + inactiveHotelPercent}%, #C91C24 ${activeHotelPercent + inactiveHotelPercent}% 100%)`,
                }}
              >
                <div className="absolute inset-[10px] rounded-full bg-white flex flex-col items-center justify-center">
                  <span className="text-xl sm:text-2xl font-bold text-[#101936]">
                    {loading ? "—" : `${Math.round(activeHotelPercent)}%`}
                  </span>
                  <span className="text-[10px] font-medium text-[#69728A]">Active</span>
                </div>
              </div>

              <div className="space-y-3 min-w-0">
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#087A58] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#101936]">{activeHotels} Active</p>
                    <p className="text-[10px] sm:text-xs text-[#69728A]">Currently active</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#CFD6F1] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#101936]">{inactiveHotels} Inactive</p>
                    <p className="text-[10px] sm:text-xs text-[#69728A]">Inactive hotels</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#C91C24] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-[#101936]">{suspendedHotels} Suspended</p>
                    <p className="text-[10px] sm:text-xs text-[#69728A]">Suspended hotels</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-[#F3F2FF] px-3.5 py-2.5">
              <span className="text-xs font-medium text-[#46516B]">Active hotel rate</span>
              <span className="text-xs font-bold text-[#087A58]">{loading ? "—" : `${activeHotelPercent.toFixed(1)}%`}</span>
            </div>
          </section>
        </div>

        {/* THREE DATA PANELS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mt-4 sm:mt-5">
          {/* PLAN DISTRIBUTION */}
          <section className="rounded-2xl border border-[#E9E6F5] bg-white shadow-[0_3px_12px_rgba(42,35,95,0.04)] overflow-hidden flex flex-col min-h-[430px]">
            <div className="p-4 sm:p-5 border-b border-[#F0EEF7] flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#69728A]">Subscription Tiers</p>
                <h2 className="mt-1 text-lg font-bold text-[#101936]">Plan Distribution</h2>
              </div>
              <Link to="/saas-admin/plans" className="inline-flex items-center gap-1 text-xs font-semibold text-[#4338CA] shrink-0">Manage Plans <ArrowRight size={14} /></Link>
            </div>
            <div className="p-4 sm:p-5 flex-1 flex flex-col">
              {loading ? (
                <div className="space-y-3">{[1,2,3].map((item) => <div key={item} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}</div>
              ) : planDistribution.length === 0 ? (
                <div className="py-10 text-center"><Package size={32} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">No plans available.</p></div>
              ) : (
                <div className="space-y-3">
                  {planDistribution.map((plan) => {
                    const planPercent = Math.min(100, ((plan.subscriptionCount || 0) / maxPlanSubscriptions) * 100);
                    return (
                      <div key={plan._id} className="rounded-xl bg-[#F3F2FF] px-3.5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#101936] truncate">{plan.planName}</p>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-[#DDE1F8] overflow-hidden">
                          <div className="h-full rounded-full bg-[#4338CA] transition-all" style={{ width: `${planPercent}%` }} />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[#69728A]">
                          <span>Active subscriptions</span>
                          <span>{plan.subscriptionCount}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to="/saas-admin/plans" className="mt-auto pt-4">
                <span className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E9E9FF] px-3 py-2.5 text-xs font-semibold text-[#101936] hover:bg-[#DFDFFF] transition">Manage Plans <ArrowRight size={14} /></span>
              </Link>
            </div>
          </section>

          {/* RECENT APPLICATIONS */}
          <section className="rounded-2xl border border-[#E9E6F5] bg-white shadow-[0_3px_12px_rgba(42,35,95,0.04)] overflow-hidden flex flex-col min-h-[430px]">
            <div className="p-4 sm:p-5 border-b border-[#F0EEF7] flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#69728A]">Onboarding Queue</p>
                <h2 className="mt-1 text-lg font-bold text-[#101936]">Recent Applications</h2>
              </div>
              <Link to="/saas-admin/hotels" className="inline-flex items-center gap-1 text-xs font-semibold text-[#4338CA] shrink-0">View All <ArrowRight size={14} /></Link>
            </div>
            {loading ? (
              <div className="p-4 sm:p-5 space-y-3">{[1,2,3,4].map((item) => <div key={item} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : recentRegistrations.length === 0 ? (
              <div className="p-10 text-center"><Users size={32} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">No registration applications found.</p></div>
            ) : (
              <div className="p-3 sm:p-4 space-y-2.5 flex-1">
                {recentRegistrations.map((registration) => (
                  <div key={registration._id} className="rounded-xl bg-[#F3F2FF] px-3.5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#101936] truncate">{registration.hotelName || "Unnamed Hotel"}</p>
                      <p className="text-[11px] text-[#59647C] truncate mt-0.5">{registration.ownerName || registration.email || "No owner information"}</p>
                      <p className="text-[10px] text-[#7A8398] mt-0.5">{formatDate(registration.createdAt)}</p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center px-2.5 py-1 rounded-md border text-[10px] font-semibold ${getStatusClass(registration.status)}`}>
                      {formatStatus(registration.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="p-4 pt-0 mt-auto">
              <Link to="/saas-admin/hotels" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E9E9FF] px-3 py-2.5 text-xs font-semibold text-[#101936] hover:bg-[#DFDFFF] transition">
                Review Applications <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* RECENT SUBSCRIPTIONS */}
          <section className="rounded-2xl border border-[#E9E6F5] bg-white shadow-[0_3px_12px_rgba(42,35,95,0.04)] overflow-hidden flex flex-col min-h-[430px]">
            <div className="p-4 sm:p-5 border-b border-[#F0EEF7] flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#69728A]">Billing Feed</p>
                <h2 className="mt-1 text-lg font-bold text-[#101936]">Recent Subscriptions</h2>
              </div>
              <Link to="/saas-admin/subscriptions" className="inline-flex items-center gap-1 text-xs font-semibold text-[#4338CA] shrink-0">View All <ArrowRight size={14} /></Link>
            </div>
            {loading ? (
              <div className="p-4 sm:p-5 space-y-3">{[1,2,3,4].map((item) => <div key={item} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : recentSubscriptions.length === 0 ? (
              <div className="p-10 text-center"><CreditCard size={32} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">No subscriptions found.</p></div>
            ) : (
              <div className="p-3 sm:p-4 space-y-2.5 flex-1">
                {recentSubscriptions.map((subscription) => {
                  const hotelName = subscription.hotelId?.hotelName || "Hotel";
                  const planName = subscription.planId?.planName || "Plan";
                  return (
                    <div key={subscription._id} className="rounded-xl bg-[#F3F2FF] px-3.5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#101936] truncate">{hotelName}</p>
                        <p className="text-[11px] text-[#59647C] truncate mt-0.5">{planName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-[#101936]">{formatCurrency(subscription.finalAmount ?? subscription.amount ?? 0)}</p>
                        <span className={`inline-flex mt-1 items-center px-2.5 py-1 rounded-md border text-[10px] font-semibold ${getStatusClass(subscription.status)}`}>
                          {formatStatus(subscription.status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="p-4 pt-0 mt-auto">
              <Link to="/saas-admin/subscriptions" className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#E9E9FF] px-3 py-2.5 text-xs font-semibold text-[#101936] hover:bg-[#DFDFFF] transition">
                View Subscriptions <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        </div>

        {/* QUICK ACTIONS */}
        <section className="mt-4 sm:mt-5 mb-4">
          <div className="flex items-center justify-between gap-3 px-1 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#69728A]">Platform Management</p>
              <h2 className="mt-1 text-sm sm:text-base font-bold text-[#101936]">Quick Actions</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link to="/saas-admin/hotels" className="group rounded-2xl border border-[#E9E6F5] bg-white p-4 shadow-[0_3px_12px_rgba(42,35,95,0.04)] hover:border-[#CFC9FF] hover:-translate-y-0.5 transition">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#E9E7FF] text-[#4338CA] flex items-center justify-center shrink-0"><Building2 size={19} /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#101936]">Manage Hotels</p>
                  <p className="text-xs text-[#66718A] mt-1 line-clamp-2">View and manage hotels</p>
                </div>
              </div>
              <span className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-[#4338CA]">Open <ArrowRight size={14} /></span>
            </Link>

            <Link to="/saas-admin/plans" className="group rounded-2xl border border-[#E9E6F5] bg-white p-4 shadow-[0_3px_12px_rgba(42,35,95,0.04)] hover:border-[#CFC9FF] hover:-translate-y-0.5 transition">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#E4E9FF] text-[#4338CA] flex items-center justify-center shrink-0"><Package size={19} /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#101936]">Manage Plans</p>
                  <p className="text-xs text-[#66718A] mt-1 line-clamp-2">Configure pricing and features</p>
                </div>
              </div>
              <span className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-[#4338CA]">Open <ArrowRight size={14} /></span>
            </Link>

            <Link to="/saas-admin/subscriptions" className="group rounded-2xl border border-[#E9E6F5] bg-white p-4 shadow-[0_3px_12px_rgba(42,35,95,0.04)] hover:border-[#BEEEDC] hover:-translate-y-0.5 transition">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#E1FAF0] text-[#087A58] flex items-center justify-center shrink-0"><CreditCard size={19} /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#101936]">Subscriptions</p>
                  <p className="text-xs text-[#66718A] mt-1 line-clamp-2">Manage hotel subscriptions</p>
                </div>
              </div>
              <span className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-[#087A58]">Open <ArrowRight size={14} /></span>
            </Link>

            <Link to="/saas-admin/hotels" className="group rounded-2xl border border-[#E9E6F5] bg-white p-4 shadow-[0_3px_12px_rgba(42,35,95,0.04)] hover:border-[#F1D99E] hover:-translate-y-0.5 transition">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FFF7DD] text-[#C56A00] flex items-center justify-center shrink-0"><Clock3 size={19} /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#101936]">Applications</p>
                  <p className="text-xs text-[#66718A] mt-1 line-clamp-2">Review pending applications</p>
                </div>
              </div>
              <span className="mt-4 flex items-center justify-end gap-1 text-xs font-semibold text-[#C56A00]">Open <ArrowRight size={14} /></span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SaaSAdminDashboard;
