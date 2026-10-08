import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ArrowRight,
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { getPublicActivePlans } from "../../service/planApi";

import { useNavigate } from "react-router-dom";

import SaaSSetupProgress from "./SaaSSetupProgress";


// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const getBillingLabel = (cycle) => {
  switch (cycle) {
    case "monthly":
      return "month";

    case "quarterly":
      return "quarter";

    case "halfYearly":
      return "6 months";

    case "yearly":
      return "year";

    default:
      return "period";
  }
};

const getPlanPrice = (plan, cycle) => {
  return Number(plan?.pricing?.[cycle] || 0);
};

// ============================================================
// COMPONENT
// ============================================================

const SaaSUserChoosePlan = () => {

const navigate = useNavigate();
  // ==========================================================
  // STATE
  // ==========================================================

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");


  // ==========================================================
  // FETCH PLANS
  // ==========================================================

  const fetchPlans = async () => {
    try {
      setLoading(true);

      const response = await getPublicActivePlans();

      if (!response?.success) {
        throw new Error(response?.message || "Unable to load subscription plans.");
      }

      const fetchedPlans = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.plans)
        ? response.data.plans
        : Array.isArray(response?.plans)
        ? response.plans
        : [];

      setPlans(fetchedPlans);

      if (fetchedPlans.length > 0 && !selectedPlan) {
        setSelectedPlan(fetchedPlans[0]);
      }
    } catch (err) {
      console.error("Get public plans error:", err);

      setError(err?.message || err?.data?.message || "Unable to load subscription plans.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchPlans();
  }, []);



  // ==========================================================
  // CONTINUE
  // ==========================================================

  const handleContinue = (planObj) => {
    const planToUse = planObj || selectedPlan;

    if (!planToUse?._id) {
      setError("Please select a plan to continue.");
      return;
    }

    sessionStorage.setItem("saasSelectedPlan", JSON.stringify(planToUse));
    sessionStorage.setItem("saasBillingCycle", billingCycle);

    // New customer registration flow (no auto‑upgrade)
    sessionStorage.removeItem("saasIsUpgrade");
    sessionStorage.removeItem("saasHotelDetails");

    // Clear stale payment data from any previous registration so the new
    // hotel checkout doesn't incorrectly show "Payment Already Received"
    sessionStorage.removeItem("saasPaymentStatus");
    sessionStorage.removeItem("saasRegistrationId");
    sessionStorage.removeItem("saasRegistration");
    navigate("/saas-user/registration", {
      state: {
        selectedPlan: planToUse,
        billingCycle: billingCycle,
      },
    });
  };

  // ==========================================================
  // LOADING
  // ==========================================================

 if (loading) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{
        backgroundImage: `url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=85")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#06182F]/65" />

      {/* Loading content */}
      <div className="relative z-10 flex flex-col items-center rounded-2xl border border-white/20 bg-white/95 px-8 py-7 shadow-2xl backdrop-blur-sm">
        <Loader2
          size={34}
          className="animate-spin text-[#0B2447]"
        />

        <p className="mt-4 text-sm font-semibold text-[#0B2447]">
          Loading subscription plans...
        </p>
      </div>
    </div>
  );
}

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <>
                           <SaaSSetupProgress  />


<div
        className="relative min-h-screen overflow-hidden pb-28 font-sans text-[#10233F] antialiased sm:pb-24"
        style={{
  backgroundImage: `url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=85")`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
}}
      >
        <div className="absolute inset-0 bg-[#071B33]/58" />
        <main className="relative z-10 mx-auto w-full max-w-[1250px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
       

       
        {/* HEADER */}
        <section className="text-center">
          <h1 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-white sm:text-[32px] lg:text-[34px]">
Select Your Plan          </h1>

          <p className="mx-auto mt-2 max-w-2xl text-[13px] font-normal leading-5 text-white/85 sm:text-[14px]">
            
           Select the subscription plan that best fits your hotel's needs.
          </p>

          {/* BILLING SWITCH */}
          {plans.length > 0 && (
            <div className="mt-5 flex justify-center">
              <div className="inline-flex max-w-full items-center overflow-x-auto rounded-full border border-white/30 bg-white/95 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-md">
                <BillingButton
                  label="Monthly"
                  active={billingCycle === "monthly"}
                  onClick={() => setBillingCycle("monthly")}
                />
                <BillingButton
                  label="Quarterly"
                  active={billingCycle === "quarterly"}
                  onClick={() => setBillingCycle("quarterly")}
                />
                <BillingButton
                  label="Half Yearly"
                  active={billingCycle === "halfYearly"}
                  onClick={() => setBillingCycle("halfYearly")}
                />
                <BillingButton
                  label="Yearly"
                  sublabel="save 10%"
                  active={billingCycle === "yearly"}
                  onClick={() => setBillingCycle("yearly")}
                />
              </div>
            </div>
          )}
        </section>

        {/* ERROR */}
        {error && (
          <div className="mx-auto mt-7 flex max-w-3xl items-start gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-xl">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-600" />

            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#991B1B] sm:text-sm">Unable to load plans</p>

              <p className="mt-1 text-[12px] font-medium text-[#B91C1C] sm:text-[13px]">{error}</p>
            </div>

            <button
              type="button"
              onClick={fetchPlans}
              className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-bold text-[#991B1B] transition-colors hover:text-[#111111] sm:text-[13px]"
            >
              <RefreshCw size={14} />
              Retry
            </button>
          </div>
        )}

        {/* NO PLANS */}
        {!error && plans.length === 0 && (
          <div className="mx-auto mt-9 rounded-2xl border border-white/70 bg-white/80 p-10 text-center shadow-sm backdrop-blur-sm sm:p-14">
            <Building2 size={40} className="mx-auto text-[#66788F]" />

            <h2 className="mt-4 text-[19px] font-bold text-[#0B2447]">No Plans Available</h2>

            <p className="mt-2 text-[13px] font-medium text-[#52637A]">
              There are currently no active subscription plans.
            </p>
          </div>
        )}

        {/* PLANS */}
       {plans.length > 0 && (
  <section className="mt-8 sm:mt-10">
    <div className="mx-auto grid w-full max-w-[1120px] grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[...plans]
        .sort((a, b) => {
          const priceA = Number(getPlanPrice(a, billingCycle) || 0);
          const priceB = Number(getPlanPrice(b, billingCycle) || 0);

          return priceA - priceB;
        })
        .map((plan, planIndex) => {
          const price = getPlanPrice(plan, billingCycle);

       

          const limitValue = (value) =>
            Number(value || 0) === 0 ? "Unlimited" : value;

          /*
           * CLICK CARD
           * Select the plan and directly continue.
           */
          const handlePlanClick = () => {
            setSelectedPlan(plan);
            handleContinue(plan);
          };

          return (
            <div
              key={plan._id}
              className="flex min-w-0"
              style={{
                animation: `fadeUp 0.45s ease-out ${
                  planIndex * 0.08
                }s both`,
              }}
            >
              {/* =====================================================
                  PLAN CARD
              ====================================================== */}
              <div
                onClick={handlePlanClick}
                className="
                  group
                  relative
                  flex
                  min-h-[560px]
                  w-full
                  cursor-pointer
                  flex-col
                  overflow-hidden
                  rounded-2xl
                  border
                  border-[#E6E8ED]
                  bg-white
                  text-[#171717]
                  shadow-[0_5px_22px_rgba(15,23,42,0.06)]
                  transition-all
                  duration-300
                  ease-out

                  hover:-translate-y-1
                  hover:border-[#3B82F6]
                  hover:bg-[#F4F9FF]
                  hover:shadow-[0_18px_40px_rgba(37,99,235,0.16)]

                  active:translate-y-0
                  active:scale-[0.99]
                "
              >
                {/* =================================================
                    TOP BLUE ACCENT
                ================================================== */}
                <div
                  className="
                    pointer-events-none
                    absolute
                    left-0
                    right-0
                    top-0
                    h-[3px]
                    bg-gradient-to-r
                    from-[#60A5FA]
                    via-[#3B82F6]
                    to-[#2563EB]
                    opacity-0
                    transition-opacity
                    duration-300
                    group-hover:opacity-100
                  "
                />

                {/* =================================================
                    SOFT HOVER GLOW
                ================================================== */}
                <div
                  className="
                    pointer-events-none
                    absolute
                    -right-20
                    -top-20
                    h-44
                    w-44
                    rounded-full
                    bg-[#3B82F6]/10
                    blur-3xl
                    opacity-0
                    transition-opacity
                    duration-300
                    group-hover:opacity-100
                  "
                />

                {/* =================================================
                    TOP CONTENT
                ================================================== */}
                <div className="relative z-10 p-5 sm:p-6">
                  <div className="flex min-h-[28px] items-start justify-between gap-3">
                    <h2
                      className="
                        truncate
                        text-[18px]
                        font-bold
                        leading-6
                        tracking-[-0.02em]
                        text-[#171717]
                        transition-colors
                        duration-300
                        group-hover:text-[#1769D2]
                        sm:text-[19px]
                      "
                    >
                      {plan.planName}
                    </h2>

                 
                  </div>

                  {/* DESCRIPTION */}
                  <p
                    className="
                      mt-2
                      min-h-[40px]
                      text-[11px]
                      font-medium
                      leading-5
                      text-[#667085]
                      transition-colors
                      duration-300
                      group-hover:text-[#52677D]
                      sm:text-[12px]
                    "
                  >
                    {plan.description ||
                      "Get advanced features and flexibility. Perfect for frequent, professional use."}
                  </p>

                  {/* =================================================
                      PRICE
                  ================================================== */}
                  <div className="mt-6 flex items-end gap-1.5">
                    <span
                      className="
                        text-[31px]
                        font-extrabold
                        leading-none
                        tracking-[-0.045em]
                        text-[#171717]
                        transition-colors
                        duration-300
                        group-hover:text-[#1769D2]
                        sm:text-[34px]
                      "
                    >
                      {formatCurrency(price)}
                    </span>

                    <span
                      className="
                        mb-0.5
                        text-[10px]
                        font-semibold
                        text-[#7B8492]
                        sm:text-[11px]
                      "
                    >
                      per {getBillingLabel(billingCycle)}
                    </span>
                  </div>
                </div>

                {/* =================================================
                    DIVIDER
                ================================================== */}
                <div
                  className="
                    relative
                    z-10
                    h-px
                    bg-[#ECEEF2]
                    transition-colors
                    duration-300
                    group-hover:bg-[#D7E7FA]
                  "
                />

                {/* =================================================
                    FEATURES
                ================================================== */}
                <div
                  className="
                    relative
                    z-10
                    flex
                    flex-1
                    flex-col
                    px-5
                    py-5
                    sm:px-6
                    sm:py-6
                  "
                >
                  <p
                    className="
                      mb-4
                      text-[11px]
                      font-bold
                      uppercase
                      tracking-[0.04em]
                      text-[#344054]
                    "
                  >
                    Included with this plan
                  </p>

                  <div className="space-y-2.5">
                    {/* ROOMS */}
                    <PlanFeatureRow
                      label={`Up to ${limitValue(
                        plan?.limits?.rooms
                      )} rooms`}
                      selected={false}
                    />

                    {/* BRANCHES */}
                    <PlanFeatureRow
                      label={`Up to ${limitValue(
                        plan?.limits?.branches
                      )} branches`}
                      selected={false}
                    />

                    {/* RECEPTIONISTS */}
                    <PlanFeatureRow
                      label={`Up to ${limitValue(
                        plan?.limits?.receptionists
                      )} receptionists`}
                      selected={false}
                    />

                    {/* FOOD SERVICE */}
                    <PlanFeatureRow
                      label="Food Service"
                      enabled={plan?.features?.foodService}
                      selected={false}
                    />

                    {/* ROOM SERVICE */}
                    <PlanFeatureRow
                      label="Room Service"
                      enabled={plan?.features?.roomService}
                      selected={false}
                    />

                    {/* FREE TRIAL */}
                    {Number(plan.trialDays || 0) > 0 && (
                      <PlanFeatureRow
                        label={`${plan.trialDays} days free trial`}
                        selected={false}
                      />
                    )}
                  </div>

                  {/* =================================================
                      CTA
                  ================================================== */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();

                      setSelectedPlan(plan);
                      handleContinue(plan);
                    }}
                    className="
                      mt-auto
                      flex
                      h-11
                      w-full
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      border
                      border-[#D7DCE5]
                      bg-white
                      px-4
                      text-[11px]
                      font-bold
                      text-[#17324D]
                      shadow-[0_3px_10px_rgba(15,23,42,0.05)]
                      transition-all
                      duration-200

                      group-hover:border-[#3B82F6]
                      group-hover:bg-[#1769D2]
                      group-hover:text-white
                      group-hover:shadow-[0_8px_20px_rgba(37,99,235,0.18)]

                      active:scale-[0.98]

                      sm:text-[12px]
                    "
                  >
                    {price === 0
  ? "Get Started for Free"
  : "Select Plan"}


                  </button>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  </section>
)}

      </main>
    </div>
    </>
  );
};

// ============================================================
// PLAN FEATURE ROW
// ============================================================

const PlanFeatureRow = ({ label, enabled = true, selected = false }) => {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`
          mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full
          ${selected ? "text-white" : "text-[#7C3AED]"}
        `}
      >
        {enabled ? (
          <Check size={12} strokeWidth={3} />
        ) : (
          <span
            className={`text-[11px] font-bold ${
              selected ? "text-white/45" : "text-[#B6BAC3]"
            }`}
          >
            —
          </span>
        )}
      </span>

      <span
        className={`
          text-[12px] font-normal leading-5 sm:text-[13px]
          ${
            selected
              ? enabled
                ? "text-white"
                : "text-white/45"
              : enabled
              ? "text-[#272B32]"
              : "text-[#A3A7AF]"
          }
        `}
      >
        {label}
      </span>
    </div>
  );
};

// ============================================================
// BILLING BUTTON
// ============================================================

const BillingButton = ({ label, sublabel, active, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        shrink-0 cursor-pointer rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200
        sm:px-5 sm:py-2.5 sm:text-sm
        ${
          active
            ? "bg-gradient-to-r from-[#0B2447] to-[#12345F] text-white shadow-[0_4px_12px_rgba(11,36,71,0.30)]"
            : "text-[#52637A] hover:text-[#0B2447]"
        }
      `}
    >
      {label}
      {sublabel && (
        <span className={`ml-1 font-medium ${active ? "text-white/85" : "text-[#0B5CAD]"}`}>
          ({sublabel})
        </span>
      )}
    </button>
  );
};
    
    


    

export default SaaSUserChoosePlan;