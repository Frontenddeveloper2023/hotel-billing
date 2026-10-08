import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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


const formatRejectionReason = (reason) => {
  if (!reason) return "";
  const reasonMap = {
    payment_reversed: "Payment Reversed",
    payment_pending: "Payment Pending / Incomplete",
    duplicate_registration: "Duplicate Hotel Registration",
    other: "Other Verification Issue",
  };
  return reasonMap[reason] || formatStatus(reason);
};


const formatAddress = (addr) => {
  if (!addr) {
    return "Not Provided";
  }

  if (typeof addr === "string") {
    return addr.trim() || "Not Provided";
  }

  const parts = [
    addr.street,
    addr.city,
    addr.state,
    addr.pincode,
    addr.country,
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Not Provided";
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
  const navigate = useNavigate();
  const location = useLocation();
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
    <div
      className="
        min-h-screen
        bg-[linear-gradient(180deg,#10233E_0px,#183A60_300px,#EAF3FF_520px,#F5F8FC_100%)]
        text-[#172033]
      "
    >

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

      <div
        className="
          sticky
          top-0
          z-50
          w-full
          border-b
          border-[#DDE5F0]
          bg-white
          shadow-[0_1px_5px_rgba(16,24,40,0.06)]
        "
      >
        <div className="mx-auto w-full max-w-[1180px]">
          <SaaSSetupProgress activeStep={5} />
        </div>
      </div>


      {/* ======================================================
          MAIN
      ======================================================= */}

      <main
        className="
          relative
          mx-auto
          w-full
          max-w-[1440px]
          px-4
          pb-12
          pt-7
          sm:px-6
          sm:pb-16
          sm:pt-9
          lg:px-8
          xl:px-10
        "
      >

        {/* ====================================================
            BLOCKED LOGIN REDIRECT BANNER
            Shown when user tried to manually bypass /hotel-login
        ==================================================== */}
        {location.state?.blockedMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 sm:px-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertCircle size={19} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-red-800">
                Access Restricted — Hotel Login Unavailable
              </p>
              <p className="mt-1 text-[13px] leading-5 text-red-700">
                {location.state.blockedMessage}
              </p>
            </div>
          </div>
        )}

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

          


            {/* TITLE */}

            <h1
              className="
                mt-4
                max-w-3xl
                text-[20px]
                font-extrabold
                leading-[1.08]
                tracking-[-0.045em]
                text-white
                sm:text-[30px]
                lg:text-[34px]
              "
            >
              Application Status
            </h1>


            {/* DESCRIPTION */}

            <p
              className="
                mt-3
                max-w-2xl
                text-[14px]
                font-medium
                leading-6
                text-[#D5E5F8]
                sm:text-[15px]
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
              w-full
              items-center
              gap-3
              rounded-2xl
              border
              border-white/15
              bg-white/10
              px-4
              py-3.5
              backdrop-blur-md
              sm:w-fit
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
                bg-white/15
                text-[#BFE0FF]
              "
            >
              <ShieldCheck size={19} />
            </div>


            <div>

              <p
                className="
                  text-[12px]
                  font-bold
                  leading-4
                  text-white
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
                  text-[#C9D9ED]
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
            overflow-hidden
            rounded-[22px]
            border
            border-[#DCE7F5]
            bg-white
            p-5
            shadow-[0_16px_40px_rgba(14,42,81,0.08)]
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
                    bg-[#EAF3FF]
                    text-[#347BE9]
                    ring-1
                    ring-[#CFE2FF]
                  "
                >
                  <Search size={18} />
                </div>

                <div>

                  <h2
                    className="
                      text-[18px]
                      font-bold
                      leading-6
                      tracking-[-0.015em]
                      text-[#17345D]
                      sm:text-[19px]
                    "
                  >
                    Find Your Application
                  </h2>

                  <p
                    className="
                      mt-1
                      text-[13px]
                      font-medium
                      leading-5
                      text-[#667085]
                    "
                  >
                    Enter the application ID to check your application status.
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
                    border-[#CBD9EA]
                    bg-white
                    py-3.5
                    pl-11
                    pr-4
                    text-[14px]
                    font-semibold
                    text-[#17345D]
                    outline-none
                    transition-all
                    duration-200
                    placeholder:text-[#98A6B8]
                    focus:border-[#347BE9]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#347BE9]/10
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
                  min-h-[50px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#347BE9]
                  px-5
                  py-3.5
                  text-[14px]
                  font-bold
                  text-white
                  shadow-[0_5px_14px_rgba(52,123,233,0.22)]
                  transition-all
                  duration-200
                  hover:bg-[#2467D5]
                  hover:shadow-[0_7px_18px_rgba(52,123,233,0.28)]
                  active:scale-[0.98]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:w-auto
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
              rounded-2xl
              border
              border-[#F2C7C7]
              bg-white
              p-4
              shadow-[0_10px_25px_rgba(127,29,29,0.06)]
              sm:p-5
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
              overflow-hidden
              rounded-[22px]
              border
              border-[#DCE7F5]
              bg-white
              p-8
              shadow-[0_16px_40px_rgba(14,42,81,0.08)]
              sm:p-10
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
                  bg-[#EAF3FF]
                  text-[#347BE9]
                  ring-8
                  ring-[#F4F8FF]
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
          <div className="mx-auto max-w-[960px] space-y-6">

            {/* ==================================================
                MAIN PUBLIC VERIFICATION CARD
            ================================================== */}
          <section
  className="
    w-full
    min-w-0
    overflow-hidden
    rounded-[18px]
    border
    border-[#DCE7F5]
    bg-white
    shadow-[0_14px_36px_rgba(14,42,81,0.06)]
    sm:rounded-[20px]
    lg:rounded-[24px]
  "
  style={{
    animation: "fadeUp 0.5s ease-out both",
  }}
>
  {/* CARD TOP HEADER: HOTEL & APPLICATION ID */}
  <div
    className="
      w-full
      border-b
      border-[#E2EAF5]
      bg-[linear-gradient(145deg,#F7FBFF_0%,#EDF5FF_100%)]
      p-3.5
      sm:p-5
      md:p-6
    "
  >
    <div
      className="
        flex
        w-full
        min-w-0
        flex-col
        gap-4
        sm:gap-5
        lg:flex-row
        lg:items-center
        lg:justify-between
      "
    >
      {/* HOTEL IDENTITY */}
      <div
        className="
          flex
          w-full
          min-w-0
          items-start
          gap-2.5
          sm:items-center
          sm:gap-3.5
          lg:flex-1
        "
      >
        {/* HOTEL ICON */}
        <div
          className="
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-[#173B63]
            text-white
            shadow-[0_6px_16px_rgba(23,59,99,0.18)]
            sm:h-12
            sm:w-12
            sm:rounded-2xl
            md:h-14
            md:w-14
          "
        >
          <Building2
            size={19}
            strokeWidth={1.8}
            className="sm:h-[22px] sm:w-[22px] md:h-6 md:w-6"
          />
        </div>

        {/* HOTEL DETAILS */}
        <div className="min-w-0 flex-1">
          {/* VERIFIED */}
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="
                inline-flex
                max-w-full
                items-center
                rounded-full
                bg-[#E2F6EC]
                px-2
                py-0.5
                text-[8px]
                font-bold
                leading-4
                text-[#087A58]
                sm:text-[9px]
              "
            >
              Verified
            </span>
          </div>

          {/* HOTEL NAME */}
          <h2
            className="
              mt-1
              break-words
              text-[17px]
              font-extrabold
              leading-[1.25]
              tracking-tight
              text-[#17345D]
              sm:text-[20px]
              md:text-[22px]
            "
          >
            {application.hotelName || "Hotel Application"}
          </h2>

          {/* ADDRESS */}
          <div
            className="
              mt-1
              flex
              min-w-0
              items-start
              gap-1.5
              text-[10px]
              font-medium
              leading-4
              text-[#64748B]
              sm:text-[12px]
            "
          >
            <MapPin
              size={12}
              className="
                mt-0.5
                shrink-0
                text-[#347BE9]
                sm:h-[13px]
                sm:w-[13px]
              "
            />

            <span className="min-w-0 break-words">
              {formatAddress(application.address)}
            </span>
          </div>
        </div>
      </div>

      {/* APPLICATION ID & COPY */}
      <div
        className="
          flex
          w-full
          min-w-0
          items-center
          justify-between
          gap-2.5
          rounded-xl
          border
          border-[#D5E5F7]
          bg-white/95
          px-3
          py-2.5
          backdrop-blur-sm
          sm:gap-3
          sm:px-3.5
          sm:py-3
          lg:w-auto
          lg:min-w-[250px]
          lg:shrink-0
          lg:justify-start
        "
      >
        {/* APPLICATION ID TEXT */}
        <div className="min-w-0 flex-1">
          <p
            className="
              text-[8px]
              font-bold
              uppercase
              tracking-[0.08em]
              text-[#64748B]
              sm:text-[9px]
            "
          >
            Application ID
          </p>

          <p
            className="
              mt-0.5
              min-w-0
              truncate
              font-mono
              text-[11px]
              font-bold
              text-[#347BE9]
              sm:text-[13px]
            "
            title={
              application.registrationId ||
              application._id ||
              registrationId
            }
          >
            {application.registrationId ||
              application._id ||
              registrationId}
          </p>
        </div>

        {/* COPY BUTTON */}
        <button
          type="button"
          onClick={copyApplicationId}
          className="
            inline-flex
            h-9
            shrink-0
            items-center
            justify-center
            gap-1.5
            rounded-lg
            border
            border-[#C9D8EB]
            bg-[#F7FAFF]
            px-3
            text-[10px]
            font-bold
            text-[#344054]
            transition-all
            duration-200
            hover:border-[#347BE9]
            hover:bg-[#EAF3FF]
            hover:text-[#347BE9]
            active:scale-[0.97]
            sm:h-10
            sm:px-3.5
            sm:text-[11px]
          "
        >
          {copied ? (
            <>
              <Check
                size={12}
                className="shrink-0 text-[#087A58]"
              />
              <span className="text-[#087A58]">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} className="shrink-0 sm:h-[13px] sm:w-[13px]" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  </div>

  {/* PROGRESS STATUS BAR & JOURNEY */}
  <div
    className="
      w-full
      min-w-0
      p-3.5
      sm:p-5
      md:p-6
    "
  >
    {/* TIMELINE */}
    <div className="w-full min-w-0 overflow-hidden">
      <ApplicationTimeline status={application.status} />
    </div>

    {/* ALERT NOTICES */}

    {/* APPROVED */}
    {application.status === "approved" && (
      <div
        className="
          mt-4
          flex
          w-full
          min-w-0
          items-start
          gap-2.5
          rounded-xl
          border
          border-[#CBEFDE]
          bg-[#F0FBF6]
          p-3
          sm:mt-5
          sm:gap-3
          sm:p-3.5
        "
      >
        <ShieldCheck
          size={17}
          className="
            mt-0.5
            shrink-0
            text-[#087A58]
            sm:h-[18px]
            sm:w-[18px]
          "
        />

        <div className="min-w-0 flex-1">
          <p
            className="
              break-words
              text-[11px]
              font-bold
              leading-4
              text-[#075E46]
              sm:text-[12px]
            "
          >
            Registration Approved & Confirmed
          </p>

          <p
            className="
              mt-0.5
              break-words
              text-[10px]
              font-medium
              leading-4
              text-[#087A58]
              sm:text-[11px]
            "
          >
            The administration has verified and approved this hotel
            registration application.
          </p>
        </div>
      </div>
    )}

    {/* PENDING */}
    {application.status === "pending" && (
      <div
        className="
          mt-4
          flex
          w-full
          min-w-0
          items-start
          gap-2.5
          rounded-xl
          border
          border-[#F0DEAE]
          bg-[#FFFBF1]
          p-3
          sm:mt-5
          sm:gap-3
          sm:p-3.5
        "
      >
        <Clock3
          size={17}
          className="
            mt-0.5
            shrink-0
            text-[#B77900]
            sm:h-[18px]
            sm:w-[18px]
          "
        />

        <div className="min-w-0 flex-1">
          <p
            className="
              break-words
              text-[11px]
              font-bold
              leading-4
              text-[#7C5700]
              sm:text-[12px]
            "
          >
            Admin Review Underway
          </p>

          <p
            className="
              mt-0.5
              break-words
              text-[10px]
              font-medium
              leading-4
              text-[#946F13]
              sm:text-[11px]
            "
          >
            Your registration has been submitted and is actively being
            reviewed by platform administrators.
          </p>
        </div>
      </div>
    )}

    {/* REJECTED */}
    {application.status === "rejected" && (
      <div className="mt-4 w-full min-w-0 overflow-hidden rounded-2xl border border-red-200 bg-red-50 sm:mt-5">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-red-200 bg-red-100/60 px-4 py-3 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-200 text-red-700">
            <XCircle size={19} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-extrabold text-red-800 sm:text-sm">
              Application Not Approved
            </p>
            <p className="text-[11px] text-red-600 sm:text-xs">
              Your hotel registration was reviewed and could not be accepted at this time.
            </p>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">

          {/* Reason & Additional Details block */}
          <div className="space-y-2.5 rounded-xl border border-red-200 bg-white px-4 py-3.5 shadow-sm">
            {application.rejectionReason && (
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-red-400 sm:text-[11px]">
                  Reason from Admin
                </p>
                <p className="break-words text-[13px] font-bold leading-5 text-red-900 sm:text-sm">
                  {formatRejectionReason(application.rejectionReason)}
                </p>
              </div>
            )}

            {application.rejectionDetails ? (
              <div className="rounded-lg border border-red-100 bg-red-50/70 p-3">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-red-500 sm:text-[11px]">
                  Additional Details & Explanation
                </p>
                <p className="break-words text-[13px] font-medium leading-relaxed text-red-800 whitespace-pre-wrap sm:text-sm">
                  {application.rejectionDetails}
                </p>
              </div>
            ) : !application.rejectionReason && (
              <p className="break-words text-[13px] font-medium leading-5 text-red-700 sm:text-sm">
                No specific reason was provided. Please contact our support team for details.
              </p>
            )}
          </div>

          {/* What to do next */}
          <div className="rounded-xl border border-red-100 bg-white px-4 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-red-400 sm:text-[11px]">
              What can you do next?
            </p>
            <ul className="space-y-1.5">
              {[
                "Review the reason above carefully and make any necessary corrections.",
                "You may re-register with updated or corrected information.",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[9px] font-bold text-red-600">
                    {i + 1}
                  </span>
                  <span className="text-[12px] leading-4 text-red-700 sm:text-[13px]">{step}</span>
                </li>
              ))}
            </ul>
          </div>

        

        </div>
      </div>
    )}
  </div>
</section>

            {/* ==================================================
                IMPORTANT SHORT DETAILS (PUBLIC & MINIMAL)
            ================================================== */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              {/* CARD 1: HOTEL REGISTRATION INFO */}
              <div
                className="
                  rounded-2xl
                  border
                  border-[#DCE7F5]
                  bg-white
                  p-5
                  shadow-[0_8px_20px_rgba(14,42,81,0.04)]
                "
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#347BE9]">
                    <Building2 size={16} />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#172033]">
                    Hotel Summary
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[12px] pb-2 border-b border-[#EDF2F7]">
                    <span className="text-[#64748B] font-medium">Hotel Entity</span>
                    <span className="font-bold text-[#17345D] text-right truncate max-w-[200px]">
                      {application.hotelName || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[12px] pb-2 border-b border-[#EDF2F7]">
                    <span className="text-[#64748B] font-medium">Location</span>
                    <span className="font-bold text-[#17345D] text-right truncate max-w-[200px]">
                      {application.address?.city || application.address?.state
                        ? `${application.address?.city || ""}${
                            application.address?.city && application.address?.state
                              ? ", "
                              : ""
                          }${application.address?.state || ""}`
                        : "India"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-[#64748B] font-medium">Status</span>
                    <span
                      className={`
                        font-bold
                        ${
                          application.status === "approved"
                            ? "text-[#087A58]"
                            : application.status === "rejected"
                            ? "text-[#C62828]"
                            : "text-[#B77900]"
                        }
                      `}
                    >
                      {application.status === "approved"
                        ? "Approved & Active"
                        : application.status === "rejected"
                        ? "Rejected"
                        : "Pending Verification"}
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD 2: SUBSCRIPTION & TIMELINE */}
              <div
                className="
                  rounded-2xl
                  border
                  border-[#DCE7F5]
                  bg-white
                  p-5
                  shadow-[0_8px_20px_rgba(14,42,81,0.04)]
                "
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#347BE9]">
                    <CreditCard size={16} />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#172033]">
                    Plan & Timeline
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-[12px] pb-2 border-b border-[#EDF2F7]">
                    <span className="text-[#64748B] font-medium">Selected Tier</span>
                    <span className="font-bold text-[#17345D]">
                      {application.planName || application.planId?.planName || "Standard Plan"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[12px] pb-2 border-b border-[#EDF2F7]">
                    <span className="text-[#64748B] font-medium">Billing Cycle</span>
                    <span className="font-bold text-[#17345D]">
                      {formatStatus(application.billingCycle)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-[#64748B] font-medium">
                      {application.status === "approved" ? "Approved Date" : "Submission Date"}
                    </span>
                    <span className="font-bold text-[#17345D]">
                      {application.approvedAt
                        ? formatDate(application.approvedAt)
                        : formatDate(application.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

            </div>



          </div>
        )}




        <div className="mt-6 flex justify-center">
  <button
    type="button"
    disabled={application?.status !== "approved"}
    onClick={() => {
      if (application?.status === "approved") {
        navigate("/hotel-login");
      }
    }}
    className={`
      inline-flex items-center justify-center gap-2
      rounded-xl px-6 py-3
      text-sm font-bold
      transition-all duration-200
      ${
        application?.status === "approved"
          ? "bg-[#17345D] text-white shadow-[0_8px_20px_rgba(23,52,93,0.20)] hover:bg-[#0F2A4A] hover:-translate-y-0.5"
          : "cursor-not-allowed bg-[#E5E7EB] text-[#9CA3AF]"
      }
    `}
  >
    <Building2 size={17} />

    {application?.status === "approved"
      ? "Login to Hotel"
      : application?.status === "rejected"
      ? "Login Unavailable"
      : "Login After Approval"}

    {application?.status === "approved" && (
      <ArrowRight size={16} />
    )}
  </button>
</div>

        {/* ====================================================
            EMPTY STATE
        ==================================================== */}

        {!loading &&
          !application &&
          !error &&
          !searched && (

            <div
              className="
                overflow-hidden
                rounded-[22px]
                border
                border-[#DCE7F5]
                bg-white
                p-8
                shadow-[0_16px_40px_rgba(14,42,81,0.07)]
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
                  bg-[#EAF3FF]
                  text-[#347BE9]
                  ring-8
                  ring-[#F5F9FF]
                "
              >
                <Search size={27} />
              </div>


              <h2
                className="
                  mt-5
                  text-[21px]
                  font-bold
                  tracking-[-0.025em]
                  text-[#17345D]
                  sm:text-[22px]
                "
              >
                Check Your Application
              </h2>


              <p
                className="
                  mx-auto
                  mt-2
                  max-w-md
                  text-[14px]
                  font-medium
                  leading-6
                  text-[#667085]
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
// APPLICATION TIMELINE (DYNAMIC COLOR CHANGING PROGRESS BAR)
// ============================================================

const getProgressTheme = (status) => {
  switch (status) {
    case "approved":
      return {
        percentage: 100,
        label: "Admin Approved",
        sublabel: "Hotel registration approved by administrator",
        icon: CheckCircle2,
        barGradient: "bg-gradient-to-r from-[#10B981] to-[#059669]",
        barGlow: "shadow-[0_0_12px_rgba(16,185,129,0.35)]",
        badgeBg: "bg-[#EAF8F1]",
        badgeText: "text-[#087A58]",
        badgeBorder: "border-[#BFE4D2]",
        trackBg: "bg-[#E2F6EC]",
      };
    case "rejected":
      return {
        percentage: 100,
        label: "Application Rejected",
        sublabel: "Registration was not approved by administration",
        icon: XCircle,
        barGradient: "bg-gradient-to-r from-[#EF4444] to-[#DC2626]",
        barGlow: "shadow-[0_0_12px_rgba(239,68,68,0.35)]",
        badgeBg: "bg-[#FFF3F3]",
        badgeText: "text-[#C62828]",
        badgeBorder: "border-[#F3CCCC]",
        trackBg: "bg-[#FDECEC]",
      };
    case "pending":
    default:
      return {
        percentage: 50,
        label: "Admin Review In Progress",
        sublabel: "Awaiting administrator verification",
        icon: Clock3,
        barGradient: "bg-gradient-to-r from-[#347BE9] to-[#F59E0B]",
        barGlow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
        badgeBg: "bg-[#FFF9E9]",
        badgeText: "text-[#946F13]",
        badgeBorder: "border-[#F0DEAE]",
        trackBg: "bg-[#FEF3C7]",
      };
  }
};

const ApplicationTimeline = ({ status }) => {
  const theme = getProgressTheme(status);
  const StatusIcon = theme.icon;

  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isPending = status === "pending";

  const steps = [
    {
      title: "Application Submitted",
      desc: "Details received",
      complete: true,
      active: false,
      rejected: false,
      color: "text-[#087A58] border-[#BFE4D2] bg-[#EAF8F1]",
    },
    {
      title: "Admin Review",
      desc: isPending
        ? "Review underway"
        : isRejected
        ? "Review completed"
        : "Review completed",
      complete: isApproved || isRejected,
      active: isPending,
      rejected: false,
      color: isApproved
        ? "text-[#087A58] border-[#BFE4D2] bg-[#EAF8F1]"
        : isRejected
        ? "text-[#C62828] border-[#F3CCCC] bg-[#FFF3F3]"
        : "text-[#347BE9] border-[#BFD7F5] bg-[#EAF3FF] ring-2 ring-[#DCEBFF]",
    },
    {
      title: isApproved
        ? "Admin Approved Your Hotel"
        : isRejected
        ? "Application Rejected"
        : "Admin Approval",
      desc: isApproved
        ? "Hotel verified"
        : isRejected
        ? "Not approved"
        : "Pending decision",
      complete: isApproved,
      active: false,
      rejected: isRejected,
      color: isApproved
        ? "text-[#087A58] border-[#BFE4D2] bg-[#EAF8F1]"
        : isRejected
        ? "text-[#C62828] border-[#F3CCCC] bg-[#FFF3F3]"
        : "text-[#94A3B8] border-slate-200 bg-slate-50",
    },
  ];

  return (
    <div className="w-full">

      {/* TOP STATUS HEADER WITH BADGE & DYNAMIC PERCENTAGE */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`
              inline-flex
              items-center
              gap-1.5
              rounded-full
              border
              px-3
              py-1
              text-[11px]
              font-bold
              ${theme.badgeBg}
              ${theme.badgeText}
              ${theme.badgeBorder}
            `}
          >
            <StatusIcon size={14} className={isPending ? "animate-pulse" : ""} />
            {theme.label}
          </span>
          <span className="hidden sm:inline text-[12px] font-medium text-[#64748B]">
            • {theme.sublabel}
          </span>
        </div>

        <span className={`text-[13px] font-extrabold ${theme.badgeText}`}>
          {theme.percentage}% Completed
        </span>
      </div>

      {/* DYNAMIC PROGRESS BAR (COLOR CHANGES BASED ON PROGRESS & APPROVAL) */}
      <div
        className={`
          h-3
          w-full
          rounded-full
          ${theme.trackBg}
          p-0.5
          overflow-hidden
        `}
      >
        <div
          className={`
            h-full
            rounded-full
            transition-all
            duration-700
            ease-out
            ${theme.barGradient}
            ${theme.barGlow}
          `}
          style={{ width: `${theme.percentage}%` }}
        />
      </div>

      {/* 3 CLEAN STEP CHECKPOINTS */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {steps.map((st, i) => (
          <div key={st.title} className="flex flex-col items-center text-center">
            <div
              className={`
                flex
                h-8
                w-8
                items-center
                justify-center
                rounded-full
                border
                text-[11px]
                font-bold
                ${st.color}
              `}
            >
              {st.complete ? (
                <CheckCircle2 size={15} />
              ) : st.rejected ? (
                <XCircle size={15} />
              ) : st.active ? (
                <Clock3 size={15} className="animate-spin" />
              ) : (
                `0${i + 1}`
              )}
            </div>

            <p className="mt-2 text-[12px] font-bold text-[#17345D] leading-tight">
              {st.title}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-[#64748B]">
              {st.desc}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
};

export default SaaSUserApplicationStatus;
