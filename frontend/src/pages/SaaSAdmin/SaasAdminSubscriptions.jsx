import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Search,
  RefreshCw,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  Clock3,
  XCircle,
  Building2,
  Package,
  CalendarDays,
  IndianRupee,
  Receipt,
  RotateCcw,
  Ban,
} from "lucide-react";

import {
  getAllSubscriptions,
  getSubscriptionById,
  cancelSubscription,
} from "../../service/subscriptionApi";


// ======================================================
// HELPERS
// ======================================================

const getSubscriptionsFromResponse = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.subscriptions)) {
    return response.data.subscriptions;
  }

  if (Array.isArray(response?.subscriptions)) {
    return response.subscriptions;
  }

  return [];
};


const getSubscriptionFromResponse = (response) => {
  if (response?.data?.subscription) {
    return response.data.subscription;
  }

  if (response?.subscription) {
    return response.subscription;
  }

  if (response?.data?._id) {
    return response.data;
  }

  if (response?._id) {
    return response;
  }

  return null;
};


const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
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


const formatDateTime = (date) => {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};


const formatStatus = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};


const getStatusClass = (status) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "trial":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "expiring_soon":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "grace_period":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "expired":
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";

    case "suspended":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "payment_failed":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};


const getPaymentStatusClass = (status) => {
  switch (status) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "partially_paid":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "pending":
      return "bg-slate-50 text-slate-600 border-slate-200";

    case "failed":
      return "bg-red-50 text-red-700 border-red-200";

    case "refunded":
      return "bg-violet-50 text-violet-700 border-violet-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};


// ======================================================
// STAT CARD
// ======================================================

const StatCard = ({
  title,
  value,
  icon: Icon,
  wrapperClass,
  loading,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">

      <div className="flex items-center justify-between gap-4">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          {loading ? (
            <div className="mt-2 h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {value}
            </p>
          )}

        </div>


        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${wrapperClass}`}
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

const SaaSAdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [billingFilter, setBillingFilter] =
    useState("all");

  const [selectedSubscription, setSelectedSubscription] =
    useState(null);

  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);


  // ====================================================
  // FETCH SUBSCRIPTIONS
  // ====================================================

  const fetchSubscriptions = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await getAllSubscriptions();

        const list =
          getSubscriptionsFromResponse(
            response
          );

        setSubscriptions(list);
      } catch (err) {
        console.error(
          "Get subscriptions error:",
          err
        );

        setError(
          err?.message ||
            err?.data?.message ||
            "Unable to load subscriptions."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );


  // ====================================================
  // INITIAL LOAD
  // ====================================================

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);


  // ====================================================
  // SUCCESS MESSAGE
  // ====================================================

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage]);


  // ====================================================
  // COUNTS
  // ====================================================

  const activeCount = subscriptions.filter(
    (item) => item.status === "active"
  ).length;

  const trialCount = subscriptions.filter(
    (item) => item.status === "trial"
  ).length;

  const expiredCount = subscriptions.filter(
    (item) => item.status === "expired"
  ).length;

  const cancelledCount = subscriptions.filter(
    (item) => item.status === "cancelled"
  ).length;


  // ====================================================
  // REVENUE
  // ====================================================

  const collectedRevenue = useMemo(() => {
    return subscriptions.reduce(
      (total, subscription) => {
        if (
          subscription.paymentStatus ===
            "paid" ||
          subscription.paymentStatus ===
            "partially_paid"
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
      },
      0
    );
  }, [subscriptions]);


  // ====================================================
  // FILTER
  // ====================================================

  const filteredSubscriptions = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return subscriptions.filter(
      (subscription) => {
        const hotelName =
          subscription.hotelId?.hotelName ||
          "";

        const planName =
          subscription.planId?.planName ||
          "";

        const subscriptionId =
          subscription._id || "";

        const matchesSearch =
          !query ||
          hotelName
            .toLowerCase()
            .includes(query) ||
          planName
            .toLowerCase()
            .includes(query) ||
          subscriptionId
            .toLowerCase()
            .includes(query);

        const matchesStatus =
          statusFilter === "all" ||
          subscription.status ===
            statusFilter;

        const matchesBilling =
          billingFilter === "all" ||
          subscription.billingCycle ===
            billingFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesBilling
        );
      }
    );
  }, [
    subscriptions,
    search,
    statusFilter,
    billingFilter,
  ]);


  // ====================================================
  // VIEW DETAILS
  // ====================================================

  const handleView = async (subscription) => {
    try {
      setActionLoading(true);
      setError("");

      const response =
        await getSubscriptionById(
          subscription._id
        );

      const details =
        getSubscriptionFromResponse(
          response
        );

      setSelectedSubscription(
        details || subscription
      );

      setShowDetailsModal(true);
    } catch (err) {
      console.error(
        "Get subscription details error:",
        err
      );

      // Fallback to row data
      setSelectedSubscription(
        subscription
      );

      setShowDetailsModal(true);
    } finally {
      setActionLoading(false);
    }
  };


  // ====================================================
  // CLOSE DETAILS
  // ====================================================

  const closeDetails = () => {
    if (actionLoading) {
      return;
    }

    setShowDetailsModal(false);
    setSelectedSubscription(null);
    setError("");
  };


  // ====================================================
  // CANCEL SUBSCRIPTION
  // ====================================================

  const handleCancel = async (subscription) => {
    const hotelName =
      subscription.hotelId?.hotelName ||
      "this hotel";

    const confirmed =
      window.confirm(
        `Are you sure you want to cancel the subscription for "${hotelName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccessMessage("");

      await cancelSubscription(
        subscription._id
      );

      setSuccessMessage(
        `Subscription for ${hotelName} has been cancelled successfully.`
      );

      setShowDetailsModal(false);
      setSelectedSubscription(null);

      await fetchSubscriptions(true);
    } catch (err) {
      console.error(
        "Cancel subscription error:",
        err
      );

      setError(
        err?.message ||
          err?.data?.message ||
          "Unable to cancel the subscription."
      );
    } finally {
      setActionLoading(false);
    }
  };


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="max-w-7xl mx-auto">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

          <div>

            <div className="flex items-center gap-2">

              <CreditCard
                size={24}
                className="text-indigo-600"
              />

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Subscriptions
              </h1>

            </div>

            <p className="text-sm text-slate-500 mt-1">
              Manage hotel subscriptions, billing and payment status.
            </p>

          </div>


          <button
            type="button"
            onClick={() =>
              fetchSubscriptions(true)
            }
            disabled={
              loading || refreshing
            }
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition"
          >

            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}

          </button>

        </div>


        {/* ==================================================
            SUCCESS
        ================================================== */}

        {successMessage && (
          <div className="mb-5 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">

            <CheckCircle2
              size={19}
              className="text-emerald-600 shrink-0"
            />

            <p className="text-sm font-medium text-emerald-800">
              {successMessage}
            </p>

          </div>
        )}


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-5 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">

            <AlertCircle
              size={19}
              className="text-red-600 shrink-0"
            />

            <div>

              <p className="text-sm font-semibold text-red-800">
                Something went wrong
              </p>

              <p className="text-sm text-red-700 mt-1">
                {error}
              </p>

            </div>

          </div>
        )}


        {/* ==================================================
            STATS
        ================================================== */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">

          <StatCard
            title="Total"
            value={
              subscriptions.length
            }
            icon={CreditCard}
            wrapperClass="bg-indigo-50 text-indigo-600"
            loading={loading}
          />

          <StatCard
            title="Active"
            value={activeCount}
            icon={CheckCircle2}
            wrapperClass="bg-emerald-50 text-emerald-600"
            loading={loading}
          />

          <StatCard
            title="Trial"
            value={trialCount}
            icon={Clock3}
            wrapperClass="bg-blue-50 text-blue-600"
            loading={loading}
          />

          <StatCard
            title="Expired"
            value={expiredCount}
            icon={XCircle}
            wrapperClass="bg-red-50 text-red-600"
            loading={loading}
          />

          <StatCard
            title="Collected"
            value={formatCurrency(
              collectedRevenue
            )}
            icon={IndianRupee}
            wrapperClass="bg-violet-50 text-violet-600"
            loading={loading}
          />

        </div>


        {/* ==================================================
            FILTERS
        ================================================== */}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            {/* Search */}

            <div className="relative md:col-span-1">

              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search hotel, plan or ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />

            </div>


            {/* Status */}

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            >

              <option value="all">
                All Statuses
              </option>

              <option value="active">
                Active
              </option>

              <option value="trial">
                Trial
              </option>

              <option value="expiring_soon">
                Expiring Soon
              </option>

              <option value="grace_period">
                Grace Period
              </option>

              <option value="expired">
                Expired
              </option>

              <option value="suspended">
                Suspended
              </option>

              <option value="cancelled">
                Cancelled
              </option>

              <option value="payment_failed">
                Payment Failed
              </option>

            </select>


            {/* Billing */}

            <select
              value={billingFilter}
              onChange={(e) =>
                setBillingFilter(
                  e.target.value
                )
              }
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
            >

              <option value="all">
                All Billing Cycles
              </option>

              <option value="monthly">
                Monthly
              </option>

              <option value="quarterly">
                Quarterly
              </option>

              <option value="halfYearly">
                Half Yearly
              </option>

              <option value="yearly">
                Yearly
              </option>

              <option value="custom">
                Custom
              </option>

            </select>

          </div>

        </div>


        {/* ==================================================
            TABLE
        ================================================== */}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {loading ? (

            <div className="p-6 space-y-3">

              {[1, 2, 3, 4, 5].map(
                (item) => (
                  <div
                    key={item}
                    className="h-16 bg-slate-100 rounded-xl animate-pulse"
                  />
                )
              )}

            </div>

          ) : filteredSubscriptions.length ===
            0 ? (

            <div className="p-14 text-center">

              <CreditCard
                size={42}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                No subscriptions found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {search ||
                statusFilter !== "all" ||
                billingFilter !== "all"
                  ? "Try changing your search or filters."
                  : "No subscriptions have been created yet."}
              </p>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1050px]">

                <thead>

                  <tr className="bg-slate-50 border-b border-slate-200">

                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                      Hotel
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                      Plan
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                      Billing
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                      Amount
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                      Payment
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                      Status
                    </th>

                    <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y divide-slate-100">

                  {filteredSubscriptions.map(
                    (subscription) => {

                      const hotelName =
                        subscription
                          .hotelId
                          ?.hotelName ||
                        "Hotel";

                      const planName =
                        subscription
                          .planId
                          ?.planName ||
                        "Plan";

                      return (
                        <tr
                          key={
                            subscription._id
                          }
                          className="hover:bg-slate-50/70 transition"
                        >

                          {/* Hotel */}

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Building2
                                  size={18}
                                />
                              </div>

                              <div>

                                <p className="text-sm font-semibold text-slate-900">
                                  {hotelName}
                                </p>

                                <p className="text-[11px] text-slate-400 mt-1">
                                  {subscription._id}
                                </p>

                              </div>

                            </div>

                          </td>


                          {/* Plan */}

                          <td className="px-5 py-4">

                            <p className="text-sm font-semibold text-slate-800">
                              {planName}
                            </p>

                            <p className="text-xs text-slate-500 mt-1">
                              {subscription
                                .autoRenewal
                                ? "Auto renewal"
                                : "Manual renewal"}
                            </p>

                          </td>


                          {/* Billing */}

                          <td className="px-5 py-4">

                            <p className="text-sm font-medium text-slate-700">
                              {formatStatus(
                                subscription.billingCycle
                              )}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              {formatDate(
                                subscription.startDate
                              )}{" "}
                              →{" "}
                              {formatDate(
                                subscription.endDate
                              )}
                            </p>

                          </td>


                          {/* Amount */}

                          <td className="px-5 py-4">

                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(
                                subscription.finalAmount ??
                                  subscription.amount ??
                                  0
                              )}
                            </p>

                            {Number(
                              subscription.discount ||
                                0
                            ) > 0 && (
                              <p className="text-xs text-emerald-600 mt-1">
                                Discount:{" "}
                                {formatCurrency(
                                  subscription.discount
                                )}
                              </p>
                            )}

                          </td>


                          {/* Payment */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getPaymentStatusClass(
                                subscription.paymentStatus
                              )}`}
                            >
                              {formatStatus(
                                subscription.paymentStatus
                              )}
                            </span>

                          </td>


                          {/* Status */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClass(
                                subscription.status
                              )}`}
                            >
                              {formatStatus(
                                subscription.status
                              )}
                            </span>

                          </td>


                          {/* Action */}

                          <td className="px-5 py-4">

                            <div className="flex justify-end gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  handleView(
                                    subscription
                                  )
                                }
                                disabled={
                                  actionLoading
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold disabled:opacity-50"
                              >

                                <Eye
                                  size={14}
                                />

                                View

                              </button>


                              {(subscription.status ===
                                "active" ||
                                subscription.status ===
                                  "trial" ||
                                subscription.status ===
                                  "expiring_soon" ||
                                subscription.status ===
                                  "grace_period") && (

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCancel(
                                      subscription
                                    )
                                  }
                                  disabled={
                                    actionLoading
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold disabled:opacity-50"
                                >

                                  <Ban
                                    size={14}
                                  />

                                  Cancel

                                </button>

                              )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>


      {/* ====================================================
          DETAILS MODAL
      ==================================================== */}

      {showDetailsModal &&
        selectedSubscription && (

          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">

            <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">

              {/* Header */}

              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 sm:px-6 py-4 flex items-center justify-between">

                <div>

                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    Subscription Details
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Complete subscription information.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={closeDetails}
                  disabled={actionLoading}
                  className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 disabled:opacity-50"
                >
                  <X size={19} />
                </button>

              </div>


              {/* Body */}

              <div className="p-5 sm:p-6 space-y-5">

                {/* Hotel + Plan */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="p-4 bg-indigo-50 rounded-xl">

                    <div className="flex items-center gap-2">

                      <Building2
                        size={18}
                        className="text-indigo-600"
                      />

                      <p className="text-xs text-indigo-600 font-semibold">
                        Hotel
                      </p>

                    </div>

                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selectedSubscription
                        .hotelId
                        ?.hotelName ||
                        "Hotel"}
                    </p>

                    <p className="text-[11px] text-slate-500 mt-1 break-all">
                      {selectedSubscription
                        .hotelId?._id ||
                        selectedSubscription.hotelId ||
                        "N/A"}
                    </p>

                  </div>


                  <div className="p-4 bg-violet-50 rounded-xl">

                    <div className="flex items-center gap-2">

                      <Package
                        size={18}
                        className="text-violet-600"
                      />

                      <p className="text-xs text-violet-600 font-semibold">
                        Plan
                      </p>

                    </div>

                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selectedSubscription
                        .planId
                        ?.planName ||
                        "Plan"}
                    </p>

                    <p className="text-[11px] text-slate-500 mt-1 break-all">
                      {selectedSubscription
                        .planId?._id ||
                        selectedSubscription.planId ||
                        "N/A"}
                    </p>

                  </div>

                </div>


                {/* Status */}

                <div className="flex flex-wrap gap-2">

                  <span
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClass(
                      selectedSubscription.status
                    )}`}
                  >
                    {formatStatus(
                      selectedSubscription.status
                    )}
                  </span>


                  <span
                    className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getPaymentStatusClass(
                      selectedSubscription.paymentStatus
                    )}`}
                  >
                    Payment:{" "}
                    {formatStatus(
                      selectedSubscription.paymentStatus
                    )}
                  </span>


                  {selectedSubscription.autoRenewal && (
                    <span className="px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold">
                      Auto Renewal
                    </span>
                  )}

                </div>


                {/* Billing */}

                <div className="border border-slate-200 rounded-xl p-4">

                  <div className="flex items-center gap-2 mb-4">

                    <CalendarDays
                      size={18}
                      className="text-indigo-600"
                    />

                    <h3 className="text-sm font-bold text-slate-900">
                      Billing Period
                    </h3>

                  </div>


                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    <div>

                      <p className="text-xs text-slate-500">
                        Billing Cycle
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatStatus(
                          selectedSubscription.billingCycle
                        )}
                      </p>

                    </div>


                    <div>

                      <p className="text-xs text-slate-500">
                        Start Date
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDate(
                          selectedSubscription.startDate
                        )}
                      </p>

                    </div>


                    <div>

                      <p className="text-xs text-slate-500">
                        End Date
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDate(
                          selectedSubscription.endDate
                        )}
                      </p>

                    </div>

                  </div>

                </div>


                {/* Amount */}

                <div className="border border-slate-200 rounded-xl p-4">

                  <div className="flex items-center gap-2 mb-4">

                    <Receipt
                      size={18}
                      className="text-emerald-600"
                    />

                    <h3 className="text-sm font-bold text-slate-900">
                      Billing Summary
                    </h3>

                  </div>


                  <div className="space-y-3">

                    <div className="flex justify-between gap-4">

                      <span className="text-sm text-slate-500">
                        Amount
                      </span>

                      <span className="text-sm font-semibold text-slate-800">
                        {formatCurrency(
                          selectedSubscription.amount
                        )}
                      </span>

                    </div>


                    <div className="flex justify-between gap-4">

                      <span className="text-sm text-slate-500">
                        Discount
                      </span>

                      <span className="text-sm font-semibold text-emerald-600">
                        -{" "}
                        {formatCurrency(
                          selectedSubscription.discount
                        )}
                      </span>

                    </div>


                    <div className="flex justify-between gap-4">

                      <span className="text-sm text-slate-500">
                        Tax
                      </span>

                      <span className="text-sm font-semibold text-slate-800">
                        {formatCurrency(
                          selectedSubscription.tax
                        )}
                      </span>

                    </div>


                    <div className="pt-3 border-t border-slate-100 flex justify-between gap-4">

                      <span className="font-bold text-slate-900">
                        Final Amount
                      </span>

                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(
                          selectedSubscription.finalAmount
                        )}
                      </span>

                    </div>

                  </div>

                </div>


                {/* Limits */}

                <div className="border border-slate-200 rounded-xl p-4">

                  <div className="flex items-center gap-2 mb-4">

                    <Package
                      size={18}
                      className="text-indigo-600"
                    />

                    <h3 className="text-sm font-bold text-slate-900">
                      Subscription Limits
                    </h3>

                  </div>


                  <div className="grid grid-cols-3 gap-3">

                    <div className="p-3 bg-slate-50 rounded-xl text-center">

                      <p className="text-lg font-bold text-slate-900">
                        {selectedSubscription
                          .limits?.rooms ??
                          0}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Rooms
                      </p>

                    </div>


                    <div className="p-3 bg-slate-50 rounded-xl text-center">

                      <p className="text-lg font-bold text-slate-900">
                        {selectedSubscription
                          .limits?.branches ??
                          0}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Branches
                      </p>

                    </div>


                    <div className="p-3 bg-slate-50 rounded-xl text-center">

                      <p className="text-lg font-bold text-slate-900">
                        {selectedSubscription
                          .limits
                          ?.receptionists ??
                          0}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Receptionists
                      </p>

                    </div>

                  </div>

                </div>


                {/* Features */}

                <div className="border border-slate-200 rounded-xl p-4">

                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Enabled Features
                  </h3>

                  <div className="flex flex-wrap gap-2">

                    {selectedSubscription
                      .features
                      ?.foodService && (
                      <span className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold">
                        Food Service
                      </span>
                    )}


                    {selectedSubscription
                      .features
                      ?.roomService && (
                      <span className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        Room Service
                      </span>
                    )}


                    {!selectedSubscription
                      .features
                      ?.foodService &&
                      !selectedSubscription
                        .features
                        ?.roomService && (
                        <span className="text-xs text-slate-400">
                          No additional features
                        </span>
                      )}

                  </div>

                </div>


                {/* Payment transaction */}

                <div className="border border-slate-200 rounded-xl p-4">

                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Payment Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>

                      <p className="text-xs text-slate-500">
                        Payment Status
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatStatus(
                          selectedSubscription.paymentStatus
                        )}
                      </p>

                    </div>


                    <div>

                      <p className="text-xs text-slate-500">
                        Transaction ID
                      </p>

                      <p className="mt-1 text-xs font-semibold break-all">
                        {selectedSubscription.paymentTransactionId ||
                          "Not available"}
                      </p>

                    </div>

                  </div>

                </div>


                {/* Dates */}

                <div className="text-xs text-slate-400">

                  Created:{" "}
                  {formatDateTime(
                    selectedSubscription.createdAt
                  )}

                  {" • "}

                  Updated:{" "}
                  {formatDateTime(
                    selectedSubscription.updatedAt
                  )}

                </div>


                {/* Cancel */}

                {(selectedSubscription.status ===
                  "active" ||
                  selectedSubscription.status ===
                    "trial" ||
                  selectedSubscription.status ===
                    "expiring_soon" ||
                  selectedSubscription.status ===
                    "grace_period") && (

                  <button
                    type="button"
                    onClick={() =>
                      handleCancel(
                        selectedSubscription
                      )
                    }
                    disabled={
                      actionLoading
                    }
                    className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >

                    {actionLoading ? (
                      <>
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />

                        Processing...
                      </>
                    ) : (
                      <>
                        <Ban
                          size={16}
                        />

                        Cancel Subscription
                      </>
                    )}

                  </button>

                )}

              </div>

            </div>

          </div>
        )}

    </div>
  );
};

export default SaaSAdminSubscriptions;