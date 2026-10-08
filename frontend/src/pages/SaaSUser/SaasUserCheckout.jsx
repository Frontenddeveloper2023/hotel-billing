import React, { useMemo, useState } from "react";
import SaaSSetupProgress from "./SaaSSetupProgress";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  CreditCard,
  Hotel,
  Info,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Utensils,
  X,
  XCircle
  
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { confirmDummyPayment } from "../../service/hotelRegistrationApi";

// ============================================================
// DESIGN: dark hotel-inspired hero, blue featured plan, white cards
// Functional payment, registration and upgrade logic is unchanged.
// ============================================================

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value) => {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const getBillingLabel = (cycle) => {
  const labels = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    halfYearly: "Half Yearly",
    yearly: "Yearly",
    custom: "Custom",
  };

  return labels[cycle] || "Subscription";
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const SaaSUserCheckout = () => {
  const location = useLocation();
  const navigate = useNavigate();


  // ==========================================================
  // PAYMENT STATE
  // ==========================================================

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState("");
  // Only mark as already-paid when the *current* registration is the one
  // that was previously paid.  A brand-new hotel must always be payable.
  const [alreadyPaid, setAlreadyPaid] = useState(() => {
    if (sessionStorage.getItem("saasPaymentStatus") !== "paid") return false;
    const paidRegId = sessionStorage.getItem("saasRegistrationId") || "";
    const currentRegId =
      location.state?.registration?.registrationId ||
      location.state?.registration?._id ||
      location.state?.registrationId ||
      "";
    // If we can determine the current registration and it differs from the
    // paid one, this is a new hotel — allow payment.
    if (currentRegId && paidRegId && currentRegId !== paidRegId) return false;
    // If current ID is unknown at mount (will be resolved from sessionStorage
    // fallback later) but paidRegId exists, stay safe and still mark paid.
    return true;
  });

  // ==========================================================
  // ROUTER DATA
  // ==========================================================

  const selectedPlanFromState = location.state?.selectedPlan || null;
  const billingCycleFromState = location.state?.billingCycle || null;
  const registrationFromState = location.state?.registration || null;

  // ==========================================================
  // SESSION STORAGE FALLBACK
  // ==========================================================

  const storedPlan = useMemo(() => {
    try {
      const data = sessionStorage.getItem("saasSelectedPlan");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  const storedBillingCycle = useMemo(() => {
    return sessionStorage.getItem("saasBillingCycle") || "";
  }, []);

  const storedRegistration = useMemo(() => {
    try {
      const data = sessionStorage.getItem("saasRegistration");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  const storedHotelDetails = useMemo(() => {
    try {
      const data = sessionStorage.getItem("saasHotelDetails");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);



  // ==========================================================
  // FINAL DATA
  // ==========================================================

  const selectedPlan = selectedPlanFromState || storedPlan;
  const billingCycle = billingCycleFromState || storedBillingCycle;
  const registration = registrationFromState || storedRegistration || null;

  const hotelDetails =
    location.state?.hotelDetails || storedHotelDetails || registration || null;

  // ==========================================================
  // REGISTRATION ID
  // ==========================================================

  const registrationId =
    registration?.registrationId ||
    registration?._id ||
    location.state?.registrationId ||
    sessionStorage.getItem("saasRegistrationId");

  // ==========================================================
  // PRICE CALCULATION
  // ==========================================================

  const price = useMemo(() => {
    if (!selectedPlan) return 0;
    const pricing = selectedPlan.pricing || {};
    return Number(pricing[billingCycle] || 0);
  }, [selectedPlan, billingCycle]);

  const setupFee = Number(selectedPlan?.setupFee || 0);
  const subtotal = price + setupFee;

  /*
   * Keep the current project behaviour.
   * Your backend currently handles the actual payment state.
   */
  const tax = 0;
  const total = subtotal + tax;

  // ==========================================================
  // HOTEL DATA
  // ==========================================================

const hotelName =
  hotelDetails?.hotelName ||
  registration?.hotelName ||
  "Hotel Account";

const ownerName =
  hotelDetails?.ownerName ||
  registration?.ownerName ||
  "Hotel Owner";

const ownerEmail =
  hotelDetails?.email ||
  registration?.email ||
  "";

const ownerPhone =
  hotelDetails?.phone ||
  registration?.phone ||
  "";
  const address = hotelDetails?.address || registration?.address || {};

const addressText =
  [address.street, address.city, address.state, address.country, address.pincode]
    .filter(Boolean)
    .join(", ") || "";


  // ==========================================================
  // PAYMENT HANDLERS
  // ==========================================================

const handlePayNow = () => {
  setError("");

  // ── Duplicate-payment guard ────────────────────────────────────────────
  // Only block if the *same* registration was already paid
  const paidRegId = sessionStorage.getItem("saasRegistrationId") || "";
  if (
    sessionStorage.getItem("saasPaymentStatus") === "paid" &&
    paidRegId &&
    registrationId &&
    paidRegId === registrationId
  ) {
    setAlreadyPaid(true);
    setError(
      "Your hotel registration payment has already been completed. Please wait for admin approval — no further payment is required."
    );
    return;
  }

  // Check if registration data itself says paid
  if (registration?.paymentStatus === "paid") {
    setAlreadyPaid(true);
    sessionStorage.setItem("saasPaymentStatus", "paid");
    sessionStorage.setItem("saasRegistrationId", registrationId);
    setError(
      "Your hotel registration payment has already been completed. Please wait for admin approval — no further payment is required."
    );
    return;
  }
  // ──────────────────────────────────────────────────────────────────────

  if (!registrationId) {
    setError(
      "Registration details are missing. Please go back and complete registration again."
    );
    return;
  }

  if (!selectedPlan) {
    setError("Plan details are missing. Please select a plan again.");
    return;
  }

  setIsPaymentModalOpen(true);
};

 const handleConfirmPayment = async () => {
  try {
    setIsPaying(true);
    setError("");

    if (!registrationId) {
      setError("Registration ID is missing. Please try again.");
      return;
    }

    const response = await confirmDummyPayment(registrationId);

    if (!response?.success) {
      // ── Professional duplicate-payment error ────────────────────────
      const msg = response?.message || "";
      const isDuplicate =
        msg.toLowerCase().includes("already been completed") ||
        msg.toLowerCase().includes("already paid") ||
        msg.toLowerCase().includes("duplicate");

      if (isDuplicate) {
        setAlreadyPaid(true);
        sessionStorage.setItem("saasPaymentStatus", "paid");
        setIsPaymentModalOpen(false);
        setError(
          "Your hotel is already registered and the subscription payment has been successfully received. Our admin team is reviewing your application — you will be notified once approved."
        );
        return;
      }
      // ───────────────────────────────────────────────────────────────

      throw new Error(msg || "Payment could not be completed.");
    }

    const paymentTransactionId =
      response?.data?.paymentTransactionId || "";

    setTransactionId(paymentTransactionId);
    setPaymentSuccess(true);
    setIsPaymentModalOpen(false);

    sessionStorage.setItem(
      "saasRegistrationId",
      registrationId
    );

    sessionStorage.setItem(
      "saasPaymentStatus",
      "paid"
    );
  } catch (error) {
    setError(
      error?.message ||
        error?.data?.message ||
        "Unable to complete payment."
    );
  } finally {
    setIsPaying(false);
  }
};

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleViewApplicationStatus = () => {
    navigate("/saas-user/application-status", { state: { registrationId } });
  };

  const handleGoToHotelManagement = () => {
    navigate("/hotel-management");
  };

  const handleGoToRoomAvailability = () => {
    navigate("/hotel-management/room-availability");
  };

  // ==========================================================
  // NO PLAN
  // ==========================================================

  if (!selectedPlan) {
    return (
        
        <div className="min-h-screen bg-[linear-gradient(to_right,#FFFFFF_0%,#FFFFFF_50%,#FFF1E3_100%)] pb-28 font-sans text-[#161311] antialiased sm:pb-24">



        <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-xl items-center px-4 py-10">
          <div className="w-full rounded-2xl border border-[#E2EAF5] bg-white p-7 text-center shadow-[0_1px_3px_rgba(16,24,40,0.06)] sm:p-9">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF3FF] text-[#3479E8]">
              <ReceiptText size={26} />
            </div>

            <h1 className="mt-5 text-[24px] font-bold tracking-[-0.02em] text-[#17345D]">
              No Plan Selected
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-[#5B6472]">
              Please select a subscription plan before continuing to checkout.
            </p>

            <button
              type="button"
              onClick={() => navigate("/hotel-billing-system/saas-user/choose-plan")}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-5 py-3.5 text-[13px] font-bold text-white transition hover:bg-[#2467D5]"
            >
              Choose Plan
              <ArrowRight size={16} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==========================================================
  // SUCCESS SCREEN
  // ==========================================================
// ==========================================================
// SUCCESS SCREEN
// ==========================================================

if (paymentSuccess) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#10233E_0px,#183A60_360px,#F4F7FC_540px,#F4F7FC_100%)]">

      {/* ====================================================
          TOP PROGRESS BAR
          ALWAYS AT THE VERY TOP
      ==================================================== */}
      <div className="sticky top-0 z-50 border-b border-[#DDE5F0] bg-white shadow-[0_1px_4px_rgba(16,24,40,0.05)]">
        <div className="mx-auto w-full max-w-[1180px]">
          <SaaSSetupProgress activeStep={4} />
        </div>
      </div>


      {/* ====================================================
          SUCCESS HERO
      ==================================================== */}
      <header className="relative overflow-hidden">

        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[320px] w-[700px] -translate-x-1/2 rounded-full bg-[#347BE9]/20 blur-[100px]" />
        </div>


        <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-7 sm:px-6 sm:py-9 lg:px-8">

          <div className="flex min-w-0 items-center gap-3">

            <div className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-white/10
              text-white
              ring-1
              ring-white/20
            ">
              <Hotel size={19} />
            </div>

            <div className="min-w-0">

              <p className="
                truncate
                text-[13px]
                font-bold
                text-white
                sm:text-[14px]
              ">
                Hotel Operations Platform
              </p>

              <p className="
                mt-0.5
                text-[11px]
                font-medium
                text-[#C9D9ED]
              ">
                SaaS onboarding
              </p>

            </div>

          </div>


          <div className="
            flex
            shrink-0
            items-center
            gap-2
            rounded-full
            border
            border-[#BFE4D2]
            bg-[#E7F6EF]
            px-3
            py-1.5
          ">

            <CheckCircle2
              size={14}
              className="text-[#0F7A5E]"
            />

            <span className="
              hidden
              text-[12px]
              font-semibold
              text-[#0F7A5E]
              sm:block
            ">
              Payment Completed
            </span>

          </div>

        </div>

      </header>


      {/* ====================================================
          SUCCESS CONTENT
      ==================================================== */}
      <main className="
        relative
        mx-auto
        w-full
        max-w-3xl
        px-4
        pb-12
        pt-4
        sm:px-6
        sm:pb-16
        sm:pt-6
      ">

        <div className="
          overflow-hidden
          rounded-[22px]
          border
          border-[#E2EAF5]
          bg-white
          shadow-[0_20px_50px_rgba(14,42,81,0.12)]
        ">

          {/* ==================================================
              SUCCESS BANNER
          ================================================== */}
          <div className="
            border-b
            border-[#E2EAF5]
            bg-[linear-gradient(145deg,#F8FBFF_0%,#EEF6FF_100%)]
            px-5
            py-8
            text-center
            sm:px-10
            sm:py-10
          ">

            <div className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-full
              bg-[#E7F6EF]
              text-[#0F7A5E]
              ring-8
              ring-[#F1FAF6]
            ">
              <CheckCircle2 size={36} />
            </div>


            <h1 className="
              mt-5
              text-[27px]
              font-extrabold
              leading-tight
              tracking-[-0.03em]
              text-[#17345D]
              sm:text-[31px]
            ">
            Payment Successful
            </h1>


            <p className="
              mx-auto
              mt-3
              max-w-[560px]
              text-[14px]
              font-medium
              leading-6
              text-[#5B6472]
            ">
              {
  "Your payment has been completed successfully. Your hotel application is now awaiting administrative approval."
}
            </p>

          </div>


          {/* ==================================================
              DETAILS
          ================================================== */}
          <div className="p-5 sm:p-8">

            <div className="
              rounded-xl
              border
              border-[#E2EAF5]
              bg-[#F8FAFF]
              p-4
              sm:p-5
            ">

              <SummaryRow
                label="Hotel"
                value={hotelName}
                icon={Building2}
              />

              <SummaryRow
                label="Selected Plan"
                value={selectedPlan.planName}
                icon={Sparkles}
              />

              <SummaryRow
                label="Billing Cycle"
                value={getBillingLabel(billingCycle)}
                icon={ReceiptText}
              />

              <SummaryRow
                label="Amount Paid"
                value={formatCurrency(total)}
                icon={CreditCard}
                strong
              />


              <div className="mt-3 border-t border-[#E2EAF5] pt-3">

                <p className="
                  text-[11px]
                  font-semibold
                  uppercase
                  tracking-[0.06em]
                  text-[#5B6472]
                ">
                  Transaction ID
                </p>

                <p className="
                  mt-1
                  break-all
                  text-[13px]
                  font-bold
                  text-[#3479E8]
                ">
                  {transactionId || "Generated successfully"}
                </p>

              </div>

            </div>


            {/* ==================================================
                EXISTING SUCCESS ACTIONS
            ================================================== */}

       <div className="
  mt-5
  flex
  items-start
  gap-3
  rounded-xl
  border
  border-[#F1D999]
  bg-[#FDF3DF]
  p-4
">
  <div className="
    flex
    h-8
    w-8
    shrink-0
    items-center
    justify-center
    rounded-full
    bg-white
    text-[#92620B]
  ">
    <Clock3 size={17} />
  </div>

  <div className="min-w-0">
    <p className="
      text-[13px]
      font-bold
      text-[#7A4E08]
    ">
      Application Pending
    </p>

    <p className="
      mt-1
      text-[12px]
      font-medium
      leading-5
      text-[#92620B]
    ">
      Payment is complete, but your hotel account will only
      be activated after SaaS admin approval.
    </p>
  </div>
</div>

<button
  type="button"
  onClick={handleViewApplicationStatus}
  className="
    mt-6
    flex
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
    shadow-[0_4px_12px_rgba(52,123,233,0.22)]
    transition
    hover:bg-[#2467D5]
    active:scale-[0.99]
  "
>
  View Application Status
  <ArrowRight size={17} />
</button>

          </div>

        </div>

      </main>

    </div>
  );
}

  // ==========================================================
  // MAIN CHECKOUT
  // ==========================================================

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#10233E_0px,#183A60_360px,#F4F7FC_540px,#F4F7FC_100%)] text-[#101828]">
      {/* ======================================================
          PROGRESS
      ====================================================== */}
      <div className="border-b border-[#E2EAF5] bg-white">
        <div className="mx-auto w-full max-w-[1180px]">
<SaaSSetupProgress activeStep={3} />    
    </div>
      </div>

      {/* ======================================================
          CENTERED MAIN CONTENT
      ====================================================== */}
      <main className="mx-auto w-full max-w-[1160px] px-4 pb-16 pt-5 sm:px-6 sm:pt-8 lg:px-8">

        {/* PAGE HEADER */}
        <div className="mx-auto mb-7 max-w-[850px] text-center">
         

          <h1 className="mt-4 text-[24px] font-bold tracking-[-0.035em] text-white sm:text-[28px]">
Review Subscription & Checkout          </h1>

        

         
        </div>

        {/* ERROR */}
        {error && (
          <div className="mx-auto mb-6 flex max-w-[1080px] items-start gap-3 rounded-xl border border-[#F3C6C1] bg-[#FEF0EF] px-4 py-3.5">
            <Info size={17} className="mt-0.5 shrink-0 text-[#B42318]" />
            <div>
              <p className="text-[14px] font-bold text-[#7A1B12]">Checkout Error</p>
              <p className="mt-0.5 text-[13px] font-medium leading-5 text-[#93261B]">{error}</p>
            </div>
          </div>
        )}

        {/* ====================================================
            TOP ROW — PLAN LEFT + HOTEL RIGHT
        ==================================================== */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2 lg:gap-6">

          {/* ==================================================
              LEFT — SELECTED SUBSCRIPTION PLAN
          ================================================== */}
    <section className="relative w-full overflow-hidden rounded-[22px] border border-[#6AA5FF] bg-[linear-gradient(145deg,#5597F5_0%,#347BE9_58%,#2868DA_100%)] shadow-[0_20px_45px_rgba(22,71,149,0.23)]">

  {/* ============================================================
      SUBTLE TOP-RIGHT BACKGROUND
  ============================================================ */}
  <div className="pointer-events-none absolute right-0 top-0 h-[140px] w-[180px] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24)_0%,transparent_72%)]" />


  {/* ============================================================
      CONTENT
  ============================================================ */}
  <div className="relative w-full p-4 sm:p-6 lg:p-7">


    {/* ==========================================================
        HEADER
    ========================================================== */}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">

      {/* TITLE */}
      <div className="min-w-0">

        <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#E2EEFF]">
          Subscription
        </p>

        <h2 className="mt-1 text-[20px] font-bold leading-6 tracking-[-0.01em] text-white sm:text-[22px]">
          Selected Plan
        </h2>

      </div>


      {/* PLAN BADGE */}
      <span className="w-fit shrink-0 rounded-full bg-white/20 px-3.5 py-2 text-[12px] font-bold text-white ring-1 ring-white/30 sm:self-center">
Most Popular      </span>

    </div>


    {/* ==========================================================
        PLAN INFORMATION
    ========================================================== */}
    <div className="mt-6 min-w-0">

      <p className="break-words text-[22px] font-bold leading-7 tracking-[-0.01em] text-white sm:text-[22px]">
        {selectedPlan.planName}
      </p>

      {selectedPlan.description && (
        <p className="mt-2 max-w-[520px] break-words text-[14px] font-medium leading-6 text-[#F0F6FF]">
          {selectedPlan.description}
        </p>
      )}

    </div>


    {/* ==========================================================
        PRICE
    ========================================================== */}
    <div className="mt-6 flex flex-wrap items-end gap-x-2 gap-y-1">

      <span className="break-words text-[33px] font-bold leading-none tracking-[-0.04em] text-white sm:text-[36px]">
        {formatCurrency(price)}
      </span>

      <span className="pb-0.5 text-[14px] font-medium text-[#F0F6FF]">
        /
        {" "}
        {billingCycle === "yearly"
          ? "year"
          : billingCycle === "monthly"
            ? "month"
            : "cycle"}
      </span>

    </div>


    {/* DIVIDER */}
    <div className="my-5 border-t border-white/30" />


    {/* ==========================================================
        INCLUDED TITLE
    ========================================================== */}
    <p className="break-words text-[14px] font-medium leading-5 text-[#F0F6FF]">
      {selectedPlan.planName} package included{" "}
      <span className="font-bold text-white">
        +
      </span>
    </p>


    {/* ==========================================================
        FEATURES
    ========================================================== */}
    <div className="mt-2 w-full">


      {/* ========================================================
          ROOMS
      ======================================================== */}
      <div className="flex min-h-[36px] w-full items-center gap-2.5 border-b border-white/20 py-2">

        <CheckCircle2
          size={16}
          strokeWidth={1.8}
          className="shrink-0 text-white"
        />

        <span className="min-w-0 break-words text-[14px] font-medium leading-5 text-white">
          {Number(selectedPlan?.limits?.rooms || 0) === 0
            ? "Unlimited rooms"
            : `Up to ${selectedPlan?.limits?.rooms} rooms`}
        </span>

      </div>


      {/* ========================================================
          BRANCHES
      ======================================================== */}
      <div className="flex min-h-[36px] w-full items-center gap-2.5 border-b border-white/20 py-2">

        <CheckCircle2
          size={16}
          strokeWidth={1.8}
          className="shrink-0 text-white"
        />

        <span className="min-w-0 break-words text-[14px] font-medium leading-5 text-white">
          {Number(selectedPlan?.limits?.branches || 0) === 0
            ? "Unlimited branches"
            : `Up to ${selectedPlan?.limits?.branches} branches`}
        </span>

      </div>


      {/* ========================================================
          RECEPTIONISTS
      ======================================================== */}
      <div className="flex min-h-[36px] w-full items-center gap-2.5 border-b border-white/20 py-2">

        <CheckCircle2
          size={16}
          strokeWidth={1.8}
          className="shrink-0 text-white"
        />

        <span className="min-w-0 break-words text-[14px] font-medium leading-5 text-white">
          {Number(selectedPlan?.limits?.receptionists || 0) === 0
            ? "Unlimited receptionists"
            : `Up to ${selectedPlan?.limits?.receptionists} receptionists`}
        </span>

      </div>


    {/* ========================================================
    FOOD SERVICE
======================================================== */}
<div className="flex min-h-[36px] w-full items-center gap-2.5 border-b border-white/20 py-2">

  {selectedPlan?.features?.foodService ? (
    <CheckCircle2
      size={16}
      strokeWidth={1.8}
      className="shrink-0 text-white"
    />
  ) : (
    <XCircle
      size={16}
      strokeWidth={1.8}
      className="shrink-0 text-[#B7D4FF]"
    />
  )}

  <span
    className={`min-w-0 break-words text-[14px] font-medium leading-5 ${
      selectedPlan?.features?.foodService
        ? "text-white"
        : "text-[#D5E6FF] line-through decoration-white/60"
    }`}
  >
    Food Service
  </span>

</div>


{/* ========================================================
    ROOM SERVICE
======================================================== */}
<div className="flex min-h-[36px] w-full items-center gap-2.5 border-b border-white/20 py-2">

  {selectedPlan?.features?.roomService ? (
    <CheckCircle2
      size={16}
      strokeWidth={1.8}
      className="shrink-0 text-white"
    />
  ) : (
    <XCircle
      size={16}
      strokeWidth={1.8}
      className="shrink-0 text-[#B7D4FF]"
    />
  )}

  <span
    className={`min-w-0 break-words text-[14px] font-medium leading-5 ${
      selectedPlan?.features?.roomService
        ? "text-white"
        : "text-[#D5E6FF] line-through decoration-white/60"
    }`}
  >
    Room Service
  </span>

</div>


      {/* ========================================================
          TRIAL
      ======================================================== */}
      {Number(selectedPlan?.trialDays || 0) > 0 && (
        <div className="flex min-h-[36px] w-full items-center gap-2.5 border-b border-white/20 py-2">

          <CheckCircle2
            size={16}
            strokeWidth={1.8}
            className="shrink-0 text-white"
          />

          <span className="min-w-0 break-words text-[14px] font-medium leading-5 text-white">
            {selectedPlan.trialDays} days free trial
          </span>

        </div>
      )}

    </div>


    {/* ==========================================================
        BILLING
    ========================================================== */}
    <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">

      <span className="text-[14px] font-semibold text-[#F0F6FF]">
        Billing
      </span>

      <span className="w-fit shrink-0 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 text-[13px] font-bold text-white">
        {getBillingLabel(billingCycle)}
      </span>

    </div>

  </div>

</section>


          {/* ==================================================
              RIGHT — HOTEL REGISTRATION
          ================================================== */}
          
          <section className="w-full overflow-hidden rounded-[22px] border border-[#E2EAF5] bg-white shadow-[0_16px_40px_rgba(14,42,81,0.09)]">

  {/* ============================================================
      HEADER
  ============================================================ */}
  <div className="flex flex-col gap-3 border-b border-[#E2EAF5] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-5">

    {/* HEADER TITLE */}
    <div className="flex min-w-0 items-center gap-3">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#3479E8]">
        <Hotel size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-[#5B6472]">
          Registration
        </p>

        <h2 className="mt-0.5 break-words text-[19px] font-bold leading-6 text-[#17345D]">
          Hotel Information
        </h2>
      </div>

    </div>


    {/* EDIT BUTTON */}
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="
        inline-flex
        min-h-[40px]
        w-full
        shrink-0
        cursor-pointer
        items-center
        justify-center
        gap-1.5
        rounded-lg
        px-3
        py-2
        text-[13px]
        font-semibold
        text-[#3479E8]
        transition
        hover:bg-[#EAF3FF]
        active:scale-[0.98]
        sm:min-h-[38px]
        sm:w-auto
        sm:px-3
      "
    >
      <ArrowLeft
        size={15}
        className="shrink-0"
      />

      <span>
        Edit
      </span>
    </button>

  </div>


  {/* ============================================================
      CONTENT
  ============================================================ */}
  <div className="w-full p-4 sm:p-6 lg:p-7">


    {/* ==========================================================
        HOTEL IDENTITY
    ========================================================== */}
    <div className="flex min-w-0 items-start gap-3 sm:gap-4">

      {/* HOTEL ICON */}
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#17345D] text-white sm:h-12 sm:w-12">
        <Hotel size={19} />
      </div>


      {/* HOTEL DETAILS */}
      <div className="min-w-0 flex-1">

        <p className="break-words text-[19px] font-bold leading-6 tracking-[-0.01em] text-[#17345D] sm:text-[19px]">
          {hotelName}
        </p>

        <div className="mt-1.5 flex min-w-0 items-start gap-2">

          <MapPin
            size={15}
            className="mt-0.5 shrink-0 text-[#3479E8]"
          />

          <p className="min-w-0 break-words text-[14px] font-medium leading-5 text-[#5B6472]">
            {addressText || "Registered hotel address"}
          </p>

        </div>

      </div>

    </div>


    {/* ==========================================================
        OWNER + TAX
    ========================================================== */}
    <div className="mt-5 grid w-full grid-cols-1 overflow-hidden rounded-xl border border-[#E2EAF5] sm:grid-cols-2">

      {/* AUTHORIZED OWNER */}
      <div className="min-w-0 p-4 sm:p-4">

        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6472]">
          Authorized Owner
        </p>

        <p className="mt-1.5 break-words text-[14px] font-bold leading-5 text-[#17345D]">
          {ownerName}
        </p>

      </div>



    </div>


    {/* ==========================================================
        CONTACT
    ========================================================== */}
    <div className="mt-4 grid w-full grid-cols-1 overflow-hidden rounded-xl border border-[#E2EAF5] sm:grid-cols-2">

      {/* EMAIL */}
      <div className="flex min-w-0 items-start gap-3 p-4">

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#3479E8]">
          <Mail size={16} />
        </div>

        <div className="min-w-0 flex-1">

          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6472]">
            Email
          </p>

          <p className="mt-1 break-all text-[13px] font-semibold leading-5 text-[#222222]">
            {ownerEmail || "Not available"}
          </p>

        </div>

      </div>


      {/* PHONE */}
      <div className="flex min-w-0 items-start gap-3 border-t border-[#EEF1F5] p-4 sm:border-l sm:border-t-0">

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EAF3FF] text-[#3479E8]">
          <Phone size={16} />
        </div>

        <div className="min-w-0 flex-1">

          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6472]">
            Phone
          </p>

          <p className="mt-1 break-words text-[13px] font-semibold leading-5 text-[#222222]">
            {ownerPhone || "Not available"}
          </p>

        </div>

      </div>

    </div>


    {/* ==========================================================
        VERIFICATION
    ========================================================== */}
    <div className="mt-4 flex w-full items-start gap-3 rounded-xl border border-[#BFE4D2] bg-[#F1FAF6] p-4 sm:p-4">

      {/* CHECK ICON */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E7F6EF] text-[#0F7A5E]">
        <Check size={15} />
      </div>


      {/* MESSAGE */}
      <div className="min-w-0 flex-1">

        <p className="break-words text-[13px] font-bold leading-5 text-[#0F7A5E]">
          Registration details ready
        </p>

        <p className="mt-1 break-words text-[12px] font-medium leading-5 text-[#136245]">
          Hotel information will be submitted for admin review after payment.
        </p>

      </div>

    </div>

  </div>

</section>



        </div>


        {/* ====================================================
            BOTTOM — PROFESSIONAL CHECKOUT INFORMATION
        ==================================================== */}
   <section className="mt-6 overflow-hidden rounded-[22px] border border-[#E2EAF5] bg-white shadow-[0_16px_40px_rgba(14,42,81,0.08)]">

  {/* ============================================================
      CHECKOUT HEADER
  ============================================================ */}
  <div className="flex flex-col gap-3 border-b border-[#E2EAF5] bg-[linear-gradient(105deg,#17345D,#347BE9)] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">

    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#C4DAFF]">
        Checkout
      </p>

      <h2 className="mt-1 text-[20px] font-bold text-white sm:text-[20px]">
        Order Summary
      </h2>
    </div>

    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
      <ReceiptText size={18} />
    </div>

  </div>


  {/* ============================================================
      CHECKOUT CONTENT
  ============================================================ */}
  <div className="p-4 sm:p-6 lg:p-7">

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:gap-6">


      {/* ==========================================================
          BILLING DETAILS
      ========================================================== */}
    <div className="min-w-0 w-full">

  {/* ============================================================
      BILLING DETAILS
  ============================================================ */}
  <p className="mb-3 text-[14px] font-bold uppercase tracking-[0.06em] text-[#5B6472] sm:text-[14px]">
    Billing Details
  </p>


  {/* ============================================================
      BILLING CARD
  ============================================================ */}
  <div className="w-full overflow-hidden rounded-xl border border-[#E2EAF5] bg-white">


    {/* ==========================================================
        PLAN PRICE
    ========================================================== */}
    <div className="min-w-0 w-full">
      <SummaryPriceRow
        label={selectedPlan.planName}
        description={`${getBillingLabel(billingCycle)} subscription`}
        value={price}
      />
    </div>


    {/* ==========================================================
        SETUP FEE
    ========================================================== */}
    <div className="border-t border-[#EEF1F5] px-4 py-4 sm:px-5 sm:py-5">

      <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">

        {/* LEFT */}
        <div className="min-w-0 flex-1">

          <p className="break-words text-[16px] font-semibold leading-5 text-[#101828]">
            Platform Setup Fee
          </p>

          <p className="mt-1 text-[14px] font-medium leading-5 text-[#5B6472]">
            Initial platform provisioning
          </p>

        </div>


        {/* RIGHT */}
        {setupFee > 0 ? (
          <span className="shrink-0 self-start text-[16px] font-bold text-[#17345D] sm:self-center">
            {formatCurrency(setupFee)}
          </span>
        ) : (
          <span className="w-fit shrink-0 rounded-full bg-[#E7F6EF] px-3 py-1.5 text-[13px] font-bold text-[#0F7A5E]">
            Free
          </span>
        )}

      </div>

    </div>


    

  </div>


  {/* ============================================================
      PAYMENT NOTICE
  ============================================================ */}
  <div className="mt-4 flex w-full items-start gap-3 rounded-xl border border-[#BFD8FF] bg-[#EAF3FF] p-4 sm:mt-5 sm:p-5">

    {/* ICON */}
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#3479E8] sm:h-10 sm:w-10">
      <Info size={18} />
    </div>


    {/* CONTENT */}
    <div className="min-w-0 flex-1">

      <p className="break-words text-[15px] font-bold leading-5 text-[#17345D]">
        Before you continue
      </p>

      <p className="mt-1.5 break-words text-[14px] font-medium leading-6 text-[#2A4A73]">
        Payment marks your registration as paid. Your hotel is then submitted to the admin for review and activation.
      </p>

    </div>

  </div>

</div>


      {/* ==========================================================
          TOTAL + ACTIONS
      ========================================================== */}
      <div className="min-w-0 rounded-xl border border-[#E2EAF5] bg-[#F8FAFF] p-4 sm:p-5">


        {/* TOTAL LABEL */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#5B6472]">
          Total Due Today
        </p>


        {/* TOTAL */}
        <div className="mt-2 flex items-end justify-between gap-3">

          <p className="min-w-0 break-words text-[30px] font-bold tracking-[-0.03em] text-[#17345D] sm:text-[30px]">
            {formatCurrency(total)}
          </p>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#17345D] text-white">
            <CreditCard size={18} />
          </div>

        </div>


        <div className="my-5 border-t border-[#E2EAF5]" />


        {/* ========================================================
            PAY NOW / ALREADY PAID
        ======================================================== */}
        {alreadyPaid ? (
          /* ── Already-Paid Premium Banner ── */
          <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <CheckCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-bold text-amber-800">
                  Payment Already Received
                </p>
                <p className="mt-0.5 text-[12px] leading-5 text-amber-700">
                  Your hotel registration is confirmed and subscription payment
                  has been successfully received. Our admin team is currently
                  reviewing your application.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2.5">
              <Clock3 size={14} className="shrink-0 text-amber-500" />
              <p className="text-[12px] font-semibold text-amber-700">
                Awaiting admin approval — you will be notified via email once your hotel account is activated.
              </p>
            </div>
            <button
              type="button"
              onClick={handleViewApplicationStatus}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#347BE9] bg-white px-4 py-2.5 text-[13px] font-bold text-[#347BE9] transition hover:bg-[#EAF3FF] active:scale-[0.99]"
            >
              <Info size={15} className="shrink-0" />
              View Application Status
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePayNow}
            disabled={isPaying}
            className="
              flex
              min-h-[50px]
              w-full
              cursor-pointer
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#347BE9]
              px-4
              py-3.5
              text-[15px]
              font-bold
              text-white
              shadow-[0_2px_5px_rgba(52,123,233,0.25)]
              transition
              hover:bg-[#2467D5]
              active:scale-[0.99]
              disabled:cursor-not-allowed
              disabled:opacity-60
              sm:px-5
            "
          >
            <CreditCard
              size={18}
              className="shrink-0"
            />

            <span className="truncate">
              Pay Now
            </span>

            <span className="shrink-0">
              {formatCurrency(total)}
            </span>

            <ArrowRight
              size={17}
              className="ml-auto shrink-0"
            />
          </button>
        )}


      

     

      </div>

    </div>

  </div>

</section>

        

      </main>

      {/* ======================================================
          PAYMENT MODAL
      ====================================================== */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1220]/60 px-4 py-5 backdrop-blur-[3px]">
          {/* BACKDROP */}
          <button
            type="button"
            aria-label="Close payment modal"
            disabled={isPaying}
            onClick={() => setIsPaymentModalOpen(false)}
            className="absolute inset-0 cursor-default"
          />

          {/* MODAL */}
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-[880px] flex-col overflow-hidden rounded-[24px] border border-[#E2EAF5] bg-white shadow-[0_25px_80px_rgba(6,15,35,0.45)]">
            {/* =====================================================
                MODAL HEADER — solid navy for immediate hierarchy
                and guaranteed text contrast
            ===================================================== */}
            <div className="flex shrink-0 items-center justify-between bg-[#17345D] px-5 py-5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
                  <CreditCard size={19} strokeWidth={2.2} />
                </div>

                <div>
                  <h2 className="text-[18px] font-bold tracking-[-0.01em] text-white sm:text-[20px]">
                    Confirm Payment
                  </h2>
                  <p className="mt-0.5 text-[12px] font-medium text-[#B9C8DF]">
                    Review your order carefully before completing payment.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isPaying}
                onClick={() => setIsPaymentModalOpen(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={17} />
              </button>
            </div>

            {/* =====================================================
                MODAL CONTENT
            ===================================================== */}
            <div className="overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
                {/* =================================================
                    LEFT SIDE
                ================================================= */}
                <div className="border-b border-[#E2EAF5] p-5 sm:p-7 lg:border-b-0 lg:border-r">
                  {/* PAYMENT AMOUNT */}
                  <div className="rounded-xl border border-[#E2EAF5] bg-[#F8FAFF] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6472]">
                          Amount Due
                        </p>
                        <p className="mt-1 text-[30px] font-bold tracking-[-0.02em] text-[#17345D] sm:text-[34px]">
                          {formatCurrency(total)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-[#EAF3FF] px-3 py-2 text-[11px] font-bold text-[#3479E8]">
                        {getBillingLabel(billingCycle)}
                      </div>
                    </div>
                  </div>

                  {/* ORDER DETAILS */}
                  <div className="mt-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#17345D]">
                      Order Details
                    </p>

                    <div className="mt-3 overflow-hidden rounded-xl border border-[#E2EAF5] bg-white">
                      <ModalRow label="Hotel" value={hotelName} />
                      <ModalRow label="Plan" value={selectedPlan.planName} />
                      <ModalRow label="Billing Cycle" value={getBillingLabel(billingCycle)} />
                      <ModalRow label="Subscription" value={formatCurrency(price)} />
                    </div>
                  </div>

                  {/* PAYMENT NOTICE */}
                  <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#BFD8FF] bg-[#EAF3FF] p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[#3479E8]">
                      <Info size={16} />
                    </div>

                    <div>
                      <p className="text-[12px] font-bold text-[#17345D]">Payment Information</p>
                      <p className="mt-1 text-[11px] font-medium leading-5 text-[#2A4A73]">
                        After confirmation, your payment will be marked as paid and your hotel
                        application will continue through the registration process.
                      </p>
                    </div>
                  </div>
                </div>

                {/* =================================================
                    RIGHT SIDE — BILL
                ================================================= */}
                <div className="bg-[#F4F7FC] p-5 sm:p-7">
                  <div className="lg:sticky lg:top-0">
                    {/* BILL HEADER */}
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5B6472]">
                        Billing Summary
                      </p>
                      <h3 className="mt-1 text-[19px] font-bold tracking-[-0.01em] text-[#17345D]">
                        Your Order Summary
                      </h3>
                    </div>

                    {/* BILL */}
                    <div className="mt-5 rounded-xl border border-[#E2EAF5] bg-white p-5">
                      {/* PLAN */}
                      <div className="flex items-start justify-between gap-4">
                        <div >
                          <p className="text-[13px] p-4 font-bold text-[#17345D]">{selectedPlan.planName}</p>
                          <p className="mt-1 text-[11px] p-4 font-medium text-[#5B6472]">
                            {getBillingLabel(billingCycle)} subscription
                          </p>
                        </div>

                        <p className="text-[13px] font-bold text-[#17345D]">{formatCurrency(price)}</p>
                      </div>

                      <div className="my-4 border-t border-dashed border-[#D6DBE3]" />

                     


                      {/* TOTAL */}
                      <div className="mt-5 rounded-lg bg-[#17345D] p-4">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#C4DAFF]">
                              Total Due Today
                            </p>
                            <p className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-white">
                              {formatCurrency(total)}
                            </p>
                          </div>

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3479E8] text-white">
                            <CreditCard size={17} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CONFIRM BUTTON */}
                    <button
                      type="button"
                      disabled={isPaying}
                      onClick={handleConfirmPayment}
                      className="mt-4 flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-5 py-3.5 text-[13px] font-bold text-white shadow-[0_1px_2px_rgba(11,36,71,0.3)] transition hover:bg-[#2467D5] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPaying ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          Confirm Payment
                          <span className="ml-1">{formatCurrency(total)}</span>
                        </>
                      )}
                    </button>

                    {/* CANCEL */}
                    <button
                      type="button"
                      disabled={isPaying}
                      onClick={() => setIsPaymentModalOpen(false)}
                      className="mt-2.5 flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-lg border border-[#C9D8EB] bg-white px-5 py-3 text-[12px] font-semibold text-[#344054] transition hover:bg-[#F4F7FC]"
                    >
                      Cancel
                    </button>

                   
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// PLAN LIMIT
// ============================================================

const PlanLimit = ({ icon: Icon, label, value }) => {
  return (
    <div className="rounded-xl border border-[#E2EAF5] bg-[#F8FAFF] p-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#17345D] text-white">
          <Icon size={15} />
        </div>

        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[#5B6472]">{label}</p>
          <p className="mt-0.5 truncate text-[16px] font-bold text-[#17345D]">{value ?? 0}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// FEATURE ITEM
// ============================================================

const FeatureItem = ({ icon: Icon, label, enabled }) => {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 ${
        enabled ? "border-[#BFE4D2] bg-[#F1FAF6]" : "border-[#E2EAF5] bg-[#F8FAFF]"
      }`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          enabled ? "bg-[#E7F6EF] text-[#0F7A5E]" : "bg-[#EEF0F3] text-[#94A3B8]"
        }`}
      >
        <Icon size={15} />
      </div>

      <div className="min-w-0">
        <p className={`text-[13px] font-bold ${enabled ? "text-[#17345D]" : "text-[#94A3B8]"}`}>
          {label}
        </p>
        <p className={`mt-0.5 text-[11px] font-semibold ${enabled ? "text-[#0F7A5E]" : "text-[#94A3B8]"}`}>
          {enabled ? "Included" : "Not included"}
        </p>
      </div>

      <div className="ml-auto shrink-0">
        {enabled ? (
          <CheckCircle2 size={15} className="text-[#0F7A5E]" />
        ) : (
          <span className="text-[10px] font-bold text-[#94A3B8]">—</span>
        )}
      </div>
    </div>
  );
};

// ============================================================
// PROFILE INFO
// ============================================================

const ProfileInfo = ({ icon: Icon, label, value }) => {
  return (
    <div className="rounded-xl border border-[#E2EAF5] bg-[#F8FAFF] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#17345D] text-white">
          <Icon size={15} />
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#5B6472]">{label}</p>
          <p className="mt-1 break-words text-[14px] font-bold text-[#17345D]">{value}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CONTACT VALUE
// ============================================================

const ContactValue = ({ icon: Icon, value }) => {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Icon size={14} className="shrink-0 text-[#3479E8]" />
      <span className="truncate text-[13px] font-medium text-[#344054]">{value}</span>
    </div>
  );
};

// ============================================================
// SUMMARY PRICE ROW
// ============================================================

const SummaryPriceRow = ({ label, description, value }) => {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 p-4">
        <p className="text-[14px]  font-semibold text-[#101828]">{label}</p>
        <p className="mt-0.5 text-[12px] font-medium text-[#5B6472]">{description}</p>
      </div>

      <span className="shrink-0 p-4 text-[14px] font-bold text-[#17345D]">{formatCurrency(value)}</span>
    </div>
  );
};

// ============================================================
// SUMMARY ROW
// ============================================================

const SummaryRow = ({ label, value, icon: Icon, strong = false }) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E2EAF5] py-3 last:border-b-0">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon size={14} className="shrink-0 text-[#5B6472]" />}
        <span className="text-[13px] font-medium text-[#5B6472]">{label}</span>
      </div>

      <span
        className={`max-w-[60%] break-words text-right ${
          strong ? "text-[15px] font-bold text-[#17345D]" : "text-[13px] font-bold text-[#344054]"
        }`}
      >
        {value}
      </span>
    </div>
  );
};

// ============================================================
// MODAL ROW
// ============================================================

const ModalRow = ({ label, value, last = false, strong = false }) => {
  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2.5 ${!last ? "border-b border-[#E5E7EB]" : ""}`}>
      <span className="text-[13px] font-medium text-[#5B6472]">{label}</span>
      <span
        className={`max-w-[60%] break-words text-right ${
          strong ? "text-[15px] font-bold text-[#17345D]" : "text-[13px] font-bold text-[#101828]"
        }`}
      >
        {value}
      </span>
    </div>
  );
};

export default SaaSUserCheckout;