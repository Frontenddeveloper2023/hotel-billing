import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  Check,
  CheckCheck,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  User,
  Building2,
  CalendarDays,
  Phone,
  Mail,
  ReceiptText,
  AlertCircle,
  ShieldCheck,
  FileCheck2,
  Clock3,
  CircleAlert,
  CircleCheck,
  WalletCards,
  Database,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  getAdminNotifications,
  markNotificationAsRead,
} from "../../service/saasNotificationApi";

/* =========================================================
   CONSTANTS
========================================================= */

const PAYMENT_TYPES = [
  "payment_submitted",
  "payment_received",
  "payment_failed",
  "payment_reversed",
  "payment_success",
  "escrow_cleared",
  "escrow_pending",
  "subscription_renewed",
  "subscription_activated",
];

const KYC_TYPES = [
  "registration_created",
  "registration_submitted",
  "kyc_pending",
  "kyc_verified",
  "kyc_failed",
  "kyc_rejected",
  "hotel_registered",
];

const TYPE_CONFIG = {
  payment_submitted: {
    label: "Subscription Payment",
    icon: CreditCard,
    iconClass: "bg-indigo-100 text-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700",
  },

  payment_received: {
    label: "Payment Received",
    icon: WalletCards,
    iconClass: "bg-emerald-100 text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },

  payment_failed: {
    label: "Payment Failed",
    icon: CircleAlert,
    iconClass: "bg-red-100 text-red-600",
    badgeClass: "bg-red-50 text-red-700",
  },

  payment_reversed: {
    label: "Payment Reversed",
    icon: CircleAlert,
    iconClass: "bg-red-100 text-red-600",
    badgeClass: "bg-red-50 text-red-700",
  },

  escrow_cleared: {
    label: "Subscription Escrow Cleared",
    icon: ShieldCheck,
    iconClass: "bg-emerald-100 text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },

  escrow_pending: {
    label: "Escrow Verification",
    icon: Clock3,
    iconClass: "bg-amber-100 text-amber-600",
    badgeClass: "bg-amber-50 text-amber-700",
  },

  subscription_renewed: {
    label: "Subscription Renewal",
    icon: RefreshCw,
    iconClass: "bg-emerald-100 text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },

  subscription_activated: {
    label: "Subscription Activated",
    icon: CheckCheck,
    iconClass: "bg-indigo-100 text-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700",
  },

  registration_created: {
    label: "New Hotel Registration",
    icon: Building2,
    iconClass: "bg-indigo-100 text-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700",
  },

  registration_submitted: {
    label: "Registration Submitted",
    icon: FileCheck2,
    iconClass: "bg-indigo-100 text-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700",
  },

  kyc_pending: {
    label: "KYC Verification",
    icon: ShieldCheck,
    iconClass: "bg-amber-100 text-amber-600",
    badgeClass: "bg-amber-50 text-amber-700",
  },

  kyc_verified: {
    label: "KYC Verified",
    icon: ShieldCheck,
    iconClass: "bg-emerald-100 text-emerald-600",
    badgeClass: "bg-emerald-50 text-emerald-700",
  },

  kyc_failed: {
    label: "KYC Verification Failed",
    icon: CircleAlert,
    iconClass: "bg-red-100 text-red-600",
    badgeClass: "bg-red-50 text-red-700",
  },

  tenant_provisioned: {
    label: "Tenant Instance Created",
    icon: Database,
    iconClass: "bg-indigo-100 text-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700",
  },

  default: {
    label: "SaaS Platform Update",
    icon: Bell,
    iconClass: "bg-indigo-100 text-indigo-600",
    badgeClass: "bg-indigo-50 text-indigo-700",
  },
};

/* =========================================================
   HELPERS
========================================================= */

const formatStatus = (value) => {
  if (!value) return "-";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatPaymentStatus = (value) => {
  if (!value) return "Not Available";

  const labels = {
    paid: "Paid",
    partially_paid: "Partially Paid",
    pending: "Payment Pending",
    payment_pending: "Payment Pending",
    payment_failed: "Payment Failed",
    failed: "Payment Failed",
    payment_reversed: "Payment Reversed",
    reversed: "Payment Reversed",
    escrow_confirmed: "Paid & Escrow Confirmed",
    escrow_pending: "Escrow Pending Verification",
    settled: "Settled in Full",
  };

  return labels[value] || formatStatus(value);
};

const formatBillingCycle = (value) => {
  if (!value) return "-";

  const labels = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Annual",
    annual: "Annual",
  };

  return labels[value] || formatStatus(value);
};

const formatCurrency = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getRelativeTime = (date) => {
  if (!date) return "Recently";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Recently";
  }

  const diff =
    Date.now() - parsed.getTime();

  const minutes = Math.floor(
    diff / 60000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} min${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  return `${days} day${
    days === 1 ? "" : "s"
  } ago`;
};

const getTypeConfig = (type) => {
  return (
    TYPE_CONFIG[type] ||
    TYPE_CONFIG.default
  );
};

const isPaymentNotification = (
  notification
) => {
  return PAYMENT_TYPES.includes(
    notification?.type
  );
};

const isKycNotification = (
  notification
) => {
  return KYC_TYPES.includes(
    notification?.type
  );
};

const getNotificationCategory = (
  notification
) => {
  if (
    isPaymentNotification(notification)
  ) {
    return "payments";
  }

  if (
    isKycNotification(notification)
  ) {
    return "kyc";
  }

  return "all";
};

const getSeverity = (notification) => {
  const type = notification?.type;

  if (
    type === "payment_failed" ||
    type === "payment_reversed" ||
    type === "kyc_failed" ||
    type === "kyc_rejected"
  ) {
    return "alert";
  }

  if (!notification?.isRead) {
    return "new";
  }

  return "normal";
};

const getNotificationTitle = (
  notification
) => {
  if (notification?.title) {
    return notification.title;
  }

  const type =
    notification?.type;

  const titles = {
    payment_submitted:
      "New Subscription Payment Received",

    payment_failed:
      "Subscription Payment Failed",

    payment_reversed:
      "Payment Reversed",

    registration_created:
      "New Hotel Registration",

    registration_submitted:
      "New Hotel Application Received",

    tenant_provisioned:
      "Hotel Account Successfully Created",

    subscription_renewed:
      "Subscription Renewed",

    subscription_activated:
      "Subscription Activated",
  };

  return (
    titles[type] ||
    "SaaS Platform Notification"
  );
};

/* =========================================================
   DETAIL ITEM
========================================================= */

const DetailItem = ({
  icon: Icon,
  label,
  value,
  valueClass = "text-slate-900",
}) => {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            size={13}
            className="text-slate-400 shrink-0"
          />
        )}

        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>
      </div>

      <p
        className={`mt-1 text-xs sm:text-sm font-semibold break-words ${valueClass}`}
      >
        {value || "-"}
      </p>
    </div>
  );
};

/* =========================================================
   NOTIFICATION CARD
========================================================= */

const NotificationCard = ({
  notification,
  onMarkRead,
  onViewApplication,
  markingId,
}) => {
  const registration =
    notification?.registrationId &&
    typeof notification.registrationId ===
      "object"
      ? notification.registrationId
      : {};

  const metadata =
    notification?.metadata || {};

  const config = getTypeConfig(
    notification?.type
  );

  const Icon = config.icon;

  const severity =
    getSeverity(notification);

  const hotelName =
    registration?.hotelName ||
    metadata?.hotelName ||
    "Hotel";

  const ownerName =
    registration?.ownerName ||
    metadata?.ownerName ||
    "-";

  const email =
    registration?.email ||
    metadata?.email ||
    "-";

  const phone =
    registration?.phone ||
    metadata?.phone ||
    "-";

  const billingCycle =
    registration?.billingCycle ||
    metadata?.billingCycle;

  const paymentStatus =
    registration?.paymentStatus ||
    metadata?.paymentStatus;

  const transactionId =
    registration?.paymentTransactionId ||
    metadata?.paymentTransactionId;

  const registrationId =
    registration?._id ||
    notification?.registrationId;

  const planName =
    registration?.planId?.planName ||
    metadata?.planName;

  const planPrice =
    registration?.planId?.price ||
    metadata?.planPrice;

  const formattedPlanPrice =
    formatCurrency(planPrice);

  return (
    <article
      className={`
        rounded-2xl border p-4 sm:p-5 lg:p-6
        transition-all duration-200
        ${
          notification?.isRead
            ? "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
            : "bg-white border-indigo-200 shadow-[0_3px_15px_rgba(67,56,202,0.07)]"
        }
      `}
    >
      {/* =================================================
          TOP
      ================================================= */}

      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">

        <div className="flex items-start gap-3 sm:gap-4 min-w-0">

          {/* ICON */}

          <div
            className={`
              w-11 h-11 sm:w-12 sm:h-12
              rounded-xl
              flex items-center justify-center
              shrink-0
              ${config.iconClass}
            `}
          >
            <Icon
              size={21}
              strokeWidth={2}
            />
          </div>

          {/* CONTENT */}

          <div className="min-w-0">

            {/* BADGES */}

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">

              {!notification?.isRead && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  NEW
                </span>
              )}

              {severity === "alert" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  <CircleAlert size={10} />
                  NEEDS ATTENTION
                </span>
              )}

              <span
                className={`
                  inline-flex items-center
                  rounded-full px-2 py-0.5
                  text-[10px] font-semibold
                  ${config.badgeClass}
                `}
              >
                {config.label}
              </span>

              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400">
                <Clock3 size={11} />
                {formatDate(
                  notification?.createdAt
                )}
              </span>

            </div>

            {/* TITLE */}

            <h3 className="mt-1.5 text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-6">
              {getNotificationTitle(
                notification
              )}
            </h3>

            {/* MESSAGE */}

            <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-5 sm:leading-6 max-w-4xl">
              {notification?.message ||
                "A new event has been recorded in the SaaS platform."}
            </p>

          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex items-center gap-2 xl:shrink-0">

          {!notification?.isRead && (
            <button
              type="button"
              disabled={
                markingId ===
                notification?._id
              }
              onClick={() =>
                onMarkRead(
                  notification
                )
              }
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#F3F4FF] text-slate-700 hover:bg-[#E9E8FF] text-xs font-semibold transition disabled:opacity-50"
            >
              {markingId ===
              notification?._id ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Check size={14} />
              )}

              Mark Read
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onViewApplication(
                notification
              )
            }
            className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-lg bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs font-semibold transition"
          >
            View Application
            <ExternalLink size={14} />
          </button>

        </div>
      </div>

      {/* =================================================
          DETAILS
      ================================================= */}

      <div className="mt-5 rounded-xl bg-[#F7F8FE] p-3.5 sm:p-4">

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">

          {/* HOTEL */}

          <DetailItem
            icon={Building2}
            label="Hotel Tenant"
            value={hotelName}
          />

          {/* REGISTRATION */}

          <DetailItem
            icon={FileCheck2}
            label="Application ID"
            value={
              typeof registrationId ===
              "object"
                ? registrationId?._id
                : registrationId
            }
            valueClass="text-indigo-700"
          />

          {/* OWNER */}

          <DetailItem
            icon={User}
            label="Hotel Owner"
            value={ownerName}
          />

          {/* EMAIL */}

          <DetailItem
            icon={Mail}
            label="Owner Email"
            value={email}
          />

          {/* PHONE */}

          <DetailItem
            icon={Phone}
            label="Contact Phone"
            value={phone}
          />

          {/* PLAN */}

          <DetailItem
            icon={CreditCard}
            label="Subscription Plan"
            value={
              planName
                ? `${planName}${
                    formattedPlanPrice
                      ? ` • ${formattedPlanPrice}`
                      : ""
                  }`
                : formatBillingCycle(
                    billingCycle
                  )
            }
          />

          {/* PAYMENT */}

          <DetailItem
            icon={ReceiptText}
            label="Payment Status"
            value={formatPaymentStatus(
              paymentStatus
            )}
            valueClass={
              paymentStatus ===
                "paid" ||
              paymentStatus ===
                "escrow_confirmed" ||
              paymentStatus ===
                "settled"
                ? "text-emerald-700"
                : paymentStatus ===
                    "payment_failed" ||
                  paymentStatus ===
                    "payment_reversed"
                ? "text-red-700"
                : "text-slate-900"
            }
          />

          {/* TRANSACTION */}

          <DetailItem
            icon={ReceiptText}
            label="Transaction Reference"
            value={
              transactionId ||
              metadata?.transactionId ||
              metadata?.paymentTransactionId ||
              "-"
            }
            valueClass="text-slate-700"
          />

        </div>
      </div>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Clock3 size={12} />
          Received{" "}
          {getRelativeTime(
            notification?.createdAt
          )}
        </div>

        {notification?.isRead && (
          <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <CheckCheck size={13} />
            Read
          </div>
        )}

      </div>
    </article>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const SaaSAdminNotifications = () => {
  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [markingId, setMarkingId] =
    useState(null);

  const [markingAll, setMarkingAll] =
    useState(false);

  const [error, setError] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState("all");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  /* =======================================================
     LOAD NOTIFICATIONS
  ======================================================= */

  const loadNotifications = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await getAdminNotifications();

        if (!response?.success) {
          throw new Error(
            response?.message ||
              "Unable to load notifications."
          );
        }

        const notificationData =
          Array.isArray(response?.data)
            ? response.data
            : [];

        setNotifications(
          notificationData
        );

        /*
         * Use backend unreadCount when available.
         * Otherwise calculate from the returned data.
         */
        const backendUnreadCount =
          Number.isFinite(
            response?.unreadCount
          )
            ? response.unreadCount
            : notificationData.filter(
                (item) => !item.isRead
              ).length;

        setUnreadCount(
          backendUnreadCount
        );

        setLastUpdated(
          new Date()
        );
      } catch (err) {
        console.error(
          "Load SaaS notifications error:",
          err
        );

        setError(
          err?.message ||
            "Unable to load notifications."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /* =======================================================
     MARK ONE AS READ
  ======================================================= */

  const handleMarkAsRead = async (
    notification
  ) => {
    if (
      !notification ||
      notification.isRead
    ) {
      return;
    }

    try {
      setMarkingId(
        notification._id
      );

      await markNotificationAsRead(
        notification._id
      );

      setNotifications(
        (previous) =>
          previous.map((item) =>
            item._id ===
            notification._id
              ? {
                  ...item,
                  isRead: true,
                  readAt: new Date(),
                }
              : item
          )
      );

      setUnreadCount(
        (previous) =>
          Math.max(
            previous - 1,
            0
          )
      );
    } catch (err) {
      console.error(
        "Mark notification read error:",
        err
      );

      setError(
        err?.message ||
          "Unable to mark notification as read."
      );
    } finally {
      setMarkingId(null);
    }
  };

  /* =======================================================
     MARK ALL AS READ
  ======================================================= */

  const handleMarkAllAsRead =
    async () => {
      const unreadNotifications =
        notifications.filter(
          (item) => !item.isRead
        );

      if (
        unreadNotifications.length === 0
      ) {
        return;
      }

      try {
        setMarkingAll(true);
        setError("");

        /*
         * Your current API exposes
         * markNotificationAsRead(id),
         * so mark each unread notification
         * using the existing endpoint.
         */
        await Promise.all(
          unreadNotifications.map(
            (notification) =>
              markNotificationAsRead(
                notification._id
              )
          )
        );

        setNotifications(
          (previous) =>
            previous.map((item) => ({
              ...item,
              isRead: true,
              readAt: new Date(),
            }))
        );

        setUnreadCount(0);
      } catch (err) {
        console.error(
          "Mark all notifications read error:",
          err
        );

        setError(
          err?.message ||
            "Unable to mark all notifications as read."
        );
      } finally {
        setMarkingAll(false);
      }
    };

  /* =======================================================
     VIEW APPLICATION
  ======================================================= */

  const handleViewApplication =
    async (notification) => {
      await handleMarkAsRead(
        notification
      );

      const registrationId =
        notification?.registrationId
          ?._id ||
        notification?.registrationId;

      if (!registrationId) {
        return;
      }

      navigate(
        `/saas-admin/hotels?registrationId=${registrationId}`
      );
    };

  /* =======================================================
     FILTERED NOTIFICATIONS
  ======================================================= */

  const filteredNotifications =
    useMemo(() => {
      switch (activeFilter) {
        case "unread":
          return notifications.filter(
            (item) => !item.isRead
          );

        case "payments":
          return notifications.filter(
            (item) =>
              isPaymentNotification(item)
          );

        case "kyc":
          return notifications.filter(
            (item) =>
              isKycNotification(item)
          );

        default:
          return notifications;
      }
    }, [
      notifications,
      activeFilter,
    ]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const totalCount =
    notifications.length;

  const paymentCount =
    notifications.filter(
      (item) =>
        isPaymentNotification(item)
    ).length;

  const kycCount =
    notifications.filter(
      (item) =>
        isKycNotification(item)
    ).length;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#F8F7FC] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2
            size={20}
            className="animate-spin"
          />

          <span className="text-sm font-medium">
            Loading SaaS notifications...
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#F8F7FC]">

      <div className="max-w-[1450px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

          <div className="flex items-start gap-3">

            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#4F46E5] flex items-center justify-center shrink-0 shadow-sm">
              <Bell
                size={22}
                className="text-white"
              />
            </div>

            <div>

              <div className="flex flex-wrap items-center gap-2">

                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101936]">
                  Notifications
                </h1>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] sm:text-[11px] font-bold text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  Live
                </span>

              </div>

              <p className="text-sm text-slate-500 mt-1">
                Manage hotel registrations, subscription payments,
                verification updates, and account events.
              </p>

            </div>

          </div>

          {/* HEADER ACTIONS */}

          <div className="flex flex-wrap items-center gap-2">

          

         

            <button
              type="button"
              disabled={
                markingAll ||
                unreadCount === 0
              }
              onClick={
                handleMarkAllAsRead
              }
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {markingAll ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <CheckCheck
                  size={15}
                />
              )}

              {markingAll
                ? "Updating..."
                : "Mark all as read"}
            </button>

          </div>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5">

            <AlertCircle
              size={18}
              className="text-red-600 shrink-0 mt-0.5"
            />

            <p className="text-sm text-red-700">
              {error}
            </p>

          </div>
        )}

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">

          {/* TOTAL */}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-[0_3px_12px_rgba(42,35,95,0.04)]">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Total Feed Volume
                </p>

                <div className="mt-2 flex items-end gap-2">

                  <p className="text-3xl sm:text-4xl font-bold tracking-tight text-[#101936]">
                    {totalCount}
                  </p>

                  <span className="pb-1 text-xs font-semibold text-emerald-600">
                    ↑{" "}
                    {Math.min(
                      unreadCount,
                      totalCount
                    )}{" "}
                    unread
                  </span>

                </div>

                <p className="mt-2 text-sm text-slate-500 max-w-lg">
                  Notifications from hotel registrations,
                  subscription payments, verification,
                  and tenant lifecycle events.
                </p>

              </div>

              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Bell size={23} />
              </div>

            </div>

          </div>

          {/* ACTIONABLE */}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-[0_3px_12px_rgba(42,35,95,0.04)]">

            <div className="flex items-start justify-between gap-4">

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    Actionable Queue
                  </p>

                  {unreadCount > 0 && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      NEEDS ATTENTION
                    </span>
                  )}

                </div>

                <div className="mt-2 flex items-end gap-2">

                  <p className="text-3xl sm:text-4xl font-bold tracking-tight text-red-600">
                    {unreadCount}
                  </p>

                  <span className="pb-1 text-sm text-slate-500">
                    unread notifications
                  </span>

                </div>

                <p className="mt-2 text-sm text-slate-500 max-w-lg">
                  New events that may require review,
                  verification, or follow-up.
                </p>

              </div>

              <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <CircleAlert size={24} />
              </div>

            </div>

          </div>

        </div>

        {/* =================================================
            FILTER BAR
        ================================================= */}

        <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-2.5 mb-4 shadow-[0_2px_8px_rgba(39,35,91,0.03)]">

          <div className="flex flex-wrap items-center gap-1">

            {/* ALL */}

            <button
              type="button"
              onClick={() =>
                setActiveFilter("all")
              }
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeFilter === "all"
                  ? "bg-[#4F46E5] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              All ({totalCount})
            </button>

            {/* UNREAD */}

            <button
              type="button"
              onClick={() =>
                setActiveFilter("unread")
              }
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeFilter === "unread"
                  ? "bg-[#4F46E5] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeFilter === "unread"
                    ? "bg-white"
                    : "bg-red-600"
                }`}
              />

              Unread ({unreadCount})
            </button>

            {/* PAYMENTS */}

            <button
              type="button"
              onClick={() =>
                setActiveFilter("payments")
              }
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition ${
                activeFilter === "payments"
                  ? "bg-[#4F46E5] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Readed Messages ({paymentCount})
            </button>

       

           

            <div className="ml-auto px-2 text-[11px] sm:text-xs font-medium text-slate-500">
              Showing{" "}
              <span className="font-bold text-slate-700">
                {filteredNotifications.length}
              </span>{" "}
              notifications
            </div>

          </div>

        </div>

        {/* =================================================
            NOTIFICATIONS
        ================================================= */}

        {filteredNotifications.length ===
        0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 sm:p-16 text-center">

            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
              <Bell size={28} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              No notifications found
            </h2>

            <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
              {activeFilter ===
              "unread"
                ? "You're all caught up. There are no unread notifications."
                : "New hotel registrations, payment updates, and SaaS events will appear here."}
            </p>

            {activeFilter !==
              "all" && (
              <button
                type="button"
                onClick={() =>
                  setActiveFilter("all")
                }
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
              >
                View all notifications
              </button>
            )}

          </div>
        ) : (
          <div className="space-y-4">

            {filteredNotifications.map(
              (notification) => (
                <NotificationCard
                  key={
                    notification._id
                  }
                  notification={
                    notification
                  }
                  onMarkRead={
                    handleMarkAsRead
                  }
                  onViewApplication={
                    handleViewApplication
                  }
                  markingId={
                    markingId
                  }
                />
              )
            )}

          </div>
        )}

      </div>
    </div>
  );
};

export default SaaSAdminNotifications;