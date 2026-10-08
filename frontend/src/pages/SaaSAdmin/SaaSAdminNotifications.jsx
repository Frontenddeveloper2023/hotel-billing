import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getAdminNotifications,
  markNotificationAsRead,
} from "../../service/saasNotificationApi";

/* =========================================================
   CONSTANTS (module-level, never re-created)
========================================================= */

const PAGE_SIZE = 20;

const PAYMENT_TYPES = new Set([
  "payment_submitted",
  "payment_received",
  "payment_failed",
  "payment_reversed",
  "payment_success",
  "escrow_cleared",
  "escrow_pending",
  "subscription_renewed",
  "subscription_activated",
]);

const REVIEW_TYPES = new Set([
  "registration_submitted",
  "registration_created",
  "kyc_pending",
]);

const APPROVAL_TYPES = new Set([
  "registration_submitted",
  "kyc_pending",
  "payment_submitted",
]);

const TYPE_CONFIG = {
  payment_submitted: { actionText: "has sent a new payment" },
  payment_received: { actionText: "has successfully paid" },
  payment_failed: { actionText: "had a payment fail" },
  payment_reversed: { actionText: "had a payment refunded" },
  escrow_cleared: { actionText: "has passed the payment check" },
  escrow_pending: { actionText: "is waiting for a payment check" },
  subscription_renewed: { actionText: "has renewed their subscription" },
  subscription_activated: { actionText: "has started their subscription" },
  registration_created: { actionText: "has started registering" },
  registration_submitted: { actionText: "has submitted details to join" },
  kyc_pending: { actionText: "has sent documents for ID check" },
  kyc_verified: { actionText: "has passed the ID check" },
  kyc_failed: { actionText: "has failed the ID check" },
  tenant_provisioned: { actionText: "is fully set up and ready to use the system" },
  default: { actionText: "has a new update" },
};

const AVATAR_PALETTES = [
  "from-blue-600 to-indigo-600",
  "from-emerald-500 to-teal-700",
  "from-violet-600 to-purple-700",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-600 to-blue-700",
];

const TABS = [
  { id: "all", label: "All Messages", countKey: "all" },
  { id: "unread", label: "New", countKey: "unread" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/* Formatters are expensive to construct: build once. */
const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const dateTimeOpts = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

/* All keyframes live in one place. Respects reduced-motion. */
const ANIMATION_CSS = `
@keyframes sn-rise { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes sn-pop { from { opacity: 0; transform: scale(.92); } to { opacity: 1; transform: scale(1); } }
@keyframes sn-drop { from { opacity: 0; transform: translateY(-6px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes sn-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes sn-ring { 0%,100% { transform: rotate(0); } 15% { transform: rotate(14deg); } 30% { transform: rotate(-12deg); } 45% { transform: rotate(8deg); } 60% { transform: rotate(-6deg); } 75% { transform: rotate(0); } }
@keyframes sn-ping { 0% { transform: scale(1); opacity: .7; } 100% { transform: scale(2.6); opacity: 0; } }
@keyframes sn-shimmer { from { background-position: -400px 0; } to { background-position: 400px 0; } }
@keyframes sn-count { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.sn-rise { animation: sn-rise .45s cubic-bezier(.22,1,.36,1) both; }
.sn-pop { animation: sn-pop .18s ease-out both; }
.sn-drop { animation: sn-drop .16s ease-out both; transform-origin: top right; }
.sn-fade { animation: sn-fade .25s ease-out both; }
.sn-ring { animation: sn-ring 1.1s ease-in-out .4s 1; transform-origin: 50% 0; }
.sn-ping { animation: sn-ping 1.6s cubic-bezier(0,0,.2,1) infinite; }
.sn-count { animation: sn-count .3s ease-out both; }
.sn-skeleton { background: linear-gradient(90deg,#f1f5f9 0,#e2e8f0 40%,#f1f5f9 80%); background-size: 800px 100%; animation: sn-shimmer 1.3s linear infinite; }
.sn-card { content-visibility: auto; contain-intrinsic-size: auto 150px; }
.sn-card:hover { transform: translateY(-2px); }
.sn-expand { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows .3s ease, opacity .25s ease, margin .3s ease; }
.sn-expand[data-open="true"] { grid-template-rows: 1fr; opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .sn-rise,.sn-pop,.sn-drop,.sn-fade,.sn-ring,.sn-ping,.sn-count,.sn-skeleton { animation: none !important; }
  .sn-card:hover { transform: none; }
  .sn-expand { transition: none; }
}
`;

/* =========================================================
   HELPERS
========================================================= */

const getInitials = (name) => {
  if (!name || typeof name !== "string") return "SA";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const getAvatarTheme = (name) => {
  if (!name) return AVATAR_PALETTES[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_PALETTES[sum % AVATAR_PALETTES.length];
};

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === "") return null;
  return currencyFmt.format(Number(value));
};

const formatDate = (date) => {
  if (!date) return "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-IN", dateTimeOpts);
};

const getRelativeTime = (date) => {
  if (!date) return "Recently";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Recently";
  const minutes = Math.floor(Math.max(0, Date.now() - parsed.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} Min${minutes === 1 ? "" : "s"} Ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Hour${hours === 1 ? "" : "s"} Ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} Day${days === 1 ? "" : "s"} Ago`;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false;
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const useClickOutside = (ref, active, handler) => {
  useEffect(() => {
    if (!active) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, active, handler]);
};

/* =========================================================
   CALENDAR POPUP
========================================================= */

const CalendarPicker = memo(({ selectedDate, onSelectDate }) => {
  const [viewDate, setViewDate] = useState(() =>
    selectedDate ? new Date(selectedDate) : new Date()
  );
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const daysIn = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const out = [];
    for (let i = first - 1; i >= 0; i--)
      out.push({ day: prevDays - i, current: false, date: new Date(year, month - 1, prevDays - i) });
    for (let d = 1; d <= daysIn; d++)
      out.push({ day: d, current: true, date: new Date(year, month, d) });
    const rest = (7 - (out.length % 7)) % 7;
    for (let d = 1; d <= rest; d++)
      out.push({ day: d, current: false, date: new Date(year, month + 1, d) });
    return out;
  }, [year, month]);

  const today = new Date();

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="sn-drop absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl bg-white p-4 shadow-2xl border border-slate-200/90"
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition active:scale-90"
          aria-label="Previous Month"
        >
          <ChevronLeft size={17} />
        </button>
        {/* key forces a quick fade whenever the month changes */}
        <span key={`${year}-${month}`} className="sn-fade text-sm font-bold text-slate-900">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition active:scale-90"
          aria-label="Next Month"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div key={`${year}-${month}`} className="sn-fade grid grid-cols-7 gap-1 text-center">
        {cells.map((cell, idx) => {
          const selected = selectedDate && isSameDay(cell.date, selectedDate);
          const isToday = isSameDay(cell.date, today);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDate(cell.date)}
              className={`h-8 sm:h-9 w-full rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center hover:scale-110 active:scale-95 ${
                selected
                  ? "bg-[#4338CA] text-white font-bold shadow-md shadow-indigo-600/30"
                  : cell.current
                  ? "text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                  : "text-slate-300 hover:bg-slate-50"
              } ${isToday && !selected ? "border border-indigo-300 font-bold text-indigo-600" : ""}`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => onSelectDate(new Date())}
          className="font-medium text-indigo-600 hover:text-indigo-800 transition"
        >
          Today
        </button>
        {selectedDate && (
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="font-medium text-rose-600 hover:text-rose-800 transition"
          >
            Clear Filter
          </button>
        )}
      </div>
    </div>
  );
});

/* =========================================================
   NOTIFICATION CARD (memoized: re-renders only when its own data changes)
========================================================= */

const DetailField = ({ label, value, truncate }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-bold text-slate-400 uppercase">{label}</p>
    <p className={`font-semibold text-slate-800 mt-0.5 ${truncate ? "truncate" : ""}`}>{value}</p>
  </div>
);


const getNotificationSummary = (notification) => {
  const type = notification?.type;
  const metadata = notification?.metadata || {};

  const registration =
    notification?.registrationId &&
    typeof notification.registrationId === "object"
      ? notification.registrationId
      : {};

  const hotelName =
    registration.hotelName ||
    metadata.hotelName ||
    notification?.hotelName ||
    "This hotel";

  const ownerName =
    registration.ownerName ||
    metadata.ownerName ||
    notification?.ownerName ||
    "The hotel owner";

 const previousPlan =
  metadata.previousPlanName ||
  metadata.oldPlanName ||
  metadata.fromPlanName ||
  "";

  const newPlan =
    metadata.newPlanName ||
    metadata.toPlanName ||
    metadata.planName ||
    registration.planId?.planName ||
    "New Plan";

  const billingCycle =
    metadata.billingCycle ||
    metadata.billingPeriod ||
    "";

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const actionDate = formatDate(
    metadata.upgradeDate ||
      metadata.startDate ||
      notification?.createdAt
  );

  const validUntil = formatDate(
    metadata.endDate ||
      metadata.subscriptionEndDate ||
      metadata.validUntil ||
      metadata.expiryDate ||
      metadata.expiresAt
  );

  const notificationMessage =
  String(notification?.message || "").toLowerCase();

const isUpgradeNotification =
  type === "subscription_upgraded" ||
  type === "subscription_upgrade" ||
  type === "plan_upgraded" ||
  type === "subscription_updated" ||
  type === "plan_changed" ||
  notificationMessage.includes("upgraded") ||
  notificationMessage.includes("upgrade");

const isRegistrationNotification =
  type === "registration_created" ||
  type === "registration_submitted" ||
  type === "hotel_registered" ||
  type === "hotel_registration" ||
  notificationMessage.includes("new hotel") ||
  notificationMessage.includes("registered");



  // =====================================================
// FALLBACK: SUBSCRIPTION UPGRADE
// =====================================================

if (isUpgradeNotification) {
  return {
    title: "Subscription Upgraded",
description:
  previousPlan
    ? `${hotelName} upgraded their subscription from ${previousPlan} to ${newPlan} on ${actionDate}${
        billingCycle
          ? ` with a ${billingCycle} billing cycle`
          : ""
      }${
        validUntil
          ? `. The new plan is valid until ${validUntil}`
          : "."
      }`
    : `${hotelName} upgraded their subscription to the ${newPlan} plan on ${actionDate}${
        billingCycle
          ? ` with a ${billingCycle} billing cycle`
          : ""
      }${
        validUntil
          ? `. The new plan is valid until ${validUntil}`
          : "."
      }`,

    badge: "Subscription Upgrade",
  };
}


// =====================================================
// FALLBACK: NEW HOTEL REGISTRATION
// =====================================================

if (isRegistrationNotification) {
  return {
    title: "New Hotel Registration",

    description:
      `${ownerName} registered ${hotelName} as a new hotel on ${actionDate}. The hotel registration has been submitted and is waiting for admin approval.`,

    badge: "New Hotel Registration",
  };
}

  switch (type) {

    // =====================================================
    // NEW HOTEL
    // =====================================================

    case "registration_created":
    case "registration_submitted":
      return {
        title: "New Hotel Registration",

        description:
          `${ownerName} registered ${hotelName} as a new hotel on ${actionDate}.`,

        badge: "New Hotel Registration",
      };


    // =====================================================
    // PLAN UPGRADE
    // =====================================================

    case "subscription_upgraded":
    case "subscription_upgrade":
    case "plan_upgraded":
      return {
        title: "Subscription Upgraded",

        description:
          `${hotelName} upgraded their subscription from ${previousPlan} to ${newPlan} on ${actionDate}${billingCycle ? ` with a ${billingCycle} billing cycle` : ""}${validUntil ? `. The new plan is valid until ${validUntil}` : ""}.`,

        badge: "Subscription Upgrade",
      };


    // =====================================================
    // NEW SUBSCRIPTION
    // =====================================================

    case "subscription_activated":
      return {
        title: "New Subscription Started",

        description:
          `${hotelName} started a ${newPlan} subscription on ${actionDate}${validUntil ? `. The subscription is valid until ${validUntil}` : ""}.`,

        badge: "New Subscription",
      };


    // =====================================================
    // RENEWAL
    // =====================================================

    case "subscription_renewed":
      return {
        title: "Subscription Renewed",

        description:
          `${hotelName} renewed their ${newPlan} subscription on ${actionDate}${validUntil ? `. The renewed plan is valid until ${validUntil}` : ""}.`,

        badge: "Subscription Renewal",
      };


    // =====================================================
    // PAYMENT
    // =====================================================

    case "payment_submitted":
      return {
        title: "Payment Submitted",

        description:
          `${hotelName} submitted a subscription payment for admin review.`,

        badge: "Payment Submitted",
      };


    case "payment_received":
    case "payment_success":
      return {
        title: "Payment Successful",

        description:
          `The subscription payment from ${hotelName} was successfully received.`,

        badge: "Payment Received",
      };


    case "payment_failed":
      return {
        title: "Payment Failed",

        description:
          `The subscription payment from ${hotelName} could not be completed.`,

        badge: "Payment Failed",
      };


    case "payment_reversed":
      return {
        title: "Payment Reversed",

        description:
          `The previous subscription payment from ${hotelName} was reversed or refunded.`,

        badge: "Payment Reversed",
      };


    // =====================================================
    // KYC
    // =====================================================

    case "kyc_pending":
      return {
        title: "KYC Verification Required",

        description:
          `${hotelName} submitted documents that require verification.`,

        badge: "KYC Review",
      };


    case "kyc_verified":
      return {
        title: "KYC Verification Completed",

        description:
          `${hotelName}'s submitted documents were successfully verified.`,

        badge: "KYC Verified",
      };


    case "kyc_failed":
      return {
        title: "KYC Verification Failed",

        description:
          `${hotelName}'s submitted documents were not approved.`,

        badge: "KYC Failed",
      };


    // =====================================================
    // DEFAULT
    // =====================================================

    default:
      return {
        title: "New Notification",

        description:
          notification?.message ||
          `${hotelName} has a new activity.`,

        badge: "Activity",
      };
  }
};



const NotificationItem = memo(
({
  notification,
  onMarkRead,
  onViewApplication,
  onOpenDetails,
  isMarking,
  index,
}) => {    const [expanded, setExpanded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    useClickOutside(menuRef, menuOpen, closeMenu);

    const registration =
      notification?.registrationId && typeof notification.registrationId === "object"
        ? notification.registrationId
        : {};
    const metadata = notification?.metadata || {};
    const config = TYPE_CONFIG[notification?.type] || TYPE_CONFIG.default;




    const hotelName = registration.hotelName || metadata.hotelName || "Hotel Partner";
    const ownerName = registration.ownerName || metadata.ownerName || "Hotel Owner";
    const email = registration.email || metadata.email || "-";
    const phone = registration.phone || metadata.phone || "-";
    const planName = registration.planId?.planName || metadata.planName;
    const formattedPrice = formatCurrency(registration.planId?.price || metadata.planPrice);
    const registrationId = registration._id || notification?.registrationId;
    const isRead = !!notification?.isRead;
    const requiresApproval = !isRead && APPROVAL_TYPES.has(notification?.type);

    const avatar = getAvatarTheme(hotelName || ownerName);
    const initials = getInitials(hotelName || ownerName);

    // Only the first screenful gets a staggered entrance; later cards skip the delay.
    const delay = index < 10 ? index * 45 : 0;

    return (
      <div
  onClick={() => onOpenDetails(notification)}
  style={{ animationDelay: `${delay}ms` }}
  className={`
    sn-rise
    sn-card
    group
    relative
    cursor-pointer
    rounded-2xl
    border
    bg-white
    transition-all
    duration-200
    hover:-translate-y-0.5
    hover:border-indigo-300
    hover:shadow-[0_10px_28px_rgba(79,70,229,0.12)]
    ${menuOpen ? "z-20" : "z-0"}
    ${
      isRead
        ? "border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
        : "border-indigo-200/90 shadow-[0_4px_16px_rgba(79,70,229,0.06)]"
    }
  `}
>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-3.5 min-w-0">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br ${avatar} text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-sm shadow-indigo-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
              >
                {initials}
              </div>

              <div className="min-w-0">
                <div className="text-xs sm:text-sm text-slate-800 leading-snug">
                  <span className="font-bold text-slate-900">{hotelName}</span>{" "}
                  <span className="text-slate-600 font-normal">{config.actionText}</span>
                  {planName && (
                    <span className="text-slate-600 font-normal">
                      {" for the "}
                      <span className="font-semibold text-slate-900">{planName}</span>
                      {" plan"}
                    </span>
                  )}
                  <span className="text-slate-600 font-normal">.</span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                    {getRelativeTime(notification?.createdAt)}
                  </span>
                  {!isRead && (
                    <>
                      <span className="relative flex w-1.5 h-1.5">
                        <span className="sn-ping absolute inset-0 rounded-full bg-indigo-500" />
                        <span className="relative w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      </span>
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        New
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {formattedPrice && (
                <span className="hidden sm:inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {formattedPrice}
                </span>
              )}

              <div className="relative" ref={menuRef}>
              

                {menuOpen && (
                  <div className="sn-drop absolute right-0 top-full mt-1 z-30 w-44 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 text-xs font-medium">
                    {!isRead && (
                      <button
                        type="button"
                        disabled={isMarking}
                        onClick={() => {
                          setMenuOpen(false);
                          onMarkRead(notification);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition"
                      >
                        <Check size={14} /> Mark as read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setExpanded((v) => !v);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition"
                    >
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {expanded ? "Hide Details" : "Quick Details"}
                    </button>
                    {registrationId && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onViewApplication(notification);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition"
                      >
                        <ExternalLink size={14} /> Go to Details
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {requiresApproval && (
            <div className="sn-pop mt-3.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
                <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                <span>Please check the hotel details and documents carefully before you click approve.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onViewApplication(notification)}
                  className="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all shadow-sm shadow-green-600/20 hover:shadow-md active:scale-95"
                >
                  Approve Now
                </button>
                <button
                  type="button"
                  onClick={() => onMarkRead(notification)}
                  disabled={isMarking}
                  className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-xs font-semibold transition active:scale-95 disabled:opacity-60"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Smooth height animation with no layout thrash: grid 0fr -> 1fr */}
          <div className="sn-expand" data-open={expanded} aria-hidden={!expanded}>
            <div className="overflow-hidden">
              <div className="mt-4 pt-3.5 border-t border-slate-100 rounded-xl bg-slate-50/80 p-3.5 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <DetailField label="Hotel Owner" value={ownerName} />
                <DetailField label="Contact Email" value={email} truncate />
                <DetailField label="Contact Phone" value={phone} />
                <DetailField label="Event Time" value={formatDate(notification?.createdAt)} />
                {notification?.message && (
                  <div className="sm:col-span-2 lg:col-span-4 mt-1 pt-2 border-t border-slate-200/60">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Description</p>
                    <p className="text-slate-600 mt-0.5">{notification.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
             

              {requiresApproval ? (
                <button
                  type="button"
                  onClick={() => onViewApplication(notification)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition active:scale-95"
                >
                  Approve Now
                </button>
              ) : !isRead ? (
                <button
                  type="button"
                  disabled={isMarking}
                  onClick={() => onMarkRead(notification)}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition active:scale-95 flex items-center gap-1 disabled:opacity-60"
                >
                  {isMarking ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                  <span>Mark Read</span>
                </button>
              ) : (
                <span className="sn-pop inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <CheckCheck size={13} className="text-emerald-500" /> Read
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => onViewApplication(notification)}
              className="group/btn px-3.5 py-1.5 rounded-lg border border-blue-500/80 hover:bg-blue-50 text-blue-600 text-xs font-semibold transition active:scale-95 flex items-center gap-1.5"
            >
              <span>Go to Details</span>
              <ArrowUpRight
                size={13}
                className="transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5"
              />
            </button>
          </div>
        </div>
      </div>
    );
  }
);

/* =========================================================
   LOADING SKELETON (feels faster than a spinner)
========================================================= */

const SkeletonList = () => (
  <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-3" aria-busy="true">
    <div className="sn-skeleton h-24 rounded-2xl" />
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="sn-skeleton h-32 rounded-2xl" style={{ animationDelay: `${i * 120}ms` }} />
    ))}
  </div>
);

/* =========================================================
   MAIN COMPONENT
========================================================= */

const SaaSAdminNotifications = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("all");
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [selectedNotification, setSelectedNotification] = useState(null);
const [showNotificationDetails, setShowNotificationDetails] =
  useState(false);






const NotificationDetailsModal = ({
  notification,
  onClose,
  onGoToDetails,
}) => {
  const registration =
    notification?.registrationId &&
    typeof notification.registrationId === "object"
      ? notification.registrationId
      : {};

  const metadata = notification?.metadata || {};

  const hotelName =
    registration.hotelName ||
    metadata.hotelName ||
    "Hotel Partner";

  const ownerName =
    registration.ownerName ||
    metadata.ownerName ||
    "Hotel Owner";

  const email =
    registration.email ||
    metadata.email ||
    "-";

  const phone =
    registration.phone ||
    metadata.phone ||
    "-";

  const planName =
    registration.planId?.planName ||
    metadata.planName ||
    "-";

  const previousPlanName =
    metadata.previousPlanName ||
    metadata.oldPlanName ||
    metadata.fromPlanName ||
    "";

  const newPlanName =
    metadata.newPlanName ||
    metadata.toPlanName ||
    metadata.planName ||
    planName ||
    "";

  const billingCycle =
    metadata.billingCycle ||
    metadata.billingPeriod ||
    "";

  const planStartDate =
    metadata.startDate ||
    metadata.subscriptionStartDate ||
    metadata.validFrom ||
    notification?.createdAt;

  const planEndDate = (() => {
    // Try stored end date first
    const stored =
      metadata.endDate ||
      metadata.subscriptionEndDate ||
      metadata.validUntil ||
      metadata.expiryDate ||
      metadata.expiresAt;
    if (stored) return stored;

    // Calculate from start date + billing cycle
    const start = planStartDate ? new Date(planStartDate) : null;
    if (!start || Number.isNaN(start.getTime())) return null;

    const cycle = (billingCycle || "").toLowerCase();
    const end = new Date(start);
    if (cycle.includes("year") || cycle === "yearly" || cycle === "annual") {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      // Default to monthly (30 days)
      end.setDate(end.getDate() + 30);
    }
    return end;
  })();

  const upgradeDate =
    metadata.upgradeDate ||
    metadata.updatedAt ||
    notification?.createdAt;

  const planPrice =
    registration.planId?.price ??
    metadata.planPrice ??
    metadata.amount;

  const summary = getNotificationSummary(notification);

  const registrationId =
    registration?._id ||
    notification?.registrationId;

  const createdAt = notification?.createdAt;

  const isPayment =
    PAYMENT_TYPES.has(notification?.type);

  const isRegistration =
    notification?.type === "registration_created" ||
    notification?.type === "registration_submitted";

  const isUpgrade =
    notification?.type === "subscription_upgraded" ||
    notification?.type === "plan_upgraded" ||
    notification?.type === "subscription_upgrade" ||
    (notification?.type === "payment_verified" &&
      (notification?.title?.toLowerCase()?.includes("upgraded") ||
       notification?.title?.toLowerCase()?.includes("upgrade")));

  const isSubscription =
    notification?.type === "subscription_activated" ||
    notification?.type === "subscription_renewed" ||
    isUpgrade;

  const formatReadableDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatReadableDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
  <div
    className="
      fixed
      inset-0
      z-[100]
      flex
      items-center
      justify-center
      bg-slate-950/45
      p-4
      backdrop-blur-sm
    "
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="
        sn-pop
        w-full
        max-w-[620px]
        max-h-[90vh]
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-[0_25px_80px_rgba(15,23,42,0.25)]
      "
    >

      {/* HEADER */}
      <div
        className="
          border-b
          border-slate-100
          bg-gradient-to-r
          from-[#F8FAFF]
          to-[#F3F6FF]
          px-5
          py-5
          sm:px-6
        "
      >
        <div className="flex items-start justify-between gap-4">

          <div className="flex items-start gap-3">

            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-indigo-100
                text-indigo-600
              "
            >
              <Bell size={20} />
            </div>

            <div className="min-w-0">

              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-500">
                Notification Details
              </p>

              <h2 className="mt-1 text-[20px] font-extrabold tracking-[-0.02em] text-slate-900">
                {summary.title}
              </h2>

             

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X size={17} />
          </button>

        </div>
      </div>

      {/* CONTENT */}
      <div className="max-h-[65vh] overflow-y-auto p-5 sm:p-6">

        {/* WHAT HAPPENED */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">

          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-indigo-500">
            Notification Detail
          </p>

          <p className="mt-2 text-[14px] leading-6 text-black">
            {summary.description}
          </p>

          {isRegistration && (
            <p className="mt-2 text-[12px] font-medium leading-5 text-slate-600">
              A new hotel registration was submitted and is waiting for admin
              approval.
            </p>
          )}

          {isUpgrade && (
            <p className="mt-2 text-[12px] font-medium leading-5 text-slate-600">
              The hotel changed from the previous subscription plan to the
              newly selected plan.
            </p>
          )}

          {isPayment && (
            <p className="mt-2 text-[12px] font-medium leading-5 text-slate-600">
              This payment activity is related to the hotel's subscription.
            </p>
          )}

        </div>

        {/* USER DETAILS */}
        <div className="mt-5">

          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
            User Details
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[10px] font-bold text-slate-400">
                Hotel Name
              </p>
              <p className="mt-1 text-[13px] font-bold text-slate-800">
                {hotelName}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[10px] font-bold text-slate-400">
                Owner Name
              </p>
              <p className="mt-1 text-[13px] font-bold text-slate-800">
                {ownerName}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[10px] font-bold text-slate-400">
                Email
              </p>
              <p className="mt-1 break-all text-[13px] font-semibold text-slate-700">
                {email}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5">
              <p className="text-[10px] font-bold text-slate-400">
                Phone
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-700">
                {phone}
              </p>
            </div>

          </div>
        </div>

        {/* ACTIVITY DETAILS */}
        <div className="mt-5">

          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
            Activity Details
          </p>

          <div className="overflow-hidden rounded-xl border border-slate-200">

            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">

              <div className="p-3.5">
                <p className="text-[10px] font-bold text-slate-400">
                  Activity
                </p>

                <p className="mt-1 text-[13px] font-bold text-slate-800">
                  {summary.badge}
                </p>
              </div>

              <div className="p-3.5">
                <p className="text-[10px] font-bold text-slate-400">
                  Date & Time
                </p>

                <p className="mt-1 text-[13px] font-semibold text-slate-700">
                  {formatReadableDateTime(createdAt)}
                </p>
              </div>

            </div>

            {(planName !== "-" || planPrice !== undefined) && (
              <div className="grid grid-cols-1 divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">

                <div className="p-3.5">
                  <p className="text-[10px] font-bold text-slate-400">
                    Subscription Plan
                  </p>

                  <p className="mt-1 text-[13px] font-bold text-slate-800">
                    {planName}
                  </p>
                </div>

                <div className="p-3.5">
                  <p className="text-[10px] font-bold text-slate-400">
                    Amount
                  </p>

                  <p className="mt-1 text-[13px] font-bold text-slate-800">
                    {formatCurrency(planPrice) || "-"}
                  </p>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* SUBSCRIPTION CHANGE */}
        {isUpgrade && (
          <div className="mt-5">

            <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
              Subscription Change
            </p>

            <div className="overflow-hidden rounded-xl border border-indigo-100">

              <div className="grid grid-cols-1 sm:grid-cols-2">

                <div className="border-b border-slate-100 p-4 sm:border-r">
                  <p className="text-[10px] font-bold text-slate-400">
                    Previous Plan
                  </p>

                  <p className="mt-1 text-[14px] font-extrabold text-slate-700">
                    {previousPlanName || "Not available"}
                  </p>
                </div>

                <div className="border-b border-slate-100 p-4">
                  <p className="text-[10px] font-bold text-slate-400">
                    New Plan
                  </p>

                  <p className="mt-1 text-[14px] font-extrabold text-indigo-600">
                    {newPlanName || "Not available"}
                  </p>
                </div>

                <div className="border-b border-slate-100 p-4 sm:border-r">
                  <p className="text-[10px] font-bold text-slate-400">
                    Billing Cycle
                  </p>

                  <p className="mt-1 text-[13px] font-bold capitalize text-slate-800">
                    {billingCycle || "Not available"}
                  </p>
                </div>

                <div className="border-b border-slate-100 p-4">
                  <p className="text-[10px] font-bold text-slate-400">
                    Upgrade Date
                  </p>

                  <p className="mt-1 text-[13px] font-bold text-slate-800">
                    {formatReadableDateTime(upgradeDate)}
                  </p>
                </div>

                <div className="border-b border-slate-100 p-4 sm:border-r">
                  <p className="text-[10px] font-bold text-slate-400">
                    Plan Started
                  </p>

                  <p className="mt-1 text-[13px] font-bold text-slate-800">
                    {formatReadableDate(planStartDate)}
                  </p>
                </div>

                <div className="border-b border-slate-100 p-4">
                  <p className="text-[10px] font-bold text-slate-400">
                    Valid Until
                  </p>

                  <p className="mt-1 text-[13px] font-bold text-slate-800">
                    {formatReadableDate(planEndDate)}
                  </p>
                </div>

                <div className="p-4 sm:border-r">
                  <p className="text-[10px] font-bold text-slate-400">
                    New Plan Amount
                  </p>

                  <p className="mt-1 text-[14px] font-extrabold text-slate-900">
                    {formatCurrency(planPrice) || "-"}
                  </p>
                </div>

                <div className="p-4">
                  <p className="text-[10px] font-bold text-slate-400">
                    Status
                  </p>

                  <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    Active
                  </span>
                </div>

              </div>

            </div>
          </div>
        )}

    

      </div>

      {/* FOOTER */}
      <div
        className="
          flex
          flex-col-reverse
          gap-2
          border-t
          border-slate-100
          bg-slate-50/70
          p-4
          sm:flex-row
          sm:justify-end
        "
      >

        <button
          type="button"
          onClick={onClose}
          className="
            rounded-xl
            border
            border-slate-300
            bg-white
            px-4
            py-2.5
            text-[12px]
            font-bold
            text-slate-700
            transition
            hover:bg-slate-50
          "
        >
          Close
        </button>

        {!isUpgrade && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onGoToDetails(notification);
          }}
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-[#4338CA]
            px-4
            py-2.5
            text-[12px]
            font-bold
            text-white
            shadow-sm
            transition
            hover:bg-[#3730A3]
          "
        >
          {isPayment ? "View Subscription" : "View Hotel Details"}
          <ArrowUpRight size={14} />
        </button>
        )}

      </div>

    </div>
  </div>
);
};

  // Search input stays instant; the heavy filtering runs on a deferred value.
  const deferredQuery = useDeferredValue(searchQuery);

  const calendarRef = useRef(null);
  const closeCalendar = useCallback(() => setShowCalendar(false), []);
  useClickOutside(calendarRef, showCalendar, closeCalendar);

  /* ---------- LOAD ---------- */

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminNotifications();
      if (!response?.success) {
        throw new Error(response?.message || "Unable to load notifications.");
      }
      const list = Array.isArray(response?.data) ? response.data : [];
      setNotifications(list);
      setUnreadCount(
        Number.isFinite(response?.unreadCount)
          ? response.unreadCount
          : list.filter((item) => !item.isRead).length
      );
    } catch (err) {
      console.error("Load SaaS notifications error:", err);
      setError(err?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Reset pagination whenever filters change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, selectedDate, deferredQuery]);

  /* ---------- ACTIONS (stable identities so memoized cards don't re-render) ---------- */

  const handleMarkAsRead = useCallback(async (notification) => {
    if (!notification || notification.isRead) return;
    try {
      setMarkingId(notification._id);
      await markNotificationAsRead(notification._id);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notification._id ? { ...item, isRead: true, readAt: new Date() } : item
        )
      );
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    } catch (err) {
      console.error("Mark notification read error:", err);
      setError(err?.message || "Unable to mark notification as read.");
    } finally {
      setMarkingId(null);
    }
  }, []);


    const handleOpenNotificationDetails = useCallback(
  async (notification) => {
    if (!notification) return;

    setSelectedNotification(notification);
    setShowNotificationDetails(true);

    if (!notification.isRead) {
      await handleMarkAsRead(notification);
    }
  },
  [handleMarkAsRead]
);

  
  const handleMarkAllAsRead = useCallback(async () => {
    const unreads = notifications.filter((item) => !item.isRead);
    if (unreads.length === 0) return;
    try {
      setMarkingAll(true);
      setError("");
      await Promise.all(unreads.map((n) => markNotificationAsRead(n._id)));
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true, readAt: new Date() })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Mark all notifications read error:", err);
      setError(err?.message || "Unable to mark all notifications as read.");
    } finally {
      setMarkingAll(false);
    }
  }, [notifications]);

  const handleViewApplication = useCallback(
    async (notification) => {
      await handleMarkAsRead(notification);
      const regId = notification?.registrationId?._id || notification?.registrationId;

      if (PAYMENT_TYPES.has(notification?.type)) {
        navigate(regId ? `/saas-admin/subscriptions?registrationId=${regId}` : "/saas-admin/subscriptions");
        return;
      }
      navigate(regId ? `/saas-admin/hotels?registrationId=${regId}` : "/saas-admin/hotels");
    },
    [handleMarkAsRead, navigate]
  );

  /* ---------- DERIVED DATA (one pass each) ---------- */

  // Pre-compute lowercase search text and category flags ONCE per data change,
  // not on every keystroke.
  const indexed = useMemo(
    () =>
      notifications.map((item) => ({
        item,
        review: REVIEW_TYPES.has(item.type),
        payment: PAYMENT_TYPES.has(item.type),
        hay: [
          item.registrationId?.hotelName || item.metadata?.hotelName,
          item.registrationId?.ownerName || item.metadata?.ownerName,
          item.title,
          item.message,
        ]
          .filter(Boolean)
          .join("\u0000")
          .toLowerCase(),
      })),
    [notifications]
  );

  const tabCounts = useMemo(() => {
    let unread = 0;
    for (const e of indexed) {
      if (!e.item.isRead) unread++;
    }
    return { all: indexed.length, unread };
  }, [indexed]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const out = [];
    for (const e of indexed) {
      if (activeTab === "unread" && e.item.isRead) continue;
      if (selectedDate && !isSameDay(e.item.createdAt, selectedDate)) continue;
      if (q && !e.hay.includes(q)) continue;
      out.push(e.item);
    }
    return out;
  }, [indexed, activeTab, selectedDate, deferredQuery]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const formattedSelectedDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const hasFilters = !!(searchQuery || selectedDate || activeTab !== "all");

  const resetFilters = useCallback(() => {
    setActiveTab("all");
    setSelectedDate(null);
    setSearchQuery("");
  }, []);

  const handleSelectDate = useCallback((d) => {
    setSelectedDate(d);
    setShowCalendar(false);
  }, []);

  /* ---------- RENDER ---------- */

  if (loading) {
    return (
      <>
        <style>{ANIMATION_CSS}</style>
        <SkeletonList />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-16 font-sans antialiased">
      <style>{ANIMATION_CSS}</style>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* TOOLBAR */}
        <div className="sn-rise relative z-30 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-2 sm:p-3 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 md:pb-0" role="tablist">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 active:scale-95 ${
                      active
                        ? "text-[#4338CA] bg-indigo-50/80"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {tab.id === "unread" && tabCounts.unread > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                    {tab.label}
                    {/* key re-triggers the count animation when the number changes */}
                    <span
                      key={tabCounts[tab.countKey]}
                      className="sn-count text-[11px] font-semibold text-slate-400"
                    >
                      {tabCounts[tab.countKey]}
                    </span>
                    {/* underline grows from the centre */}
                    <span
                      className={`absolute bottom-0 left-3 right-3 h-0.5 bg-[#4338CA] rounded-full origin-center transition-transform duration-300 ${
                        active ? "scale-x-100" : "scale-x-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <div className="relative z-50" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setShowCalendar((v) => !v)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm ${
                    selectedDate
                      ? "border-[#4338CA] bg-indigo-50 text-[#4338CA]"
                      : "border-slate-300/90 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400"
                  }`}
                >
                  <Calendar size={15} className="text-slate-500" />
                  <span>{formattedSelectedDate || "Select Date"}</span>
                  {selectedDate && (
                    <span
                      role="button"
                      aria-label="Clear date"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(null);
                      }}
                      className="ml-1 p-0.5 rounded-full hover:bg-indigo-200 text-indigo-700 transition"
                    >
                      <X size={12} />
                    </span>
                  )}
                </button>

                {showCalendar && (
                  <CalendarPicker selectedDate={selectedDate} onSelectDate={handleSelectDate} />
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={markingAll}
                  onClick={handleMarkAllAsRead}
                  className="sn-pop inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                >
                  {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                  <span className="hidden sm:inline">Mark all read</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm group/search">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/search:text-indigo-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by hotel, owner, or text..."
                className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="sn-pop absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
              <span>
                Showing <span className="text-slate-700 font-bold">{filtered.length}</span> of{" "}
                {notifications.length} events
              </span>
              {selectedDate && (
                <span className="sn-pop bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                  On {formattedSelectedDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="sn-pop mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 flex items-start gap-2.5 text-xs text-rose-700">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="sn-rise bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
            <div className="sn-ring w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <Bell size={24} />
            </div>
            <h3 className="mt-4 font-bold text-slate-800 text-base">
              No notifications match your filters
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {hasFilters
                ? "Try adjusting your search query, clearing the date filter, or selecting 'All'."
                : "You're all caught up! New hotel registrations and subscription events will show up here."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-bold transition shadow-sm active:scale-95"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {visible.map((item, index) => (
                <NotificationItem
  key={item._id}
  index={index}
  notification={item}
  onMarkRead={handleMarkAsRead}
  onViewApplication={handleViewApplication}
  onOpenDetails={handleOpenNotificationDetails}
  isMarking={markingId === item._id}
/>
              ))}
            </div>

            {filtered.length > visibleCount && (
              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition active:scale-95"
                >
                  Load more ({filtered.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>



        )}
      </div>

      {showNotificationDetails && selectedNotification && (
  <NotificationDetailsModal
    notification={selectedNotification}
    onClose={() => {
      setShowNotificationDetails(false);
      setSelectedNotification(null);
    }}
    onGoToDetails={handleViewApplication}
  />
)}
    </div>
  );
};

export default SaaSAdminNotifications;