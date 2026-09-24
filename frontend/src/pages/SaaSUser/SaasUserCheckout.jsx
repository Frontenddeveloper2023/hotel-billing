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
  FileText,
  Hotel,
  Info,
  Landmark,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Utensils,
  X,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { confirmDummyPayment } from "../../service/hotelRegistrationApi";


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

  const [isPaymentModalOpen, setIsPaymentModalOpen] =
    useState(false);

  const [isPaying, setIsPaying] = useState(false);

  const [paymentSuccess, setPaymentSuccess] =
    useState(false);

  const [transactionId, setTransactionId] =
    useState("");

  const [error, setError] = useState("");


  // ==========================================================
  // ROUTER DATA
  // ==========================================================

  const selectedPlanFromState =
    location.state?.selectedPlan || null;

  const billingCycleFromState =
    location.state?.billingCycle || null;

  const registrationFromState =
    location.state?.registration || null;


  // ==========================================================
  // SESSION STORAGE FALLBACK
  // ==========================================================

  const storedPlan = useMemo(() => {
    try {
      const data =
        sessionStorage.getItem("saasSelectedPlan");

      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);


  const storedBillingCycle = useMemo(() => {
    return (
      sessionStorage.getItem("saasBillingCycle") ||
      ""
    );
  }, []);


  const storedRegistration = useMemo(() => {
    try {
      const data =
        sessionStorage.getItem("saasRegistration");

      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);


  // ==========================================================
  // FINAL DATA
  // ==========================================================

  const selectedPlan =
    selectedPlanFromState || storedPlan;

  const billingCycle =
    billingCycleFromState || storedBillingCycle;

  const registration =
    registrationFromState || storedRegistration || null;


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

    const pricing =
      selectedPlan.pricing || {};

    return Number(
      pricing[billingCycle] || 0
    );
  }, [selectedPlan, billingCycle]);


  const setupFee = Number(
    selectedPlan?.setupFee || 0
  );


  const subtotal =
    price + setupFee;


  /*
   * Keep the current project behaviour.
   * Your backend currently handles the actual payment state.
   */
  const tax = 0;


  const total =
    subtotal + tax;


  // ==========================================================
  // HOTEL DATA
  // ==========================================================

  const hotelName =
    registration?.hotelName ||
    "Hotel Registration";


  const ownerName =
    registration?.ownerName ||
    "Hotel Owner";


  const ownerEmail =
    registration?.email ||
    "";


  const ownerPhone =
    registration?.phone ||
    "";


  const address =
    registration?.address || {};


  const addressText = [
    address.street,
    address.city,
    address.state,
    address.country,
    address.pincode,
  ]
    .filter(Boolean)
    .join(", ");


  const gstNumber =
    registration?.gstNumber ||
    "";


  // ==========================================================
  // PAYMENT HANDLERS
  // ==========================================================

  const handlePayNow = () => {
    setError("");

    if (!registrationId) {
      setError(
        "Registration details are missing. Please go back and complete registration again."
      );

      return;
    }

    if (!selectedPlan) {
      setError(
        "Plan details are missing. Please select a plan again."
      );

      return;
    }

    setIsPaymentModalOpen(true);
  };


  const handleConfirmPayment = async () => {
    try {
      setIsPaying(true);
      setError("");

      if (!registrationId) {
        setError(
          "Registration ID is missing. Please try again."
        );

        return;
      }


      const response =
        await confirmDummyPayment(
          registrationId
        );


      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Payment could not be completed."
        );
      }


      const paymentTransactionId =
        response?.data?.paymentTransactionId ||
        "";


      setTransactionId(
        paymentTransactionId
      );


      setPaymentSuccess(true);

      setIsPaymentModalOpen(false);


      // Save registration ID
      sessionStorage.setItem(
        "saasRegistrationId",
        registrationId
      );


      // Save payment status for UI
      sessionStorage.setItem(
        "saasPaymentStatus",
        "paid"
      );
    } catch (error) {
      setError(
        error?.message ||
          error?.data?.message ||
          "Unable to complete demo payment."
      );
    } finally {
      setIsPaying(false);
    }
  };


  // ==========================================================
  // APPLICATION STATUS
  // ==========================================================

  const handleViewApplicationStatus = () => {
    navigate(
      "/saas-user/application-status",
      {
        state: {
          registrationId,
        },
      }
    );
  };


  // ==========================================================
  // NO PLAN
  // ==========================================================

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] text-[#111827]">

      


        <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-xl items-center px-4 py-10">

          <div className="w-full rounded-2xl border border-[#E1E3EA] bg-white p-7 text-center sm:p-9">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1F0FF] text-[#4338CA]">
              <ReceiptText size={26} />
            </div>


            <h1 className="mt-5 text-[24px] font-extrabold tracking-[-0.03em] text-[#111827]">
              No Plan Selected
            </h1>


            <p className="mx-auto mt-2 max-w-sm text-[13px] font-medium leading-6 text-[#64748B]">
              Please select a subscription plan before
              continuing to checkout.
            </p>


            <button
              type="button"
              onClick={() =>
                navigate(
                  "/saas-user/choose-plan"
                )
              }
              className="
                mt-7
                inline-flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#4338CA]
                px-5
                py-3.5
                text-[13px]
                font-bold
                text-white
                transition
                hover:bg-[#3730A3]
              "
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

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#F8F8FC]">

        {/* Header */}

        <header className="border-b border-[#E5E7EB] bg-white">

          <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4338CA] text-white">
                <Hotel size={18} />
              </div>

             

            </div>


            <div className="flex items-center gap-2 rounded-full border border-[#DDF7EC] bg-[#F0FDF7] px-3 py-1.5">

              <CheckCircle2
                size={14}
                className="text-[#087A58]"
              />

              <span className="text-[10px] font-bold text-[#087A58]">
                Payment Completed
              </span>

            </div>

          </div>

        </header>


        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">

          <SaaSSetupProgress activeStep={4} />


          <div className="mt-8 overflow-hidden rounded-2xl border border-[#E0E2EA] bg-white">

            {/* Success Banner */}

            <div className="border-b border-[#E3E5EC] bg-[#F7F7FF] px-6 py-8 text-center sm:px-10">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DDF7EC] text-[#087A58]">
                <CheckCircle2 size={34} />
              </div>


              <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.035em] text-[#111827] sm:text-[30px]">
                Payment Successful
              </h1>


              <p className="mx-auto mt-2 max-w-md text-[13px] font-medium leading-6 text-[#64748B]">
                Your payment has been completed successfully.
                Your hotel application is now waiting for
                administrative approval.
              </p>

            </div>


            {/* Details */}

            <div className="p-6 sm:p-8">

              <div className="rounded-xl border border-[#E3E5EC] bg-[#FAFAFD] p-5">

                <SummaryRow
                  label="Hotel"
                  value={hotelName}
                  icon={Building2}
                />

                <SummaryRow
                  label="Plan"
                  value={selectedPlan.planName}
                  icon={Sparkles}
                />

                <SummaryRow
                  label="Billing"
                  value={getBillingLabel(billingCycle)}
                  icon={ReceiptText}
                />

                <SummaryRow
                  label="Amount Paid"
                  value={formatCurrency(total)}
                  icon={CreditCard}
                  strong
                />

                <div className="mt-3 border-t border-[#E4E6EC] pt-3">

                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                    Transaction ID
                  </p>

                  <p className="mt-1 break-all text-[12px] font-bold text-[#087A58]">
                    {transactionId || "Generated successfully"}
                  </p>

                </div>

              </div>


              {/* Pending Notice */}

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-[#F4D99A] bg-[#FFF9E8] p-4">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF0C2] text-[#A16207]">
                  <Clock3 size={16} />
                </div>

                <div>

                  <p className="text-[12px] font-extrabold text-[#854D0E]">
                    Application Pending
                  </p>

                  <p className="mt-1 text-[11px] font-medium leading-5 text-[#A16207]">
                    Payment is complete, but your hotel account
                    will only be activated after SaaS admin approval.
                  </p>

                </div>

              </div>


              <button
                type="button"
                onClick={handleViewApplicationStatus}
                className="
                  mt-6
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#4338CA]
                  px-5
                  py-3.5
                  text-[13px]
                  font-bold
                  text-white
                  transition
                  hover:bg-[#3730A3]
                "
              >
                View Application Status
                <ArrowRight size={16} />
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
    <div className="min-h-screen bg-[#FAF9FF] text-[#111827]">

    

      {/* ======================================================
          PROGRESS
      ====================================================== */}

      <div className="border-b border-[#E4E5EC] bg-[#F3F2FA]">

        <div className=" max-w-7xl">

          <SaaSSetupProgress activeStep={3} />

        </div>

      </div>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-7 sm:px-6 lg:px-8">

        {/* PAGE HEADER */}

        <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

          <div>

            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAE9FF] px-3 py-1.5">

              <span className="h-1.5 w-1.5 rounded-full bg-[#4338CA]" />

              <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#4338CA]">
                Pre-Activation Checkout
              </span>

            </div>


            <h1 className="mt-3 text-[28px] font-bold tracking-[-0.04em] text-[#111827] sm:text-[34px]">
              Review Subscription & Checkout
            </h1>


            <p className="mt-2 max-w-2xl text-[13px] font-medium leading-6 text-[#64748B] sm:text-[14px]">
              Review your selected hotel plan, registration
              details and payable amount before completing payment.
            </p>

          </div>


          <div className="flex items-center gap-2 rounded-xl border border-[#DCE8E3] bg-[#F3FBF7] px-3.5 py-2.5">

            <LockKeyhole
              size={16}
              className="text-[#087A58]"
            />

            <span className="text-[10px] font-bold text-[#087A58]">
              Secure SaaS Onboarding
            </span>

          </div>

        </div>


        {/* ERROR */}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#F3C5C5] bg-[#FFF5F5] px-4 py-3.5">

            <Info
              size={17}
              className="mt-0.5 shrink-0 text-[#DC2626]"
            />

            <div>

              <p className="text-[12px] font-bold text-[#991B1B]">
                Checkout Error
              </p>

              <p className="mt-0.5 text-[11px] font-medium leading-5 text-[#B91C1C]">
                {error}
              </p>

            </div>

          </div>
        )}


        {/* ====================================================
            TWO COLUMN LAYOUT
        ==================================================== */}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">


          {/* ==================================================
              LEFT
          ================================================== */}

          <div className="space-y-6 lg:col-span-7">


            {/* =================================================
                SELECTED PLAN
            ================================================= */}

            <section className="rounded-2xl border border-[#E1E3EA] bg-white">

              <div className="border-b border-[#E6E7ED] px-5 py-5 sm:px-6">

                <div className="flex flex-wrap items-start justify-between gap-4">

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                      Tier Architecture
                    </p>

                    <h2 className="mt-1 text-[20px] font-bold tracking-[-0.025em] text-[#111827]">
                      Selected Plan
                    </h2>

                  </div>


                  <div className="inline-flex items-center gap-2 rounded-full border border-[#DDF7EC] bg-[#F0FDF7] px-3 py-1.5">

                    <span className="h-1.5 w-1.5 rounded-full bg-[#087A58]" />

                    <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#087A58]">
                      Active Tier
                    </span>

                  </div>

                </div>

              </div>


              <div className="p-5 sm:p-6">

                {/* Pricing */}

                <div className="rounded-xl border border-[#E0E0F2] bg-[#F6F5FF] p-4">

                  <div className="flex flex-wrap items-end justify-between gap-4">

                    <div>

                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                        Subscription Rate
                      </p>

                      <div className="mt-1 flex items-end gap-1.5">

                        <span className="text-[30px] font-extrabold tracking-[-0.04em] text-[#4338CA]">
                          {formatCurrency(price)}
                        </span>

                        <span className="pb-1 text-[12px] font-semibold text-[#64748B]">
                          / {billingCycle === "yearly"
                            ? "year"
                            : billingCycle === "monthly"
                            ? "month"
                            : "cycle"}
                        </span>

                      </div>

                    </div>


                    <div className="rounded-lg bg-[#EAE9FF] px-3 py-1.5 text-[10px] font-bold text-[#4338CA]">
                      {getBillingLabel(billingCycle)} Billing
                    </div>

                  </div>

                </div>


                {/* Plan name */}

                <div className="mt-5">

                  <div className="flex items-center gap-3">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEEEFF] text-[#4338CA]">
                      <Sparkles size={19} />
                    </div>

                    <div>

                      <p className="text-[16px] font-extrabold text-[#111827]">
                        {selectedPlan.planName}
                      </p>

                      {selectedPlan.description && (
                        <p className="mt-0.5 text-[11px] font-medium text-[#64748B]">
                          {selectedPlan.description}
                        </p>
                      )}

                    </div>

                  </div>

                </div>


                {/* Limits */}

                <div className="mt-6">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                    Plan Entitlements
                  </p>


                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">

                    <PlanLimit
                      icon={Building2}
                      label="Rooms"
                      value={selectedPlan?.limits?.rooms}
                    />

                    <PlanLimit
                      icon={Landmark}
                      label="Branches"
                      value={selectedPlan?.limits?.branches}
                    />

                    <PlanLimit
                      icon={Users}
                      label="Staff Access"
                      value={selectedPlan?.limits?.receptionists}
                    />

                  </div>

                </div>


                {/* Features */}

                {selectedPlan.features && (
                  <div className="mt-6">

                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                      Included Features
                    </p>


                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">

                      <FeatureItem
                        icon={Utensils}
                        label="Food Service"
                        enabled={
                          selectedPlan
                            ?.features
                            ?.foodService
                        }
                      />

                      <FeatureItem
                        icon={ReceiptText}
                        label="Room Service"
                        enabled={
                          selectedPlan
                            ?.features
                            ?.roomService
                        }
                      />

                    </div>

                  </div>
                )}

              </div>

            </section>


            {/* =================================================
                HOTEL PROFILE
            ================================================= */}

            <section className="rounded-2xl border border-[#E1E3EA] bg-white">

              <div className="border-b border-[#E6E7ED] px-5 py-5 sm:px-6">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                      Entity Verification
                    </p>

                    <h2 className="mt-1 text-[20px] font-bold tracking-[-0.025em] text-[#111827]">
                      Registered Hotel Profile
                    </h2>

                  </div>


                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      rounded-lg
                      px-2.5
                      py-2
                      text-[11px]
                      font-bold
                      text-[#4338CA]
                      transition
                      hover:bg-[#F3F2FF]
                    "
                  >
                    <ArrowLeft size={14} />
                    Edit
                  </button>

                </div>

              </div>


              <div className="p-5 sm:p-6">

                {/* Hotel Identity */}

                <div className="rounded-xl border border-[#E0E2EA] bg-[#FAFAFD] p-5">

                  <div className="flex items-start gap-4">

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#4338CA] text-white">
                      <Hotel size={22} />
                    </div>

                    <div className="min-w-0">

                      <p className="text-[19px] font-extrabold tracking-[-0.025em] text-[#111827]">
                        {hotelName}
                      </p>

                      <p className="mt-1 flex items-start gap-1.5 text-[11px] font-medium leading-5 text-[#64748B]">

                        <MapPin
                          size={14}
                          className="mt-0.5 shrink-0 text-[#4338CA]"
                        />

                        <span>
                          {addressText ||
                            "Registered hotel address"}
                        </span>

                      </p>

                    </div>

                  </div>

                </div>


                {/* Owner + Tax */}

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                  <ProfileInfo
                    icon={User}
                    label="Authorized Hotel Owner"
                    value={ownerName}
                  />

                  <ProfileInfo
                    icon={ReceiptText}
                    label="GST / Tax ID"
                    value={
                      gstNumber ||
                      "Not provided"
                    }
                  />

                </div>


                {/* Contact */}

                <div className="mt-3 rounded-xl border border-[#E1E3EA] bg-white p-4">

                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                    Contact Information
                  </p>


                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <ContactValue
                      icon={Mail}
                      value={
                        ownerEmail ||
                        "Email not available"
                      }
                    />

                    <ContactValue
                      icon={Users}
                      value={
                        ownerPhone ||
                        "Phone not available"
                      }
                    />

                  </div>

                </div>


                {/* Verification */}

                <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#DCEBE4] bg-[#F3FBF7] p-4">

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDF7EC] text-[#087A58]">
                    <Check size={16} />
                  </div>

                  <div>

                    <p className="text-[12px] font-extrabold text-[#065F46]">
                      Registration Details Ready
                    </p>

                    <p className="mt-1 text-[11px] font-medium leading-5 text-[#087A58]">
                      Your hotel information will be
                      submitted for admin review after payment.
                    </p>

                  </div>

                </div>

              </div>

            </section>


            {/* =================================================
                PAYMENT ENVIRONMENT
            ================================================= */}

            <section className="rounded-2xl border border-[#E1E3EA] bg-white p-5 sm:p-6">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEEEFF] text-[#4338CA]">
                  <ShieldCheck size={19} />
                </div>

                <div>

                  <h3 className="text-[14px] font-bold text-[#111827]">
                    Demo Payment Environment
                  </h3>

                  <p className="mt-1 text-[11px] font-medium leading-5 text-[#64748B]">
                    This checkout currently uses your demo payment
                    flow. No real money will be charged. A transaction
                    ID will be generated when payment is confirmed.
                  </p>

                </div>

              </div>

            </section>

          </div>


          {/* ==================================================
              RIGHT SUMMARY
          ================================================== */}

          <aside className="lg:col-span-5">

            <div className="lg:sticky lg:top-5">

              <section className="overflow-hidden rounded-2xl border border-[#DCDDE7] bg-white">

                {/* Summary Header */}

                <div className="border-b border-[#E4E5EB] px-5 py-5 sm:px-6">

                  <div className="flex items-center justify-between gap-4">

                    <div>

                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                        Billing Ledger
                      </p>

                      <h2 className="mt-1 text-[20px] font-bold tracking-[-0.025em] text-[#111827]">
                        Order Summary
                      </h2>

                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EEEEFF] text-[#4338CA]">
                      <ReceiptText size={18} />
                    </div>

                  </div>

                </div>


                {/* Summary Body */}

                <div className="p-5 sm:p-6">

                  <div className="space-y-4">

                    {/* Plan */}

                    <SummaryPriceRow
                      label={selectedPlan.planName}
                      description={`${getBillingLabel(
                        billingCycle
                      )} subscription`}
                      value={price}
                    />


                    {/* Setup */}

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-[12px] font-semibold text-[#334155]">
                          Platform Setup Fee
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium text-[#94A3B8]">
                          Initial platform provisioning
                        </p>

                      </div>

                      <div className="text-right">

                        {setupFee > 0 ? (
                          <span className="text-[12px] font-bold text-[#111827]">
                            {formatCurrency(setupFee)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#DDF7EC] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.06em] text-[#087A58]">
                            Free
                          </span>
                        )}

                      </div>

                    </div>


                    {/* Tax */}

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-[12px] font-semibold text-[#334155]">
                          Tax
                        </p>

                        <p className="mt-0.5 text-[10px] font-medium text-[#94A3B8]">
                          Current checkout calculation
                        </p>

                      </div>

                      <span className="text-[12px] font-bold text-[#111827]">
                        {formatCurrency(tax)}
                      </span>

                    </div>

                  </div>


                  {/* Total */}

                  <div className="my-5 rounded-xl border border-[#DAD8F5] bg-[#F4F3FF] p-4">

                    <div className="flex items-center justify-between gap-4">

                      <div>

                        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#64748B]">
                          Total Due Today
                        </p>

                        <p className="mt-1 text-[28px] font-extrabold tracking-[-0.04em] text-[#4338CA]">
                          {formatCurrency(total)}
                        </p>

                      </div>


                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E6E4FF] text-[#4338CA]">
                        <CreditCard size={19} />
                      </div>

                    </div>

                  </div>


                  {/* Payment Notice */}

                  <div className="flex items-start gap-3 rounded-xl border border-[#E0E2EA] bg-[#FAFAFD] p-4">

                    <Info
                      size={17}
                      className="mt-0.5 shrink-0 text-[#4338CA]"
                    />

                    <div>

                      <p className="text-[11px] font-extrabold text-[#334155]">
                        Before you continue
                      </p>

                      <p className="mt-1 text-[10px] font-medium leading-5 text-[#64748B]">
                        Payment marks your registration as paid.
                        Your hotel is then submitted to the SaaS
                        admin for review and activation.
                      </p>

                    </div>

                  </div>


                  {/* Pay Button */}

                  <button
                    type="button"
                    onClick={handlePayNow}
                    disabled={isPaying}
                    className="
                      mt-5
                      flex
                      cursor-pointer
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-[#4338CA]
                      px-5
                      py-3.5
                      text-[13px]
                      font-extrabold
                      text-white
                      transition
                      hover:bg-[#3730A3]
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                    "
                  >

                    <CreditCard size={17} />

                    Pay Now

                    <span className="ml-1">
                      {formatCurrency(total)}
                    </span>

                    <ArrowRight
                      size={16}
                      className="ml-auto"
                    />

                  </button>


                  {/* Back */}

                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="
                      mt-3
                      cursor-pointer
                      flex
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-[#D9DDE7]
                      bg-white
                      px-5
                      py-3
                      text-[12px]
                      font-bold
                      text-[#475569]
                      transition
                      hover:border-[#B8B5E8]
                      hover:bg-[#F8F7FF]
                      hover:text-[#4338CA]
                    "
                  >
                    <ArrowLeft size={15} />
                    Back to Hotel Details
                  </button>


                  {/* Security */}

                  <div className="mt-5 flex items-center justify-center gap-2 border-t border-[#E6E7ED] pt-4">

                    <LockKeyhole
                      size={13}
                      className="text-[#087A58]"
                    />

                    <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                      Secure SaaS Registration
                    </span>

                  </div>

                </div>

              </section>


           

            </div>

          </aside>

        </div>

      </main>


      {/* ======================================================
          PAYMENT MODAL
      ====================================================== */}

      {isPaymentModalOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/55 px-4 py-5">

          <div className="absolute inset-0" />

          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[#DCDDE7] bg-white">

            {/* Modal Header */}

            <div className="border-b border-[#E5E6EC] bg-[#F7F6FF] px-5 py-5 sm:px-6">

              <div className="flex items-start justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4338CA] text-white">
                    <CreditCard size={19} />
                  </div>

                  <div>

                    <p className="text-[16px] font-extrabold tracking-[-0.02em] text-[#111827]">
                      Confirm Payment
                    </p>

                    <p className="mt-0.5 text-[10px] font-medium text-[#64748B]">
                      Review your payment before confirmation.
                    </p>

                  </div>

                </div>


                <button
                  type="button"
                  disabled={isPaying}
                  onClick={() =>
                    setIsPaymentModalOpen(false)
                  }
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    bg-white
                    text-[#64748B]
                    transition
                    hover:bg-[#ECECF2]
                    disabled:opacity-50
                  "
                >
                  <X size={16} />
                </button>

              </div>

            </div>


            {/* Modal Body */}

            <div className="p-5 sm:p-6">

              {/* Amount */}

              <div className="rounded-xl border border-[#DCD9F6] bg-[#F5F4FF] p-4">

                <div className="flex items-center justify-between gap-4">

                  <div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                      Payable Total
                    </p>

                    <p className="mt-1 text-[27px] font-extrabold tracking-[-0.04em] text-[#4338CA]">
                      {formatCurrency(total)}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
                      Billing
                    </p>

                    <p className="mt-1 text-[12px] font-extrabold text-[#334155]">
                      {getBillingLabel(billingCycle)}
                    </p>

                  </div>

                </div>

              </div>


              {/* Details */}

              <div className="mt-4 rounded-xl border border-[#E1E3EA] bg-[#FAFAFD] p-4">

                <ModalRow
                  label="Hotel"
                  value={hotelName}
                />

                <ModalRow
                  label="Plan"
                  value={selectedPlan.planName}
                />

                <ModalRow
                  label="Billing Cycle"
                  value={getBillingLabel(billingCycle)}
                />

                <ModalRow
                  label="Amount"
                  value={formatCurrency(total)}
                  last
                  strong
                />

              </div>


              {/* Important Notice */}

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#D9E1F4] bg-[#F3F6FF] p-4">

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5E9FF] text-[#4338CA]">
                  <Info size={16} />
                </div>

                <div>

                  <p className="text-[11px] font-extrabold text-[#1E3A8A]">
                    Application Approval Notice
                  </p>

                  <p className="mt-1 text-[10px] font-medium leading-5 text-[#475569]">
                    After confirmation, your payment will be
                    marked as paid and your hotel application
                    will be sent to the SaaS admin for approval.
                  </p>

                </div>

              </div>


              {/* Actions */}

              <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row">

                <button
                  type="button"
                  disabled={isPaying}
                  onClick={() =>
                    setIsPaymentModalOpen(false)
                  }
                  className="
                    flex
                    cursor-pointer
                    w-full
                    items-center
                    justify-center
                    rounded-xl
                    border
                    border-[#D9DDE7]
                    bg-white
                    px-4
                    py-3
                    text-[12px]
                    font-bold
                    text-[#475569]
                    transition
                    hover:bg-[#F8F8FA]
                    disabled:opacity-50
                    sm:w-1/2
                  "
                >
                  Cancel
                </button>


                <button
                  type="button"
                  disabled={isPaying}
                  onClick={handleConfirmPayment}
                  className="
                    flex
                    cursor-pointer
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#4338CA]
                    px-4
                    py-3
                    text-[12px]
                    font-extrabold
                    text-white
                    transition
                    hover:bg-[#3730A3]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    sm:w-1/2
                  "
                >

                  {isPaying ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      Confirm Payment
                    </>
                  )}

                </button>

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

const PlanLimit = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-[#E1E3EA] bg-[#FAFAFD] p-3">

      <div className="flex items-center gap-2">

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEEEFF] text-[#4338CA]">
          <Icon size={15} />
        </div>

        <div className="min-w-0">

          <p className="text-[10px] font-semibold text-[#64748B]">
            {label}
          </p>

          <p className="mt-0.5 truncate text-[14px] font-extrabold text-[#111827]">
            {value ?? 0}
          </p>

        </div>

      </div>

    </div>
  );
};


// ============================================================
// FEATURE ITEM
// ============================================================

const FeatureItem = ({
  icon: Icon,
  label,
  enabled,
}) => {
  return (
    <div
      className={`
        flex
        items-center
        gap-2.5
        rounded-xl
        border
        px-3
        py-3
        ${
          enabled
            ? "border-[#DCEBE4] bg-[#F5FCF8]"
            : "border-[#E5E7EB] bg-[#FAFAFD]"
        }
      `}
    >

      <div
        className={`
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          ${
            enabled
              ? "bg-[#DDF7EC] text-[#087A58]"
              : "bg-[#EEF0F3] text-[#94A3B8]"
          }
        `}
      >
        <Icon size={15} />
      </div>


      <div className="min-w-0">

        <p
          className={`
            text-[11px]
            font-bold
            ${
              enabled
                ? "text-[#334155]"
                : "text-[#94A3B8]"
            }
          `}
        >
          {label}
        </p>

        <p
          className={`
            mt-0.5
            text-[9px]
            font-semibold
            ${
              enabled
                ? "text-[#087A58]"
                : "text-[#94A3B8]"
            }
          `}
        >
          {enabled ? "Included" : "Not included"}
        </p>

      </div>


      <div className="ml-auto shrink-0">

        {enabled ? (
          <CheckCircle2
            size={15}
            className="text-[#087A58]"
          />
        ) : (
          <span className="text-[10px] font-bold text-[#94A3B8]">
            —
          </span>
        )}

      </div>

    </div>
  );
};


// ============================================================
// PROFILE INFO
// ============================================================

const ProfileInfo = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-[#E1E3EA] bg-[#FAFAFD] p-4">

      <div className="flex items-start gap-3">

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEEEFF] text-[#4338CA]">
          <Icon size={15} />
        </div>

        <div className="min-w-0">

          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#64748B]">
            {label}
          </p>

          <p className="mt-1 break-words text-[12px] font-bold text-[#111827]">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
};


// ============================================================
// CONTACT VALUE
// ============================================================

const ContactValue = ({
  icon: Icon,
  value,
}) => {
  return (
    <div className="flex min-w-0 items-center gap-2.5">

      <Icon
        size={14}
        className="shrink-0 text-[#4338CA]"
      />

      <span className="truncate text-[11px] font-semibold text-[#475569]">
        {value}
      </span>

    </div>
  );
};


// ============================================================
// SUMMARY PRICE ROW
// ============================================================

const SummaryPriceRow = ({
  label,
  description,
  value,
}) => {
  return (
    <div className="flex items-start justify-between gap-4">

      <div className="min-w-0">

        <p className="text-[12px] font-bold text-[#334155]">
          {label}
        </p>

        <p className="mt-0.5 text-[10px] font-medium text-[#94A3B8]">
          {description}
        </p>

      </div>

      <span className="shrink-0 text-[12px] font-extrabold text-[#111827]">
        {formatCurrency(value)}
      </span>

    </div>
  );
};


// ============================================================
// SUMMARY ROW
// ============================================================

const SummaryRow = ({
  label,
  value,
  icon: Icon,
  strong = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#E4E6EC] py-3 last:border-b-0">

      <div className="flex min-w-0 items-center gap-2">

        {Icon && (
          <Icon
            size={14}
            className="shrink-0 text-[#64748B]"
          />
        )}

        <span className="text-[11px] font-medium text-[#64748B]">
          {label}
        </span>

      </div>

      <span
        className={`
          max-w-[60%]
          break-words
          text-right
          ${
            strong
              ? "text-[13px] font-extrabold text-[#111827]"
              : "text-[11px] font-bold text-[#334155]"
          }
        `}
      >
        {value}
      </span>

    </div>
  );
};


// ============================================================
// MODAL ROW
// ============================================================

const ModalRow = ({
  label,
  value,
  last = false,
  strong = false,
}) => {
  return (
    <div
      className={`
        flex
        items-center
        justify-between
        gap-4
        py-2.5
        ${
          !last
            ? "border-b border-[#E5E7EB]"
            : ""
        }
      `}
    >

      <span className="text-[11px] font-medium text-[#64748B]">
        {label}
      </span>

      <span
        className={`
          max-w-[60%]
          break-words
          text-right
          ${
            strong
              ? "text-[13px] font-extrabold text-[#111827]"
              : "text-[11px] font-bold text-[#334155]"
          }
        `}
      >
        {value}
      </span>

    </div>
  );
};


export default SaaSUserCheckout;