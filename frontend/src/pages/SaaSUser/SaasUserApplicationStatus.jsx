import React, { useEffect, useMemo, useState } from "react";

import {
  Building2,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  CreditCard,
  CalendarDays,
  Mail,
  Phone,
  ShieldCheck,
  MapPin,
  ReceiptText,
  User,
  ArrowRight,
  Copy,
  Check,
  FileCheck2,
  CircleDashed,
  Loader2,
} from "lucide-react";

import SaaSSetupProgress from "./SaaSSetupProgress";

import { getRegistrationStatus } from "../../service/hotelRegistrationApi";


// ============================================================
// HELPERS
// ============================================================

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


const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};


const formatStatus = (status) => {
  if (!status) {
    return "Unknown";
  }

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};


const getStatusConfig = (status) => {
  switch (status) {
    case "approved":
      return {
        title: "Application Approved",
        description:
          "Your hotel registration has been approved. Your account setup can now continue.",
        icon: CheckCircle2,
        iconBg: "bg-[#DDF7EC]",
        iconColor: "text-[#087A58]",
        badgeBg: "bg-[#DDF7EC]",
        badgeText: "text-[#087A58]",
        badgeBorder: "border-[#B7EBD4]",
        accent: "bg-[#087A58]",
        lightBg: "bg-[#F0FBF6]",
        border: "border-[#CBEFDE]",
      };

    case "rejected":
      return {
        title: "Application Rejected",
        description:
          "Your hotel registration application was not approved.",
        icon: XCircle,
        iconBg: "bg-[#FDE8E8]",
        iconColor: "text-[#C62828]",
        badgeBg: "bg-[#FDECEC]",
        badgeText: "text-[#B42318]",
        badgeBorder: "border-[#F5C2C2]",
        accent: "bg-[#C62828]",
        lightBg: "bg-[#FFF7F7]",
        border: "border-[#F3CCCC]",
      };

    case "pending":
    default:
      return {
        title: "Application Under Review",
        description:
          "Your hotel registration has been received and is waiting for admin approval.",
        icon: Clock3,
        iconBg: "bg-[#FFF3D6]",
        iconColor: "text-[#B77900]",
        badgeBg: "bg-[#FFF6DF]",
        badgeText: "text-[#9A6700]",
        badgeBorder: "border-[#F3D89B]",
        accent: "bg-[#B77900]",
        lightBg: "bg-[#FFFBF1]",
        border: "border-[#F2DFB0]",
      };
  }
};


const getStatusData = (response) => {
  if (response?.data?.registration) {
    return response.data.registration;
  }

  if (response?.data) {
    return response.data;
  }

  if (response?.registration) {
    return response.registration;
  }

  return response || null;
};


// ============================================================
// MAIN COMPONENT
// ============================================================

const SaaSUserApplicationStatus = () => {
  const [registrationId, setRegistrationId] = useState("");

  const [application, setApplication] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [searched, setSearched] = useState(false);

  const [copied, setCopied] = useState(false);


  // ==========================================================
  // LOAD SAVED REGISTRATION ID
  // ==========================================================

  useEffect(() => {
    const savedId = localStorage.getItem("saasRegistrationId");

    if (savedId) {
      setRegistrationId(savedId);

      loadApplication(savedId);
    }
  }, []);


  // ==========================================================
  // LOAD APPLICATION
  // ==========================================================

  const loadApplication = async (id) => {
    const cleanId = id?.trim();

    if (!cleanId) {
      setError("Please enter your application ID.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSearched(true);

      const response = await getRegistrationStatus(cleanId);

      const data = getStatusData(response);

      if (!data) {
        throw new Error("Application details were not found.");
      }

      setApplication(data);

      localStorage.setItem("saasRegistrationId", cleanId);
    } catch (err) {
      console.error("Application status error:", err);

      setApplication(null);

      setError(
        err?.message ||
          err?.data?.message ||
          err?.response?.data?.message ||
          "Unable to find your application. Please check the application ID."
      );
    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearch = (e) => {
    e.preventDefault();

    loadApplication(registrationId);
  };


  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = () => {
    if (!registrationId.trim()) {
      return;
    }

    loadApplication(registrationId);
  };


  // ==========================================================
  // COPY APPLICATION ID
  // ==========================================================

  const copyApplicationId = async () => {
    const appId =
      application?.registrationId ||
      application?._id ||
      registrationId;

    if (!appId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(appId);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch (copyError) {
      console.error("Copy failed:", copyError);
    }
  };


  // ==========================================================
  // STATUS CONFIG
  // ==========================================================

  const statusConfig = useMemo(() => {
    return application
      ? getStatusConfig(application.status)
      : getStatusConfig("pending");
  }, [application]);


  const StatusIcon = statusConfig.icon;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-[#F7F6FC] text-[#172033]">

      {/* ======================================================
          ANIMATIONS
      ======================================================= */}

      <style>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes softPulse {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: 0.55;
          }
        }

        @keyframes spinSlow {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }
      `}</style>


      {/* ======================================================
          PROGRESS
      ======================================================= */}

      <SaaSSetupProgress activeStep={5} />


      {/* ======================================================
          MAIN
      ======================================================= */}

      <main
        className="
          mx-auto
          w-full
          max-w-[1440px]
          px-4
          py-7
          sm:px-6
          sm:py-9
          lg:px-8
          xl:px-10
        "
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header
          className="
            mb-7
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-end
            lg:justify-between
          "
          style={{
            animation: "fadeUp 0.45s ease-out both",
          }}
        >

          <div>

            {/* BADGE */}

            <div
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                bg-[#EAE9FF]
                px-3
                py-1.5
                text-[10px]
                font-bold
                uppercase
                tracking-[0.08em]
                text-[#4338CA]
              "
            >
              <span
                className="
                  h-1.5
                  w-1.5
                  rounded-full
                  bg-[#4338CA]
                "
              />

              <span>
                Hospitality Enterprise Application
              </span>
            </div>


            {/* TITLE */}

            <h1
              className="
                mt-3
                text-[28px]
                font-bold
                leading-[1.1]
                tracking-[-0.045em]
                text-[#111827]
                sm:text-[38px]
              "
            >
              Application Status
            </h1>


            {/* DESCRIPTION */}

            <p
              className="
                mt-2
                max-w-2xl
                text-[13px]
                font-medium
                leading-6
                text-[#475569]
                sm:text-[14px]
              "
            >
              Track your hotel registration, subscription,
              payment and admin approval status.
            </p>

          </div>


          {/* SECURITY */}

          <div
            className="
              flex
              w-fit
              items-center
              gap-3
              rounded-xl
              border
              border-[#E1E4EB]
              bg-white
              px-4
              py-3
            "
          >

            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-lg
                bg-[#E8FAF3]
                text-[#087A58]
              "
            >
              <ShieldCheck size={19} />
            </div>


            <div>

              <p
                className="
                  text-[11px]
                  font-bold
                  leading-4
                  text-[#1E293B]
                "
              >
                Secure Application
              </p>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  font-medium
                  leading-4
                  text-[#64748B]
                "
              >
                Your application data is protected
              </p>

            </div>

          </div>

        </header>


        {/* ====================================================
            SEARCH
        ==================================================== */}

        <section
          className="
            mb-6
            rounded-[20px]
            border
            border-[#E0E3EA]
            bg-white
            p-5
            sm:p-6
          "
          style={{
            animation: "fadeUp 0.5s ease-out 0.05s both",
          }}
        >

          <div
            className="
              flex
              flex-col
              gap-5
              lg:flex-row
              lg:items-end
              lg:justify-between
            "
          >

            <div>

              <div className="flex items-center gap-3">

                <div
                  className="
                    flex
                    h-10
                    w-10
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#EEEEFF]
                    text-[#4338CA]
                  "
                >
                  <Search size={18} />
                </div>

                <div>

                  <h2
                    className="
                      text-[16px]
                      font-bold
                      leading-6
                      text-[#172033]
                    "
                  >
                    Find Your Application
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[12px]
                      font-medium
                      leading-5
                      text-[#64748B]
                    "
                  >
                    Enter the application ID received after registration.
                  </p>

                </div>

              </div>

            </div>


            <form
              onSubmit={handleSearch}
              className="
                flex
                w-full
                flex-col
                gap-3
                sm:flex-row
                lg:max-w-xl
              "
            >

              <div className="relative flex-1">

                <Search
                  size={16}
                  className="
                    pointer-events-none
                    absolute
                    left-3.5
                    top-1/2
                    -translate-y-1/2
                    text-[#64748B]
                  "
                />

                <input
                  type="text"
                  value={registrationId}
                  onChange={(e) =>
                    setRegistrationId(e.target.value)
                  }
                  placeholder="Enter application ID"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-[#D9DDE7]
                    bg-[#F5F6FA]
                    py-3
                    pl-10
                    pr-4
                    text-[13px]
                    font-semibold
                    text-[#172033]
                    outline-none
                    transition-all
                    duration-200
                    placeholder:text-[#94A3B8]
                    focus:border-[#4338CA]
                    focus:bg-white
                    focus:ring-2
                    focus:ring-[#4338CA]/10
                  "
                />

              </div>


              <button
                type="submit"
                disabled={
                  loading ||
                  !registrationId.trim()
                }
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#4338CA]
                  px-5
                  py-3
                  text-[13px]
                  font-bold
                  text-white
                  transition-all
                  duration-200
                  hover:bg-[#3730A3]
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >

                {loading ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />

                    Checking...
                  </>
                ) : (
                  <>
                    <Search size={16} />

                    Check Status
                  </>
                )}

              </button>

            </form>

          </div>

        </section>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (

          <div
            className="
              mb-6
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-[#F1C7C7]
              bg-[#FFF7F7]
              px-4
              py-4
            "
            style={{
              animation: "fadeUp 0.3s ease-out both",
            }}
          >

            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#FDE8E8]
                text-[#C62828]
              "
            >
              <AlertCircle size={17} />
            </div>


            <div>

              <p
                className="
                  text-[13px]
                  font-bold
                  text-[#991B1B]
                "
              >
                Unable to Check Application
              </p>

              <p
                className="
                  mt-1
                  text-[12px]
                  font-medium
                  leading-5
                  text-[#B42318]
                "
              >
                {error}
              </p>

            </div>

          </div>

        )}


        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (

          <div
            className="
              rounded-[20px]
              border
              border-[#E0E3EA]
              bg-white
              p-8
            "
          >

            <div className="flex flex-col items-center">

              <div
                className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#EEEEFF]
                  text-[#4338CA]
                "
              >
                <RefreshCw
                  size={25}
                  className="animate-spin"
                />
              </div>

              <p
                className="
                  mt-4
                  text-[15px]
                  font-bold
                  text-[#172033]
                "
              >
                Checking your application
              </p>

              <p
                className="
                  mt-1
                  text-[12px]
                  font-medium
                  text-[#64748B]
                "
              >
                Please wait while we retrieve the latest status.
              </p>

            </div>

          </div>

        )}


        {/* ====================================================
            APPLICATION
        ==================================================== */}

        {!loading && application && (

          <div className="space-y-6">


            {/* ==================================================
                TOP STATUS / TRACKING GRID
            ================================================== */}

            <div
              className="
                grid
                grid-cols-1
                gap-6
                xl:grid-cols-[minmax(0,1fr)_390px]
              "
            >


              {/* ==================================================
                  LEFT STATUS
              ================================================== */}

              <section
                className="
                  overflow-hidden
                  rounded-[22px]
                  border
                  border-[#E0E3EA]
                  bg-white
                "
                style={{
                  animation: "fadeUp 0.5s ease-out both",
                }}
              >

                {/* STATUS HEADER */}

                <div
                  className="
                    border-b
                    border-[#E5E7ED]
                    bg-[#FAFAFD]
                    px-5
                    py-6
                    sm:px-7
                  "
                >

                  <div className="flex items-start gap-4">

                    <div
                      className={`
                        flex
                        h-14
                        w-14
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        ${statusConfig.iconBg}
                        ${statusConfig.iconColor}
                      `}
                    >
                      <StatusIcon size={27} />
                    </div>


                    <div className="min-w-0 flex-1">

                      <div
                        className="
                          flex
                          flex-wrap
                          items-center
                          gap-2
                        "
                      >

                        <span
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            border
                            px-3
                            py-1
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-[0.08em]
                            ${statusConfig.badgeBg}
                            ${statusConfig.badgeText}
                            ${statusConfig.badgeBorder}
                          `}
                        >

                          <span
                            className={`
                              h-1.5
                              w-1.5
                              rounded-full
                              ${statusConfig.accent}
                            `}
                          />

                          {formatStatus(application.status)}

                        </span>

                      </div>


                      <h2
                        className="
                          mt-2
                          text-[24px]
                          font-bold
                          leading-tight
                          tracking-[-0.035em]
                          text-[#111827]
                          sm:text-[29px]
                        "
                      >
                        {statusConfig.title}
                      </h2>


                      <p
                        className="
                          mt-2
                          max-w-2xl
                          text-[13px]
                          font-medium
                          leading-6
                          text-[#475569]
                        "
                      >
                        {statusConfig.description}
                      </p>

                    </div>

                  </div>

                </div>


                {/* STATUS MESSAGE */}

                <div className="p-5 sm:p-7">

                  {application.status === "pending" && (

                    <div
                      className="
                        rounded-xl
                        border
                        border-[#F0DEAE]
                        bg-[#FFFBF1]
                        p-4
                      "
                    >

                      <div className="flex items-start gap-3">

                        <div
                          className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#FFF0C8]
                            text-[#B77900]
                          "
                        >
                          <Clock3 size={17} />
                        </div>

                        <div>

                          <p
                            className="
                              text-[13px]
                              font-bold
                              text-[#7C5700]
                            "
                          >
                            Admin review is in progress
                          </p>

                          <p
                            className="
                              mt-1
                              text-[12px]
                              font-medium
                              leading-5
                              text-[#946F13]
                            "
                          >
                            Your submitted hotel details are currently
                            waiting for admin approval.
                          </p>

                        </div>

                      </div>

                    </div>

                  )}


                  {application.status === "approved" && (

                    <div
                      className="
                        rounded-xl
                        border
                        border-[#CBEFDE]
                        bg-[#F0FBF6]
                        p-4
                      "
                    >

                      <div className="flex items-start gap-3">

                        <div
                          className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#DDF7EC]
                            text-[#087A58]
                          "
                        >
                          <ShieldCheck size={17} />
                        </div>

                        <div>

                          <p
                            className="
                              text-[13px]
                              font-bold
                              text-[#075E46]
                            "
                          >
                            Your hotel application is approved
                          </p>

                          <p
                            className="
                              mt-1
                              text-[12px]
                              font-medium
                              leading-5
                              text-[#087A58]
                            "
                          >
                            Your hotel account and subscription
                            have been approved successfully.
                          </p>

                        </div>

                      </div>

                    </div>

                  )}


                  {application.status === "rejected" && (

                    <div
                      className="
                        rounded-xl
                        border
                        border-[#F3CCCC]
                        bg-[#FFF7F7]
                        p-4
                      "
                    >

                      <div className="flex items-start gap-3">

                        <div
                          className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-[#FDE8E8]
                            text-[#C62828]
                          "
                        >
                          <XCircle size={17} />
                        </div>

                        <div>

                          <p
                            className="
                              text-[13px]
                              font-bold
                              text-[#991B1B]
                            "
                          >
                            Application requires attention
                          </p>

                          <p
                            className="
                              mt-1
                              text-[12px]
                              font-medium
                              leading-5
                              text-[#B42318]
                            "
                          >
                            {application.rejectionReason ||
                              "No rejection reason was provided."}
                          </p>

                        </div>

                      </div>

                    </div>

                  )}


                  {/* APPLICATION ID */}

                  <div className="mt-6">

                    <div
                      className="
                        flex
                        flex-col
                        gap-3
                        rounded-xl
                        border
                        border-[#E0E3EA]
                        bg-[#F8F8FC]
                        p-4
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                      "
                    >

                      <div className="min-w-0">

                        <p
                          className="
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-[0.1em]
                            text-[#64748B]
                          "
                        >
                          Application ID
                        </p>

                        <p
                          className="
                            mt-1
                            break-all
                            font-mono
                            text-[14px]
                            font-bold
                            text-[#172033]
                          "
                        >
                          {application.registrationId ||
                            application._id ||
                            registrationId}
                        </p>

                      </div>


                      <button
                        type="button"
                        onClick={copyApplicationId}
                        className="
                          inline-flex
                          shrink-0
                          items-center
                          justify-center
                          gap-2
                          rounded-lg
                          border
                          border-[#D9DDE7]
                          bg-white
                          px-3
                          py-2
                          text-[11px]
                          font-bold
                          text-[#334155]
                          transition-all
                          duration-200
                          hover:border-[#4338CA]
                          hover:bg-[#F5F3FF]
                          hover:text-[#4338CA]
                        "
                      >

                        {copied ? (
                          <>
                            <Check size={14} />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            Copy ID
                          </>
                        )}

                      </button>

                    </div>

                  </div>


                  {/* TRACKING TIMELINE */}

                  <div className="mt-7">

                    <div
                      className="
                        mb-5
                        flex
                        items-center
                        justify-between
                      "
                    >

                      <div>

                        <p
                          className="
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-[0.1em]
                            text-[#64748B]
                          "
                        >
                          Application Journey
                        </p>

                        <h3
                          className="
                            mt-1
                            text-[17px]
                            font-bold
                            text-[#172033]
                          "
                        >
                          Registration Progress
                        </h3>

                      </div>


                      <span
                        className={`
                          rounded-full
                          border
                          px-3
                          py-1
                          text-[10px]
                          font-bold
                          ${statusConfig.badgeBg}
                          ${statusConfig.badgeText}
                          ${statusConfig.badgeBorder}
                        `}
                      >
                        {formatStatus(application.status)}
                      </span>

                    </div>


                    <ApplicationTimeline
                      status={application.status}
                    />

                  </div>

                </div>

              </section>


              {/* ==================================================
                  RIGHT TRACKING
              ================================================== */}

              <aside
                className="
                  min-w-0
                  xl:sticky
                  xl:top-6
                  xl:self-start
                "
              >

                <div
                  className="
                    overflow-hidden
                    rounded-[22px]
                    border
                    border-[#DDE1EA]
                    bg-white
                  "
                  style={{
                    animation: "fadeUp 0.5s ease-out 0.1s both",
                  }}
                >

                  {/* SUMMARY HEADER */}

                  <div
                    className="
                      border-b
                      border-[#E0E2EC]
                      bg-[#EAE9FF]
                      px-5
                      py-6
                    "
                  >

                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.12em]
                        text-[#475569]
                      "
                    >
                      Application Summary
                    </p>


                    <h2
                      className="
                        mt-2
                        text-[22px]
                        font-bold
                        leading-tight
                        tracking-[-0.035em]
                        text-[#111827]
                      "
                    >
                      {application.hotelName ||
                        "Hotel Application"}
                    </h2>


                    <div
                      className="
                        mt-3
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-[#DDF7EC]
                        px-3
                        py-1.5
                        text-[10px]
                        font-bold
                        text-[#087A58]
                      "
                    >

                      <span
                        className="
                          h-1.5
                          w-1.5
                          rounded-full
                          bg-[#087A58]
                        "
                      />

                      Application Received

                    </div>

                  </div>


                  <div className="p-5">

                    {/* PLAN */}

                    <SummaryItem
                      icon={CreditCard}
                      label="Selected Plan"
                      value={
                        application.planName ||
                        application.planId?.planName ||
                        "N/A"
                      }
                    />


                    {/* BILLING */}

                    <SummaryItem
                      icon={CalendarDays}
                      label="Billing Cycle"
                      value={formatStatus(
                        application.billingCycle
                      )}
                    />


                    {/* PAYMENT */}

                    <SummaryItem
                      icon={CheckCircle2}
                      label="Payment Status"
                      value={formatStatus(
                        application.paymentStatus
                      )}
                      success={
                        String(
                          application.paymentStatus || ""
                        ).toLowerCase() === "paid" ||
                        String(
                          application.paymentStatus || ""
                        ).toLowerCase() === "completed" ||
                        String(
                          application.paymentStatus || ""
                        ).toLowerCase() === "success"
                      }
                    />


                    {/* AMOUNT */}

                    {application.amount !== undefined && (

                      <SummaryItem
                        icon={ReceiptText}
                        label="Amount"
                        value={formatCurrency(
                          application.amount
                        )}
                      />

                    )}


                    <div
                      className="
                        my-5
                        h-px
                        bg-[#E7E9EF]
                      "
                    />


                    {/* SUBMITTED */}

                    <div>

                      <p
                        className="
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.1em]
                          text-[#64748B]
                        "
                      >
                        Submitted On
                      </p>

                      <p
                        className="
                          mt-1
                          text-[13px]
                          font-bold
                          text-[#172033]
                        "
                      >
                        {formatDateTime(
                          application.createdAt
                        )}
                      </p>

                    </div>


                    {/* APPROVED */}

                    {application.approvedAt && (

                      <div className="mt-4">

                        <p
                          className="
                            text-[10px]
                            font-bold
                            uppercase
                            tracking-[0.1em]
                            text-[#64748B]
                          "
                        >
                          Approved On
                        </p>

                        <p
                          className="
                            mt-1
                            text-[13px]
                            font-bold
                            text-[#087A58]
                          "
                        >
                          {formatDateTime(
                            application.approvedAt
                          )}
                        </p>

                      </div>

                    )}


              

                   


                    {/* SECURITY */}

                    <div
                      className="
                        mt-5
                        flex
                        items-start
                        gap-2.5
                        border-t
                        border-[#E7E9EF]
                        pt-4
                      "
                    >

                      <ShieldCheck
                        size={15}
                        className="
                          mt-0.5
                          shrink-0
                          text-[#087A58]
                        "
                      />

                      <p
                        className="
                          text-[11px]
                          font-medium
                          leading-5
                          text-[#64748B]
                        "
                      >
                        Your application information is securely
                        stored and used for account provisioning.
                      </p>

                    </div>

                  </div>

                </div>

              </aside>

            </div>


            {/* ==================================================
                HOTEL INFORMATION
            ================================================== */}

            <InfoSection
              icon={Building2}
              title="Hotel Information"
              description="Details submitted during hotel registration."
            >

              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  sm:grid-cols-2
                "
              >

                <InfoBox
                  label="Hotel Name"
                  value={application.hotelName}
                />

                <InfoBox
                  label="Owner Name"
                  value={application.ownerName}
                  icon={User}
                />

                <InfoBox
                  label="Email Address"
                  value={application.email}
                  icon={Mail}
                />

                <InfoBox
                  label="Phone Number"
                  value={application.phone}
                  icon={Phone}
                />

              </div>

            </InfoSection>


            {/* ==================================================
                ADDRESS
            ================================================== */}

            <InfoSection
              icon={MapPin}
              title="Hotel Address"
              description="Registered hotel location provided during application."
            >

              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  sm:grid-cols-2
                  lg:grid-cols-4
                "
              >

                <InfoBox
                  label="Street / Address"
                  value={application.address?.street}
                  icon={MapPin}
                />

                <InfoBox
                  label="City"
                  value={application.address?.city}
                />

                <InfoBox
                  label="State"
                  value={application.address?.state}
                />

                <InfoBox
                  label="Country / Pincode"
                  value={[
                    application.address?.country,
                    application.address?.pincode,
                  ]
                    .filter(Boolean)
                    .join(" - ")}
                />

              </div>

            </InfoSection>


            {/* ==================================================
                TAX
            ================================================== */}

            <InfoSection
              icon={ReceiptText}
              title="Tax Information"
              description="Tax registration information submitted for billing."
            >

              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  sm:grid-cols-2
                "
              >

                <InfoBox
                  label="GST Number"
                  value={
                    application.gstNumber ||
                    "Not provided"
                  }
                  mono
                />


                <div
                  className="
                    rounded-xl
                    border
                    border-[#E0E3EA]
                    bg-[#FAFAFD]
                    p-4
                  "
                >

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-3
                    "
                  >

                    <div>

                      <p
                        className="
                          text-[10px]
                          font-bold
                          uppercase
                          tracking-[0.08em]
                          text-[#64748B]
                        "
                      >
                        Tax Calculation
                      </p>

                      <p
                        className="
                          mt-1
                          text-[13px]
                          font-bold
                          text-[#172033]
                        "
                      >
                        {application.taxEnabled
                          ? "Enabled"
                          : "Disabled"}
                      </p>

                    </div>


                    <div
                      className={`
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-full
                        ${
                          application.taxEnabled
                            ? "bg-[#DDF7EC] text-[#087A58]"
                            : "bg-[#F1F2F5] text-[#64748B]"
                        }
                      `}
                    >

                      {application.taxEnabled ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <CircleDashed size={17} />
                      )}

                    </div>

                  </div>

                </div>

              </div>

            </InfoSection>


            {/* ==================================================
                PLAN & PAYMENT
            ================================================== */}

            <InfoSection
              icon={CreditCard}
              title="Plan & Payment"
              description="Subscription and payment information associated with this application."
            >

              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  sm:grid-cols-2
                  lg:grid-cols-4
                "
              >

                <InfoBox
                  label="Selected Plan"
                  value={
                    application.planName ||
                    application.planId?.planName ||
                    "N/A"
                  }
                />

                <InfoBox
                  label="Billing Cycle"
                  value={formatStatus(
                    application.billingCycle
                  )}
                />

                <InfoBox
                  label="Payment Status"
                  value={formatStatus(
                    application.paymentStatus
                  )}
                />

                {application.amount !== undefined && (

                  <InfoBox
                    label="Amount"
                    value={formatCurrency(
                      application.amount
                    )}
                  />

                )}

              </div>

            </InfoSection>


            {/* ==================================================
                APPLICATION INFORMATION
            ================================================== */}

            <InfoSection
              icon={FileCheck2}
              title="Application Information"
              description="Tracking and submission details."
            >

              <div
                className="
                  grid
                  grid-cols-1
                  gap-4
                  sm:grid-cols-2
                  lg:grid-cols-3
                "
              >

                <InfoBox
                  label="Application ID"
                  value={
                    application.registrationId ||
                    application._id
                  }
                  mono
                />

                <InfoBox
                  label="Submitted On"
                  value={formatDateTime(
                    application.createdAt
                  )}
                  icon={CalendarDays}
                />

                {application.approvedAt && (

                  <InfoBox
                    label="Approved On"
                    value={formatDateTime(
                      application.approvedAt
                    )}
                    icon={CheckCircle2}
                  />

                )}

              </div>

            </InfoSection>


            {/* ==================================================
                BOTTOM ACTION
            ================================================== */}

            <div
              className="
                flex
                flex-col
                gap-4
                rounded-[20px]
                border
                border-[#E0E3EA]
                bg-white
                p-5
                sm:flex-row
                sm:items-center
                sm:justify-between
                sm:p-6
              "
            >

              <div className="flex items-start gap-3">

                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#EAE9FF]
                    text-[#4338CA]
                  "
                >
                  <ShieldCheck size={19} />
                </div>


                <div>

                  <p
                    className="
                      text-[13px]
                      font-bold
                      text-[#172033]
                    "
                  >
                    Keep your application ID
                  </p>

                  <p
                    className="
                      mt-1
                      text-[11px]
                      font-medium
                      leading-5
                      text-[#64748B]
                    "
                  >
                    You can use it anytime to check your latest
                    application status.
                  </p>

                </div>

              </div>


            </div>

          </div>

        )}


        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {!loading &&
          !application &&
          !error &&
          !searched && (

            <div
              className="
                rounded-[20px]
                border
                border-[#E0E3EA]
                bg-white
                p-8
                text-center
                sm:p-12
              "
              style={{
                animation: "fadeUp 0.5s ease-out both",
              }}
            >

              <div
                className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-[#EEEEFF]
                  text-[#4338CA]
                "
              >
                <Search size={27} />
              </div>


              <h2
                className="
                  mt-5
                  text-[20px]
                  font-bold
                  tracking-[-0.025em]
                  text-[#172033]
                "
              >
                Check Your Application
              </h2>


              <p
                className="
                  mx-auto
                  mt-2
                  max-w-md
                  text-[13px]
                  font-medium
                  leading-6
                  text-[#64748B]
                "
              >
                Enter your application ID above to view
                your hotel registration status and
                application details.
              </p>

            </div>

          )}

      </main>

    </div>
  );
};


// ============================================================
// APPLICATION TIMELINE
// ============================================================

const ApplicationTimeline = ({ status }) => {
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isPending = status === "pending";


  const steps = [
    {
      title: "Application Submitted",
      description:
        "Your hotel details were submitted successfully.",
      icon: CheckCircle2,
      complete: true,
    },
    {
      title: "Admin Review",
      description:
        isPending
          ? "Your application is currently waiting for admin approval."
          : isRejected
            ? "The application was reviewed by the admin team."
            : "The application review has been completed.",
      icon:
        isPending
          ? Clock3
          : isRejected
            ? XCircle
            : CheckCircle2,
      active: isPending,
      complete: isApproved || isRejected,
      rejected: isRejected,
    },
    {
      title: "Account Provisioning",
      description:
        isApproved
          ? "Your hotel account can continue to the provisioning stage."
          : "This stage will become available after application approval.",
      icon: Building2,
      active: isApproved,
      complete: false,
    },
  ];


  return (
    <div className="space-y-1">

      {steps.map((step, index) => {

        const Icon = step.icon;

        const iconClass = step.rejected
          ? "bg-[#FDE8E8] text-[#C62828]"
          : step.complete
            ? "bg-[#DDF7EC] text-[#087A58]"
            : step.active
              ? "bg-[#4338CA] text-white"
              : "bg-[#EEF0F4] text-[#64748B]";


        return (
          <div
            key={step.title}
            className="relative flex items-start gap-3"
          >

            <div className="flex flex-col items-center">

              <div
                className={`
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  ${iconClass}
                  ${
                    step.active
                      ? "ring-4 ring-[#EAE9FF]"
                      : ""
                  }
                `}
              >

                <Icon
                  size={16}
                  className={
                    step.active
                      ? "animate-pulse"
                      : ""
                  }
                />

              </div>


              {index < steps.length - 1 && (

                <div
                  className={`
                    mt-1
                    h-10
                    w-0.5
                    ${
                      step.complete
                        ? "bg-[#9ADCBF]"
                        : "bg-[#E4E7ED]"
                    }
                  `}
                />

              )}

            </div>


            <div className="min-w-0 flex-1 pb-5">

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  justify-between
                  gap-2
                "
              >

                <p
                  className={`
                    text-[13px]
                    font-bold
                    ${
                      step.active
                        ? "text-[#4338CA]"
                        : step.rejected
                          ? "text-[#C62828]"
                          : step.complete
                            ? "text-[#172033]"
                            : "text-[#64748B]"
                    }
                  `}
                >
                  {step.title}
                </p>


                {step.complete && (

                  <span
                    className="
                      text-[10px]
                      font-bold
                      text-[#087A58]
                    "
                  >
                    Completed
                  </span>

                )}


                {step.active && (

                  <span
                    className="
                      rounded-full
                      bg-[#EAE9FF]
                      px-2
                      py-0.5
                      text-[9px]
                      font-bold
                      text-[#4338CA]
                    "
                  >
                    In Progress
                  </span>

                )}

              </div>


              <p
                className="
                  mt-1
                  text-[11px]
                  font-medium
                  leading-5
                  text-[#64748B]
                "
              >
                {step.description}
              </p>

            </div>

          </div>
        );
      })}

    </div>
  );
};


// ============================================================
// SUMMARY ITEM
// ============================================================

const SummaryItem = ({
  icon: Icon,
  label,
  value,
  success = false,
}) => {
  return (
    <div className="mb-4 flex items-start gap-3">

      <div
        className="
          flex
          h-9
          w-9
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-[#EEEEFF]
          text-[#4338CA]
        "
      >
        <Icon size={16} />
      </div>


      <div className="min-w-0">

        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.08em]
            text-[#64748B]
          "
        >
          {label}
        </p>

        <p
          className={`
            mt-1
            break-words
            text-[13px]
            font-bold
            ${
              success
                ? "text-[#087A58]"
                : "text-[#172033]"
            }
          `}
        >
          {value || "N/A"}
        </p>

      </div>

    </div>
  );
};


// ============================================================
// INFO SECTION
// ============================================================

const InfoSection = ({
  icon: Icon,
  title,
  description,
  children,
}) => {
  return (
    <section
      className="
        rounded-[20px]
        border
        border-[#E0E3EA]
        bg-white
        p-5
        sm:p-6
        lg:p-7
      "
      style={{
        animation: "fadeUp 0.5s ease-out both",
      }}
    >

      <div
        className="
          mb-6
          flex
          items-start
          gap-3
        "
      >

        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[#EEEEFF]
            text-[#4338CA]
          "
        >
          <Icon size={19} />
        </div>


        <div>

          <h2
            className="
              text-[17px]
              font-bold
              leading-6
              tracking-[-0.02em]
              text-[#172033]
            "
          >
            {title}
          </h2>


          {description && (

            <p
              className="
                mt-1
                text-[12px]
                font-medium
                leading-5
                text-[#64748B]
                sm:text-[13px]
              "
            >
              {description}
            </p>

          )}

        </div>

      </div>


      {children}

    </section>
  );
};


// ============================================================
// INFO BOX
// ============================================================

const InfoBox = ({
  label,
  value,
  icon: Icon,
  mono = false,
}) => {
  return (
    <div
      className="
        rounded-xl
        border
        border-[#E2E4EC]
        bg-[#FAFAFD]
        p-4
        transition-all
        duration-200
        hover:border-[#D4D1F4]
        hover:bg-[#F8F7FF]
      "
    >

      <div
        className="
          flex
          items-center
          gap-2
        "
      >

        {Icon && (
          <Icon
            size={14}
            className="text-[#64748B]"
          />
        )}

        <p
          className="
            text-[10px]
            font-bold
            uppercase
            tracking-[0.08em]
            text-[#64748B]
          "
        >
          {label}
        </p>

      </div>


      <p
        className={`
          mt-1.5
          break-words
          text-[13px]
          font-bold
          leading-5
          text-[#172033]
          ${
            mono
              ? "font-mono text-[12px]"
              : ""
          }
        `}
      >
        {value || "N/A"}
      </p>

    </div>
  );
};


export default SaaSUserApplicationStatus;