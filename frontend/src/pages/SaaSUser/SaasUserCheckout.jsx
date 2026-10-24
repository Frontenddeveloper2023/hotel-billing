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
  IndianRupee,
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
import {
  createRegistrationOrder,
  verifyRegistrationPayment,
} from "../../service/paymentApi";
import {
  openCashfreeCheckoutModal,
  isPaymentCancellation,
} from "../../util/cashfreeCheckout";

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
    if (!currentRegId || !paidRegId) return false;
    return currentRegId === paidRegId;
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

  const regPayload = registration || hotelDetails;

  if (!registrationId && !regPayload) {
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

      const regPayload = registration || hotelDetails;
      if (!registrationId && !regPayload) {
        setError("Registration details are missing. Please try again.");
        return;
      }

      // 1. Create Cashfree Order session from backend (passing registrationData)
      const orderRes = await createRegistrationOrder({
        registrationId: registrationId || undefined,
        registrationData: regPayload,
      });
      if (!orderRes?.success || !orderRes?.data?.paymentSessionId) {
        throw new Error(orderRes?.message || "Failed to initiate payment with Cashfree.");
      }

      const { paymentSessionId, orderId, env } = orderRes.data;

      // Close pre-payment overview modal before launching popup
      setIsPaymentModalOpen(false);

      // 2. Launch Cashfree Web SDK Checkout Popup
      const checkoutResult = await openCashfreeCheckoutModal({
        paymentSessionId,
        mode: env || "sandbox",
      });

      if (checkoutResult?.error) {
        if (isPaymentCancellation(checkoutResult.error)) {
          setError("Payment was cancelled. You have not been charged. Click 'Pay & Submit Registration' whenever you are ready to continue.");
          setIsPaying(false);
          return;
        }
        throw new Error(checkoutResult.error.message || "Payment was cancelled or failed.");
      }

      // 3. Server-side verification with Cashfree API (THIS IS WHERE IT PERSISTS TO DB!)
      setIsPaying(true);
      const verifyRes = await verifyRegistrationPayment({
        registrationId: registrationId || undefined,
        orderId,
        registrationData: regPayload,
      });

      if (!verifyRes?.success) {
        throw new Error(verifyRes?.message || "Payment verification failed. Please contact support.");
      }

      const createdRegId =
        verifyRes?.data?.registrationId || registrationId || "";

      const paymentTransactionId =
        verifyRes?.data?.paymentTransactionId || `CF-${orderId}`;

      setTransactionId(paymentTransactionId);
      setPaymentSuccess(true);

      if (createdRegId) {
        sessionStorage.setItem("saasRegistrationId", String(createdRegId));
      }
      sessionStorage.setItem("saasPaymentStatus", "paid");
      sessionStorage.removeItem("saasHotelDetails");
      sessionStorage.removeItem("saasRegistration");
    } catch (error) {
      if (isPaymentCancellation(error)) {
        setError("Payment was cancelled. You have not been charged. Click 'Pay & Submit Registration' whenever you are ready to continue.");
      } else {
        setError(
          error?.message ||
            error?.data?.message ||
            "Unable to complete payment."
        );
      }
    } finally {
      setIsPaying(false);
    }
  };

  // ==========================================================
  // NAVIGATION
  // ==========================================================

  const handleViewApplicationStatus = () => {
    const targetRegId = registrationId || sessionStorage.getItem("saasRegistrationId");
    navigate("/saas-user/application-status", { state: { registrationId: targetRegId } });
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
          <SaaSSetupProgress activeStep={5} />
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
          <SaaSSetupProgress activeStep={4} />
        </div>
      </div>

      {/* ======================================================
          CENTERED MAIN CONTENT
      ====================================================== */}
      {/* ======================================================
          CENTERED MAIN CONTENT
      ====================================================== */}
      <main className="mx-auto w-full max-w-[1160px] px-3.5 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8">

        {/* PAGE HEADER */}
        <div className="mx-auto mb-5 max-w-[850px] text-center sm:mb-7">
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl lg:text-3xl">
            Review Subscription & Checkout
          </h1>
          <p className="mt-1.5 text-xs text-blue-100/90 sm:text-sm">
            Confirm your plan and hotel details before finalizing activation
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mx-auto mb-5 flex max-w-[1080px] items-start gap-3 rounded-xl border border-[#F3C6C1] bg-[#FEF0EF] px-3.5 py-3 sm:px-4 sm:py-3.5">
            <Info size={16} className="mt-0.5 shrink-0 text-[#B42318]" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#7A1B12]">Checkout Error</p>
              <p className="mt-0.5 text-[12px] font-medium leading-5 text-[#93261B]">{error}</p>
            </div>
          </div>
        )}

        {/* ====================================================
            TOP ROW — PLAN LEFT + HOTEL RIGHT
        ==================================================== */}
        <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-6">

          {/* ==================================================
              LEFT — SELECTED SUBSCRIPTION PLAN
          ================================================== */}
          <section className="relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#6AA5FF]/70 bg-[linear-gradient(145deg,#3B82F6_0%,#2563EB_50%,#1D4ED8_100%)] shadow-[0_12px_32px_rgba(29,78,216,0.22)]">

            {/* SUBTLE TOP-RIGHT GLOW ACCENT */}
            <div className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 rounded-full bg-white/10 blur-xl" />

            {/* CONTENT */}
            <div className="relative flex w-full flex-1 flex-col justify-between p-4 sm:p-5 lg:p-6">

              <div>
                {/* HEADER */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20">
                      <Sparkles size={11} className="text-amber-300" />
                      Subscription Plan
                    </span>
                  </div>

                  <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white ring-1 ring-white/30">
                    Most Popular
                  </span>
                </div>

                {/* PLAN NAME & DESC */}
                <div className="mt-3.5 min-w-0">
                  <h2 className="break-words text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl">
                    {selectedPlan.planName}
                  </h2>
                  {selectedPlan.description && (
                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-blue-50/90 sm:text-[13px]">
                      {selectedPlan.description}
                    </p>
                  )}
                </div>

                {/* PRICE */}
                <div className="mt-3.5 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {formatCurrency(price)}
                  </span>
                  <span className="text-xs font-semibold text-blue-100 sm:text-sm">
                    / {billingCycle === "yearly" ? "year" : billingCycle === "monthly" ? "month" : "cycle"}
                  </span>
                </div>

                {/* DIVIDER */}
                <div className="my-3.5 border-t border-white/20" />

                {/* INCLUDED TITLE */}
                <p className="text-xs font-semibold text-blue-100">
                  Plan inclusions & limits:
                </p>

                {/* FEATURES LIST */}
                <div className="mt-2 divide-y divide-white/15">
                  {/* ROOMS */}
                  <div className="flex items-center gap-2.5 py-2">
                    <CheckCircle2 size={15} strokeWidth={2.2} className="shrink-0 text-white" />
                    <span className="text-xs font-medium text-white sm:text-[13px]">
                      {Number(selectedPlan?.limits?.rooms || 0) === 0
                        ? "Unlimited rooms"
                        : `Up to ${selectedPlan?.limits?.rooms} rooms`}
                    </span>
                  </div>

                  {/* BRANCHES */}
                  <div className="flex items-center gap-2.5 py-2">
                    <CheckCircle2 size={15} strokeWidth={2.2} className="shrink-0 text-white" />
                    <span className="text-xs font-medium text-white sm:text-[13px]">
                      {Number(selectedPlan?.limits?.branches || 0) === 0
                        ? "Unlimited branches"
                        : `Up to ${selectedPlan?.limits?.branches} branches`}
                    </span>
                  </div>

                  {/* RECEPTIONISTS */}
                  <div className="flex items-center gap-2.5 py-2">
                    <CheckCircle2 size={15} strokeWidth={2.2} className="shrink-0 text-white" />
                    <span className="text-xs font-medium text-white sm:text-[13px]">
                      {Number(selectedPlan?.limits?.receptionists || 0) === 0
                        ? "Unlimited receptionists"
                        : `Up to ${selectedPlan?.limits?.receptionists} receptionists`}
                    </span>
                  </div>

                  {/* FOOD SERVICE */}
                  <div className="flex items-center gap-2.5 py-2">
                    {selectedPlan?.features?.foodService ? (
                      <CheckCircle2 size={15} strokeWidth={2.2} className="shrink-0 text-white" />
                    ) : (
                      <XCircle size={15} strokeWidth={2} className="shrink-0 text-blue-200" />
                    )}
                    <span
                      className={`text-xs font-medium sm:text-[13px] ${
                        selectedPlan?.features?.foodService
                          ? "text-white"
                          : "text-blue-200/80 line-through"
                      }`}
                    >
                      Food Service & Kitchen Billing
                    </span>
                  </div>

                  {/* ROOM SERVICE */}
                  <div className="flex items-center gap-2.5 py-2">
                    {selectedPlan?.features?.roomService ? (
                      <CheckCircle2 size={15} strokeWidth={2.2} className="shrink-0 text-white" />
                    ) : (
                      <XCircle size={15} strokeWidth={2} className="shrink-0 text-blue-200" />
                    )}
                    <span
                      className={`text-xs font-medium sm:text-[13px] ${
                        selectedPlan?.features?.roomService
                          ? "text-white"
                          : "text-blue-200/80 line-through"
                      }`}
                    >
                      Room Service Ordering
                    </span>
                  </div>

                  {/* TRIAL */}
                  {Number(selectedPlan?.trialDays || 0) > 0 && (
                    <div className="flex items-center gap-2.5 py-2">
                      <CheckCircle2 size={15} strokeWidth={2.2} className="shrink-0 text-emerald-300" />
                      <span className="text-xs font-semibold text-emerald-100 sm:text-[13px]">
                        {selectedPlan.trialDays} days free trial enabled
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* BILLING FOOTER */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/20 pt-3">
                <span className="text-xs font-semibold text-blue-100">
                  Billing Frequency
                </span>
                <span className="rounded-md border border-white/30 bg-white/20 px-2.5 py-1 text-xs font-bold text-white">
                  {getBillingLabel(billingCycle)}
                </span>
              </div>

            </div>
          </section>


          {/* ==================================================
              RIGHT — HOTEL REGISTRATION
          ================================================== */}
          <section className="flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">

            {/* HEADER */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5 sm:py-3.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Hotel size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Registration Info
                  </p>
                  <h2 className="truncate text-sm font-bold text-slate-900 sm:text-[15px]">
                    Hotel & Owner Details
                  </h2>
                </div>
              </div>

              {/* EDIT BUTTON */}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-blue-600 active:scale-[0.98]"
              >
                <ArrowLeft size={13} className="shrink-0" />
                <span>Edit</span>
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 lg:p-6">
              <div>
                {/* HOTEL IDENTITY */}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-base font-bold text-slate-900 sm:text-lg">
                      {hotelName}
                    </h3>
                    <div className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPin size={13} className="mt-0.5 shrink-0 text-blue-500" />
                      <span className="line-clamp-2 leading-relaxed">
                        {addressText || "Registered hotel address"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* KEY VALUE DETAILS */}
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {/* AUTHORIZED OWNER */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Authorized Owner
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-slate-800 sm:text-[13px]">
                      {ownerName || "Hotel Owner"}
                    </p>
                  </div>

                  {/* PHONE */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Phone size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Phone
                      </p>
                      <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
                        {ownerPhone || "Not provided"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* EMAIL */}
                <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Mail size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Verified Contact Email
                    </p>
                    <p className="mt-0.5 break-all text-xs font-bold text-slate-800">
                      {ownerEmail || "Not available"}
                    </p>
                  </div>
                </div>
              </div>

              {/* VERIFICATION NOTICE */}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={13} strokeWidth={2.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-emerald-900">
                    Registration information ready
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-emerald-700">
                    Your hotel profile will be forwarded to admin review immediately after checkout.
                  </p>
                </div>
              </div>

            </div>
          </section>

        </div>


        {/* ====================================================
            BOTTOM — PROFESSIONAL CHECKOUT INFORMATION
        ==================================================== */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:mt-6">

          {/* CHECKOUT HEADER */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 px-4 py-3 sm:px-6 sm:py-3.5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">
                Payment Summary
              </p>
              <h2 className="text-sm font-bold text-white sm:text-base">
                Order Breakdown & Due Total
              </h2>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/15">
              <ReceiptText size={16} />
            </div>
          </div>

          {/* CHECKOUT CONTENT */}
          <div className="p-4 sm:p-5 lg:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">

              {/* LEFT — BILLING DETAILS */}
              <div className="min-w-0 w-full">
                <p className="mb-2.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Billing Details
                </p>

                {/* BILLING CARD */}
                <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {/* PLAN PRICE */}
                  <div className="min-w-0 w-full">
                    <SummaryPriceRow
                      label={selectedPlan.planName}
                      description={`${getBillingLabel(billingCycle)} subscription`}
                      value={price}
                    />
                  </div>

                  {/* SETUP FEE */}
                  <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 sm:text-[13px]">
                          Platform Setup Fee
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          Initial cloud database and platform provisioning
                        </p>
                      </div>
                      {setupFee > 0 ? (
                        <span className="shrink-0 text-xs font-bold text-slate-900 sm:text-[13px]">
                          {formatCurrency(setupFee)}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                          Free
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* PAYMENT NOTICE */}
                <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 p-3 sm:p-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm">
                    <Info size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900">
                      Payment Protection & Approval
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-600">
                      Completing payment validates your subscription. Your hotel profile is queued for rapid verification by our operations team.
                    </p>
                  </div>
                </div>
              </div>

              {/* RIGHT — TOTAL + ACTIONS */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Due Today
                    </p>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                      <CreditCard size={15} />
                    </div>
                  </div>

                  <div className="mt-2">
                    <p className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                      {formatCurrency(total)}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                      Includes all applicable platform taxes
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  {/* PAY NOW / ALREADY PAID */}
                  {alreadyPaid ? (
                    <div className="flex flex-col gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                          <CheckCircle2 size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-amber-800">
                            Payment Already Received
                          </p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                            Your hotel registration and payment are confirmed. Our admin team is reviewing your application.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleViewApplicationStatus}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-600 bg-white px-3 py-2 text-xs font-bold text-blue-600 transition hover:bg-blue-50 active:scale-[0.99]"
                      >
                        <Info size={13} className="shrink-0" />
                        View Application Status
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={handlePayNow}
                        disabled={isPaying}
                        className="flex min-h-[46px] w-full cursor-pointer items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard size={16} className="shrink-0" />
                          <span>Pay Now</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>{formatCurrency(total)}</span>
                          <ArrowRight size={14} className="shrink-0" />
                        </div>
                      </button>

                      <div className="flex items-center justify-center gap-3 pt-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <LockKeyhole size={12} className="text-emerald-600" />
                          256-bit SSL Secure
                        </span>
                        <span>•</span>
                        <span>Instant Receipt</span>
                      </div>
                    </div>
                  )}
                </div>

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
                      {/* <div className="flex items-start justify-between gap-4">
                        <div >
                          <p className="text-[13px] p-4 font-bold text-[#17345D]">{selectedPlan.planName}</p>
                          <p className="mt-1 text-[11px] p-4 font-medium text-[#5B6472]">
                            {getBillingLabel(billingCycle)} subscription
                          </p>
                        </div>

                        <p className="text-[13px] font-bold text-[#17345D]">{formatCurrency(price)}</p>
                      </div>

                      <div className="my-4 border-t border-dashed border-[#D6DBE3]" /> */}

                     


                      {/* TOTAL */}
                      <div className="mt-5 rounded-lg bg-[#17345D] p-4">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#C4DAFF]">
                              Total Amount
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
                          <CreditCard size={16} />
                          Pay 
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