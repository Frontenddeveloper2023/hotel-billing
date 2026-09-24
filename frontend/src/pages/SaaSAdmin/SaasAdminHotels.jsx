import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock3,
  MapPin,
  Mail,
  Phone,
  Eye,
  X,
  AlertCircle,
  Users,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Ban,
  FileCheck2,
} from "lucide-react";

import { getAllHotels } from "../../service/hotelApi";
import {
  getAllRegistrations,
  approveRegistration,
  rejectRegistration,
} from "../../service/hotelRegistrationApi";

/* =========================================================
   HELPERS
========================================================= */

const getArrayFromResponse = (response, type) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (type === "hotels") {
    return response?.data?.hotels || response?.hotels || [];
  }

  if (type === "registrations") {
    return (
      response?.data?.registrations ||
      response?.registrations ||
      []
    );
  }

  return [];
};

/* =========================================================
   DATE
========================================================= */

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

/* =========================================================
   CURRENCY
========================================================= */

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

/* =========================================================
   GENERAL STATUS
========================================================= */

const formatStatus = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

/* =========================================================
   PAYMENT STATUS
========================================================= */

const formatPaymentStatus = (status) => {
  const labels = {
    paid: "Paid",
    partially_paid: "Partially Paid",
    pending: "Payment Pending",
    payment_pending: "Payment Pending",
    payment_failed: "Payment Failed",
    payment_reversed: "Payment Reversed",
    reversed: "Payment Reversed",
    failed: "Payment Failed",
    unpaid: "Payment Pending",
  };

  return labels[status] || formatStatus(status);
};

/* =========================================================
   APPLICATION STATUS
========================================================= */

const formatApplicationStatus = (status) => {
  const labels = {
    pending: "Pending Review",
    approved: "Approved",
    rejected: "Rejected",
  };

  return labels[status] || "Unknown";
};

/* =========================================================
   STATUS CLASS
========================================================= */

const getStatusClass = (status) => {
  switch (status) {
    case "active":
    case "approved":
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "pending":
    case "trial":
    case "expiring_soon":
    case "partially_paid":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "rejected":
    case "expired":
    case "cancelled":
    case "payment_failed":
    case "failed":
    case "payment_reversed":
    case "reversed":
      return "bg-red-50 text-red-700 border-red-200";

    case "suspended":
      return "bg-orange-50 text-orange-700 border-orange-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
};

/* =========================================================
   REJECTION REASONS
========================================================= */

const rejectionReasons = [
  {
    value: "",
    label: "Select a reason...",
  },
  {
    value: "gstin_mismatch",
    label: "GSTIN or legal name does not match",
  },
  {
    value: "invalid_trade_license",
    label: "Hospitality trade license is expired or invalid",
  },
  {
    value: "duplicate_registration",
    label: "Duplicate hotel registration",
  },
  {
    value: "payment_reversal",
    label: "Payment was reversed or could not be verified",
  },
  {
    value: "incomplete_documents",
    label: "Required documents are incomplete",
  },
  {
    value: "other",
    label: "Other reason",
  },
];

/* =========================================================
   STAT CARD
========================================================= */

const StatCard = ({
  title,
  value,
  icon: Icon,
  wrapperClass,
  loading,
  description,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">
            {title}
          </p>

          {loading ? (
            <div className="mt-3 h-8 w-16 bg-slate-100 rounded-lg animate-pulse" />
          ) : (
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {value}
            </p>
          )}

          {description && (
            <p className="mt-1.5 text-xs text-slate-400">
              {description}
            </p>
          )}
        </div>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${wrapperClass}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const SaaSAdminHotels = () => {
  const [hotels, setHotels] = useState([]);
  const [registrations, setRegistrations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("applications");

  const [search, setSearch] = useState("");

  const [selectedRegistration, setSelectedRegistration] =
    useState(null);

  const [selectedHotel, setSelectedHotel] = useState(null);

  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [showRejectModal, setShowRejectModal] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const [actionLoading, setActionLoading] = useState(false);

  const [actionError, setActionError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  /* =======================================================
     FETCH DATA
  ======================================================= */

  const fetchData = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const results = await Promise.allSettled([
          getAllHotels(),
          getAllRegistrations(),
        ]);

        const hotelsResult = results[0];
        const registrationsResult = results[1];

        const hotels =
          hotelsResult.status === "fulfilled"
            ? getArrayFromResponse(
                hotelsResult.value,
                "hotels"
              )
            : [];

        const registrations =
          registrationsResult.status === "fulfilled"
            ? getArrayFromResponse(
                registrationsResult.value,
                "registrations"
              )
            : [];

        const failed = [];

        if (hotelsResult.status === "rejected") {
          failed.push("Hotels");
        }

        if (registrationsResult.status === "rejected") {
          failed.push("Applications");
        }

        if (failed.length > 0) {
          setError(
            `${failed.join(
              " and "
            )} data could not be loaded. Please check your permissions and backend APIs.`
          );
        }

        setHotels(hotels);
        setRegistrations(registrations);
      } catch (err) {
        console.error("SaaS Admin Hotels error:", err);

        setError(
          err?.message ||
            "Unable to load hotel data."
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
    fetchData();
  }, [fetchData]);

  /* =======================================================
     CLEAR SUCCESS MESSAGE
  ======================================================= */

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  /* =======================================================
     COUNTS
  ======================================================= */

  const pendingCount = registrations.filter(
    (item) => item.status === "pending"
  ).length;

  const approvedCount = registrations.filter(
    (item) => item.status === "approved"
  ).length;

  const rejectedCount = registrations.filter(
    (item) => item.status === "rejected"
  ).length;

  const activeHotelCount = hotels.filter(
    (hotel) => hotel.status === "active"
  ).length;

  /* =======================================================
     FILTER APPLICATIONS
  ======================================================= */

  const filteredRegistrations = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return registrations;
    }

    return registrations.filter((item) => {
      return (
        item.hotelName
          ?.toLowerCase()
          .includes(query) ||
        item.ownerName
          ?.toLowerCase()
          .includes(query) ||
        item.email
          ?.toLowerCase()
          .includes(query) ||
        item.phone
          ?.toLowerCase()
          .includes(query) ||
        item.status
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [registrations, search]);

  /* =======================================================
     FILTER HOTELS
  ======================================================= */

  const filteredHotels = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return hotels;
    }

    return hotels.filter((hotel) => {
      return (
        hotel.hotelName
          ?.toLowerCase()
          .includes(query) ||
        hotel.ownerName
          ?.toLowerCase()
          .includes(query) ||
        hotel.email
          ?.toLowerCase()
          .includes(query) ||
        hotel.phone
          ?.toLowerCase()
          .includes(query) ||
        hotel.status
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [hotels, search]);

  /* =======================================================
     VIEW REGISTRATION
  ======================================================= */

  const handleViewRegistration = (registration) => {
    setSelectedRegistration(registration);
    setSelectedHotel(null);
    setShowDetailsModal(true);
    setActionError("");
  };

  /* =======================================================
     VIEW HOTEL
  ======================================================= */

  const handleViewHotel = (hotel) => {
    setSelectedHotel(hotel);
    setSelectedRegistration(null);
    setShowDetailsModal(true);
    setActionError("");
  };

  /* =======================================================
     APPROVE APPLICATION
  ======================================================= */

  const handleApprove = async (registration) => {
    if (!registration?._id) {
      setActionError("Application ID is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to approve "${registration.hotelName}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");
      setSuccessMessage("");

      console.log(
        "Approving registration:",
        registration._id
      );

      const response = await approveRegistration(
        registration._id
      );

      console.log(
        "Approve API response:",
        response
      );

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Application approval failed."
        );
      }

      setRegistrations((prev) =>
        prev.map((item) =>
          String(item._id) ===
          String(registration._id)
            ? {
                ...item,
                status: "approved",
                paymentStatus: "paid",
              }
            : item
        )
      );

      setSuccessMessage(
        `${registration.hotelName} has been approved successfully.`
      );

      setShowDetailsModal(false);
      setSelectedRegistration(null);
    } catch (err) {
      console.error(
        "Approve application error:",
        err
      );

      setActionError(
        err?.message ||
          err?.data?.message ||
          "Unable to approve this application."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     OPEN REJECT MODAL
  ======================================================= */

  const handleOpenReject = (registration) => {
    setSelectedRegistration(registration);
    setRejectionReason("");
    setActionError("");
    setShowRejectModal(true);
  };

  /* =======================================================
     REJECT APPLICATION
  ======================================================= */

  const handleReject = async () => {
    const reason = rejectionReason.trim();

    if (reason.length < 5) {
      setActionError(
        "Please provide a rejection reason with at least 5 characters."
      );
      return;
    }

    if (!selectedRegistration?._id) {
      setActionError(
        "Application information is missing."
      );
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");
      setSuccessMessage("");

      await rejectRegistration(
        selectedRegistration._id,
        reason
      );

      setSuccessMessage(
        `${selectedRegistration.hotelName} has been rejected.`
      );

      setShowRejectModal(false);
      setShowDetailsModal(false);

      setSelectedRegistration(null);
      setRejectionReason("");

      await fetchData(true);
    } catch (err) {
      console.error(
        "Reject application error:",
        err
      );

      setActionError(
        err?.message ||
          err?.data?.message ||
          "Unable to reject this application."
      );
    } finally {
      setActionLoading(false);
    }
  };

  /* =======================================================
     ADDRESS
  ======================================================= */

  const getAddress = (address) => {
    if (!address) {
      return "Address not provided";
    }

    return [
      address.street,
      address.city,
      address.state,
      address.country,
      address.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  };

  /* =======================================================
     CLOSE DETAILS MODAL
  ======================================================= */

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedRegistration(null);
    setSelectedHotel(null);
    setActionError("");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#F8F7FC]">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-6">

          <div>
            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101936]">
                Hotels & Applications
              </h1>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Live Onboarding
              </span>

            </div>

            <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
              Review hotel applications, verify details,
              and manage approved properties.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4338CA] hover:bg-[#3730A3] text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
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
              : "Refresh Data"}
          </button>

        </div>

        {/* =================================================
            SUCCESS MESSAGE
        ================================================= */}

        {successMessage && (
          <div className="mb-5 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">

            <CheckCircle2
              size={20}
              className="text-emerald-600 shrink-0 mt-0.5"
            />

            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Action completed successfully
              </p>

              <p className="text-sm text-emerald-700 mt-0.5">
                {successMessage}
              </p>
            </div>

          </div>
        )}

        {/* =================================================
            ERROR MESSAGE
        ================================================= */}

        {error && (
          <div className="mb-5 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">

            <AlertCircle
              size={20}
              className="text-red-600 shrink-0 mt-0.5"
            />

            <div>
              <p className="text-sm font-semibold text-red-800">
                Unable to load some data
              </p>

              <p className="text-sm text-red-700 mt-1">
                {error}
              </p>
            </div>

          </div>
        )}

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

          <StatCard
            title="Total Hotels"
            value={hotels.length}
            icon={Building2}
            wrapperClass="bg-indigo-50 text-indigo-600"
            loading={loading}
            description="All registered properties"
          />

          <StatCard
            title="Active Hotels"
            value={activeHotelCount}
            icon={CheckCircle2}
            wrapperClass="bg-emerald-50 text-emerald-600"
            loading={loading}
            description="Currently active properties"
          />

          <StatCard
            title="Pending Applications"
            value={pendingCount}
            icon={Clock3}
            wrapperClass="bg-amber-50 text-amber-600"
            loading={loading}
            description="Waiting for review"
          />

          <StatCard
            title="Rejected Applications"
            value={rejectedCount}
            icon={XCircle}
            wrapperClass="bg-red-50 text-red-600"
            loading={loading}
            description="Applications not approved"
          />

        </div>

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <div className="bg-white border border-[#E9E6F5] rounded-2xl shadow-[0_3px_15px_rgba(42,35,95,0.04)] overflow-hidden">

          {/* =================================================
              TABS + SEARCH
          ================================================= */}

          <div className="p-4 sm:p-5 border-b border-slate-100">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              {/* TABS */}

              <div className="flex items-center gap-1 p-1 bg-[#F3F2FF] rounded-xl w-fit">

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("applications");
                    setSearch("");
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === "applications"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Applications Queue

                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-[11px] ${
                      activeTab === "applications"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {pendingCount} Pending
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("hotels");
                    setSearch("");
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === "hotels"
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Active Properties

                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-[11px] ${
                      activeTab === "hotels"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {activeHotelCount}
                  </span>
                </button>

              </div>

              {/* SEARCH */}

              <div className="relative w-full lg:w-[360px]">

                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder={
                    activeTab === "applications"
                      ? "Search by hotel, owner, email, or phone..."
                      : "Search by hotel, owner, email, or location..."
                  }
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />

              </div>

            </div>

          </div>

          {/* =================================================
              APPLICATIONS
          ================================================= */}

          {activeTab === "applications" && (
            <div>

              {loading ? (
                <div className="p-6 space-y-3">

                  {[1, 2, 3, 4, 5].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-20 rounded-xl bg-slate-100 animate-pulse"
                      />
                    )
                  )}

                </div>
              ) : filteredRegistrations.length === 0 ? (

                <div className="p-14 text-center">

                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <FileCheck2 size={27} />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-800">
                    No applications found
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    {search
                      ? "Try a different search term."
                      : "There are no hotel applications waiting to be reviewed."}
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1050px]">

                    <thead>
                      <tr className="bg-[#F7F6FD] border-b border-slate-200">

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Hotel / Property
                        </th>

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Owner & Contact
                        </th>

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Subscription Plan
                        </th>

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Payment Status
                        </th>

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Application Status
                        </th>

                        <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Actions
                        </th>

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {filteredRegistrations.map(
                        (registration) => (

                          <tr
                            key={registration._id}
                            className="hover:bg-slate-50/70 transition"
                          >

                            {/* HOTEL */}

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Building2 size={18} />
                                </div>

                                <div className="min-w-0">

                                  <p className="font-semibold text-sm text-slate-900">
                                    {registration.hotelName ||
                                      "Unnamed Hotel"}
                                  </p>

                                  <p className="text-xs text-slate-500 mt-1">
                                    Applied{" "}
                                    {formatDate(
                                      registration.createdAt
                                    )}
                                  </p>

                                </div>

                              </div>

                            </td>

                            {/* OWNER */}

                            <td className="px-5 py-4">

                              <p className="text-sm font-semibold text-slate-800">
                                {registration.ownerName ||
                                  "Owner not provided"}
                              </p>

                              <div className="flex items-center gap-1.5 mt-1">
                                <Mail
                                  size={12}
                                  className="text-slate-400"
                                />

                                <p className="text-xs text-slate-500">
                                  {registration.email ||
                                    "Email not provided"}
                                </p>
                              </div>

                              {registration.phone && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <Phone
                                    size={12}
                                    className="text-slate-400"
                                  />

                                  <p className="text-xs text-slate-500">
                                    {registration.phone}
                                  </p>
                                </div>
                              )}

                            </td>

                            {/* PLAN */}

                            <td className="px-5 py-4">

                              <p className="text-sm font-semibold text-slate-800">
                                {registration.planId
                                  ?.planName ||
                                  "Subscription Plan"}
                              </p>

                              <p className="text-xs text-slate-500 mt-1">
                                {formatStatus(
                                  registration.billingCycle
                                )}
                              </p>

                              {registration.planId
                                ?.price && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {formatCurrency(
                                    registration.planId.price
                                  )}
                                </p>
                              )}

                            </td>

                            {/* PAYMENT */}

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold ${getStatusClass(
                                  registration.paymentStatus
                                )}`}
                              >
                                {registration.paymentStatus ===
                                  "paid" && (
                                  <CheckCircle2 size={12} />
                                )}

                                {formatPaymentStatus(
                                  registration.paymentStatus
                                )}
                              </span>

                            </td>

                            {/* APPLICATION STATUS */}

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold ${getStatusClass(
                                  registration.status
                                )}`}
                              >
                                {registration.status ===
                                  "approved" && (
                                  <CheckCircle2 size={12} />
                                )}

                                {registration.status ===
                                  "rejected" && (
                                  <XCircle size={12} />
                                )}

                                {registration.status ===
                                  "pending" && (
                                  <Clock3 size={12} />
                                )}

                                {formatApplicationStatus(
                                  registration.status
                                )}
                              </span>

                            </td>

                            {/* ACTIONS */}

                            <td className="px-5 py-4">

                              <div className="flex justify-end gap-2 flex-wrap">

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleViewRegistration(
                                      registration
                                    )
                                  }
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                                >
                                  <Eye size={14} />
                                  View Details
                                </button>

                                {registration.status ===
                                  "pending" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleApprove(
                                          registration
                                        )
                                      }
                                      disabled={
                                        actionLoading
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition"
                                    >
                                      <CheckCircle2
                                        size={14}
                                      />

                                      {actionLoading
                                        ? "Processing..."
                                        : "Approve"}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenReject(
                                          registration
                                        )
                                      }
                                      disabled={
                                        actionLoading
                                      }
                                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 transition"
                                    >
                                      <Ban size={14} />
                                      Reject
                                    </button>
                                  </>
                                )}

                                {registration.status ===
                                  "approved" && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                                    <CheckCircle2 size={14} />
                                    Approved
                                  </span>
                                )}

                                {registration.status ===
                                  "rejected" && (
                                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                                    <XCircle size={14} />
                                    Rejected
                                  </span>
                                )}

                              </div>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>
          )}

          {/* =================================================
              ACTIVE PROPERTIES
          ================================================= */}

          {activeTab === "hotels" && (
            <div>

              {loading ? (
                <div className="p-6 space-y-3">

                  {[1, 2, 3, 4, 5].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-20 rounded-xl bg-slate-100 animate-pulse"
                      />
                    )
                  )}

                </div>
              ) : filteredHotels.length === 0 ? (

                <div className="p-14 text-center">

                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                    <Building2 size={27} />
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-800">
                    No properties found
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    {search
                      ? "Try a different search term."
                      : "No approved hotel properties are available yet."}
                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[950px]">

                    <thead>
                      <tr className="bg-[#F7F6FD] border-b border-slate-200">

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Hotel / Property
                        </th>

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Hotel Owner
                        </th>

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Contact
                        </th>

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Location
                        </th>

                        <th className="text-left px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Property Status
                        </th>

                        <th className="text-right px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                          Actions
                        </th>

                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {filteredHotels.map(
                        (hotel) => (

                          <tr
                            key={hotel._id}
                            className="hover:bg-slate-50/70 transition"
                          >

                            {/* HOTEL */}

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-3">

                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Building2 size={18} />
                                </div>

                                <div>

                                  <p className="font-semibold text-sm text-slate-900">
                                    {hotel.hotelName ||
                                      "Unnamed Hotel"}
                                  </p>

                                  <p className="text-xs text-slate-500 mt-1">
                                    Added{" "}
                                    {formatDate(
                                      hotel.createdAt
                                    )}
                                  </p>

                                </div>

                              </div>

                            </td>

                            {/* OWNER */}

                            <td className="px-5 py-4">

                              <p className="text-sm font-semibold text-slate-800">
                                {hotel.ownerName ||
                                  "Owner not provided"}
                              </p>

                            </td>

                            {/* CONTACT */}

                            <td className="px-5 py-4">

                              <div className="flex items-center gap-1.5">
                                <Mail
                                  size={13}
                                  className="text-slate-400"
                                />

                                <p className="text-xs text-slate-600">
                                  {hotel.email ||
                                    "Email not provided"}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 mt-1">
                                <Phone
                                  size={13}
                                  className="text-slate-400"
                                />

                                <p className="text-xs text-slate-500">
                                  {hotel.phone ||
                                    "Phone not provided"}
                                </p>
                              </div>

                            </td>

                            {/* LOCATION */}

                            <td className="px-5 py-4">

                              <div className="flex items-start gap-1.5 text-xs text-slate-600 max-w-[230px]">

                                <MapPin
                                  size={14}
                                  className="shrink-0 text-slate-400 mt-0.5"
                                />

                                <span>
                                  {getAddress(
                                    hotel.address
                                  )}
                                </span>

                              </div>

                            </td>

                            {/* STATUS */}

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px] font-semibold ${getStatusClass(
                                  hotel.status
                                )}`}
                              >
                                {hotel.status ===
                                  "active" && (
                                  <CheckCircle2 size={12} />
                                )}

                                {formatStatus(
                                  hotel.status
                                )}
                              </span>

                            </td>

                            {/* ACTION */}

                            <td className="px-5 py-4 text-right">

                              <button
                                type="button"
                                onClick={() =>
                                  handleViewHotel(hotel)
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                              >
                                <Eye size={14} />
                                View Details
                              </button>

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* =====================================================
          HOTEL APPLICATION / PROPERTY DETAILS MODAL
      ===================================================== */}

      {showDetailsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">

            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 sm:px-6 py-4 flex items-center justify-between">

              <div className="min-w-0">

                <h2 className="text-lg font-bold text-slate-900">
                  {selectedRegistration
                    ? "Hotel Application Details"
                    : "Property Details"}
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {selectedRegistration
                    ? "Review the hotel, owner, subscription, payment, and application details."
                    : "Review the property information and account details."}
                </p>

              </div>

              <button
                type="button"
                onClick={closeDetailsModal}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X size={19} />
              </button>

            </div>

            {/* MODAL BODY */}

            <div className="p-5 sm:p-6">

              {/* =================================================
                  APPLICATION DETAILS
              ================================================= */}

              {selectedRegistration && (
                <div className="space-y-5">

                  {/* HOTEL HEADER */}

                  <div className="flex items-start gap-4">

                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Building2 size={22} />
                    </div>

                    <div className="min-w-0">

                      <h3 className="text-xl font-bold text-slate-900">
                        {selectedRegistration.hotelName ||
                          "Unnamed Hotel"}
                      </h3>

                      <div className="flex flex-wrap gap-2 mt-2">

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClass(
                            selectedRegistration.status
                          )}`}
                        >
                          {selectedRegistration.status ===
                            "pending" && (
                            <Clock3 size={12} />
                          )}

                          {selectedRegistration.status ===
                            "approved" && (
                            <CheckCircle2 size={12} />
                          )}

                          {selectedRegistration.status ===
                            "rejected" && (
                            <XCircle size={12} />
                          )}

                          {formatApplicationStatus(
                            selectedRegistration.status
                          )}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClass(
                            selectedRegistration.paymentStatus
                          )}`}
                        >
                          <CreditCard size={12} />

                          {formatPaymentStatus(
                            selectedRegistration.paymentStatus
                          )}
                        </span>

                      </div>

                    </div>

                  </div>

                  {/* OWNER & CONTACT */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">
                        Hotel Owner
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedRegistration.ownerName ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">
                        Email Address
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900 break-all">
                        {selectedRegistration.email ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">
                        Phone Number
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedRegistration.phone ||
                          "Not provided"}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500">
                        GSTIN
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedRegistration.gstNumber ||
                          "Not provided"}
                      </p>
                    </div>

                  </div>

                  {/* SUBSCRIPTION */}

                  <div className="p-4 border border-slate-200 rounded-xl">

                    <div className="flex items-center gap-2 mb-4">

                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <CreditCard size={17} />
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">
                        Subscription Plan
                      </h3>

                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                      <div>
                        <p className="text-xs text-slate-500">
                          Plan
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {selectedRegistration.planId
                            ?.planName ||
                            "Not selected"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Billing Frequency
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatStatus(
                            selectedRegistration.billingCycle
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">
                          Payment Status
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {formatPaymentStatus(
                            selectedRegistration.paymentStatus
                          )}
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* ADDRESS */}

                  <div className="p-4 border border-slate-200 rounded-xl">

                    <div className="flex items-center gap-2 mb-2">

                      <MapPin
                        size={17}
                        className="text-indigo-600"
                      />

                      <h3 className="text-sm font-bold text-slate-900">
                        Hotel Address
                      </h3>

                    </div>

                    <p className="text-sm text-slate-600">
                      {getAddress(
                        selectedRegistration.address
                      )}
                    </p>

                  </div>

                  {/* APPLICATION INFORMATION */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="p-4 bg-slate-50 rounded-xl">

                      <div className="flex items-center gap-2">

                        <CalendarDays
                          size={16}
                          className="text-slate-500"
                        />

                        <p className="text-xs text-slate-500">
                          Application Date
                        </p>

                      </div>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatDate(
                          selectedRegistration.createdAt
                        )}
                      </p>

                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">

                      <div className="flex items-center gap-2">

                        <FileCheck2
                          size={16}
                          className="text-slate-500"
                        />

                        <p className="text-xs text-slate-500">
                          Application ID
                        </p>

                      </div>

                      <p className="mt-1 text-xs font-medium text-slate-700 break-all">
                        {selectedRegistration._id}
                      </p>

                    </div>

                  </div>

                  {/* REJECTION INFORMATION */}

                  {selectedRegistration.rejectionReason && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">

                      <div className="flex items-center gap-2">

                        <XCircle
                          size={16}
                          className="text-red-600"
                        />

                        <p className="text-xs font-semibold text-red-700">
                          Reason for Rejection
                        </p>

                      </div>

                      <p className="mt-1 text-sm text-red-800">
                        {
                          selectedRegistration.rejectionReason
                        }
                      </p>

                    </div>
                  )}

                  {/* ERROR */}

                  {actionError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">

                      <AlertCircle
                        size={17}
                        className="text-red-600 shrink-0"
                      />

                      <p className="text-sm text-red-700">
                        {actionError}
                      </p>

                    </div>
                  )}

                  {/* ACTIONS */}

                  {selectedRegistration.status ===
                    "pending" && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">

                      <button
                        type="button"
                        onClick={() =>
                          handleApprove(
                            selectedRegistration
                          )
                        }
                        disabled={actionLoading}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition"
                      >
                        <CheckCircle2 size={16} />

                        {actionLoading
                          ? "Processing..."
                          : "Approve Application"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenReject(
                            selectedRegistration
                          )
                        }
                        disabled={actionLoading}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition"
                      >
                        <Ban size={16} />
                        Reject Application
                      </button>

                    </div>
                  )}

                </div>
              )}

              {/* =================================================
                  PROPERTY DETAILS
              ================================================= */}

              {selectedHotel && (
                <div className="space-y-5">

                  {/* PROPERTY HEADER */}

                  <div className="flex items-start gap-4">

                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Building2 size={22} />
                    </div>

                    <div>

                      <h3 className="text-xl font-bold text-slate-900">
                        {selectedHotel.hotelName ||
                          "Unnamed Hotel"}
                      </h3>

                      <span
                        className={`inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${getStatusClass(
                          selectedHotel.status
                        )}`}
                      >
                        {selectedHotel.status ===
                          "active" && (
                          <CheckCircle2 size={12} />
                        )}

                        {formatStatus(
                          selectedHotel.status
                        )}
                      </span>

                    </div>

                  </div>

                  {/* OWNER / CONTACT */}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div className="p-4 bg-slate-50 rounded-xl">

                      <div className="flex items-center gap-2">

                        <Users size={16} className="text-slate-500" />

                        <p className="text-xs text-slate-500">
                          Hotel Owner
                        </p>

                      </div>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedHotel.ownerName ||
                          "Not provided"}
                      </p>

                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">

                      <div className="flex items-center gap-2">

                        <Mail size={16} className="text-slate-500" />

                        <p className="text-xs text-slate-500">
                          Email Address
                        </p>

                      </div>

                      <p className="mt-1 text-sm font-semibold break-all text-slate-900">
                        {selectedHotel.email ||
                          "Not provided"}
                      </p>

                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">

                      <div className="flex items-center gap-2">

                        <Phone
                          size={16}
                          className="text-slate-500"
                        />

                        <p className="text-xs text-slate-500">
                          Phone Number
                        </p>

                      </div>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedHotel.phone ||
                          "Not provided"}
                      </p>

                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl">

                      <div className="flex items-center gap-2">

                        <ShieldCheck
                          size={16}
                          className="text-slate-500"
                        />

                        <p className="text-xs text-slate-500">
                          GSTIN
                        </p>

                      </div>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {selectedHotel.gstNumber ||
                          "Not provided"}
                      </p>

                    </div>

                  </div>

                  {/* ADDRESS */}

                  <div className="p-4 border border-slate-200 rounded-xl">

                    <div className="flex items-center gap-2 mb-2">

                      <MapPin
                        size={17}
                        className="text-indigo-600"
                      />

                      <h3 className="text-sm font-bold text-slate-900">
                        Hotel Address
                      </h3>

                    </div>

                    <p className="text-sm text-slate-600">
                      {getAddress(
                        selectedHotel.address
                      )}
                    </p>

                  </div>

                  {/* PROPERTY ID */}

                  <div className="p-4 bg-slate-50 rounded-xl">

                    <p className="text-xs text-slate-500">
                      Property ID
                    </p>

                    <p className="mt-1 text-xs font-medium break-all text-slate-700">
                      {selectedHotel._id}
                    </p>

                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          REJECT APPLICATION MODAL
      ===================================================== */}

      {showRejectModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">

            {/* HEADER */}

            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between">

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Ban size={20} />
                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-900">
                    Reject Application
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Please provide a clear reason for rejecting this hotel application.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setActionError("");
                }}
                className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
              >
                <X size={18} />
              </button>

            </div>

            {/* BODY */}

            <div className="p-5">

              {/* SELECTED HOTEL */}

              <div className="mb-5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">

                <p className="text-xs text-slate-500">
                  Hotel Application
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedRegistration?.hotelName ||
                    "Selected Hotel"}
                </p>

                {selectedRegistration?.ownerName && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    Owner:{" "}
                    {selectedRegistration.ownerName}
                  </p>
                )}

              </div>

              {/* STANDARD REASON */}

              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                Reason for Rejection
              </label>

              <select
                value={rejectionReason}
                onChange={(e) =>
                  setRejectionReason(
                    e.target.value
                  )
                }
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm outline-none bg-[#F5F6FF] text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                {rejectionReasons.map(
                  (reason) => (
                    <option
                      key={reason.value}
                      value={reason.value}
                    >
                      {reason.label}
                    </option>
                  )
                )}
              </select>

              {/* CUSTOM EXPLANATION */}

              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mt-5 mb-2">
                Additional Details
              </label>

              <textarea
                value={
                  rejectionReasons.some(
                    (item) =>
                      item.value ===
                      rejectionReason
                  ) &&
                  rejectionReason !== "other"
                    ? rejectionReasons.find(
                        (item) =>
                          item.value ===
                          rejectionReason
                      )?.label || ""
                    : rejectionReason
                }
                onChange={(e) =>
                  setRejectionReason(
                    e.target.value
                  )
                }
                rows={4}
                placeholder="Explain why this application cannot be approved..."
                className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />

              <p className="mt-1 text-xs text-slate-400">
                Please provide at least 5 characters.
              </p>

              {/* ERROR */}

              {actionError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2">

                  <AlertCircle
                    size={17}
                    className="text-red-600 shrink-0"
                  />

                  <p className="text-sm text-red-700">
                    {actionError}
                  </p>

                </div>
              )}

              {/* BUTTONS */}

              <div className="flex gap-3 mt-5">

                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setActionError("");
                  }}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleReject}
                  disabled={
                    actionLoading ||
                    rejectionReason.trim()
                      .length < 5
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50 transition"
                >
                  <Ban size={16} />

                  {actionLoading
                    ? "Rejecting..."
                    : "Confirm Rejection"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default SaaSAdminHotels;