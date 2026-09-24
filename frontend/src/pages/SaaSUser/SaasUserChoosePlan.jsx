import React, { useEffect, useState } from "react";
import SaaSSetupProgress from "./SaaSSetupProgress";

import {
  Check,
  ArrowRight,
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { getPublicActivePlans } from "../../service/planApi";

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

  const [billingCycle, setBillingCycle] =
    useState("monthly");

  // ==========================================================
  // FETCH PLANS
  // ==========================================================

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await getPublicActivePlans();

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Unable to load subscription plans."
        );
      }

      const fetchedPlans =
        Array.isArray(response?.data)
          ? response.data
          : Array.isArray(
              response?.data?.plans
            )
          ? response.data.plans
          : Array.isArray(
              response?.plans
            )
          ? response.plans
          : [];

      setPlans(fetchedPlans);

      if (
        fetchedPlans.length > 0 &&
        !selectedPlan
      ) {
        setSelectedPlan(
          fetchedPlans[0]
        );
      }
    } catch (err) {
      console.error(
        "Get public plans error:",
        err
      );

      setError(
        err?.message ||
          err?.data?.message ||
          "Unable to load subscription plans."
      );
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

  const handleContinue = () => {
    if (!selectedPlan?._id) {
      setError(
        "Please select a plan to continue."
      );
      return;
    }

    sessionStorage.setItem(
      "saasSelectedPlan",
      JSON.stringify(selectedPlan)
    );

    sessionStorage.setItem(
      "saasBillingCycle",
      billingCycle
    );

    navigate(
      "/saas-user/registration",
      {
        state: {
          selectedPlan: selectedPlan,
          billingCycle: billingCycle,
        },
      }
    );
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center px-4">
        <div className="flex flex-col items-center">
          <Loader2
            size={34}
            className="text-[#4338CA] animate-spin"
          />

          <p className="mt-4 text-sm font-medium text-[#59647C]">
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
    <div className="min-h-screen bg-[#F8F7FF] text-[#101936] pb-28">

      {/* =====================================================
          TOP HEADER
      ===================================================== */}

      <header className="h-[58px] border-b border-[#E8E5F5] bg-white">


<SaaSSetupProgress activeStep={1} />

        <div className="h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

          {/* LOGO AREA */}

          <div className="flex items-center gap-2.5">

            <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
              <Building2
                size={17}
                className="text-white"
              />
            </div>

            <span className="text-sm sm:text-base font-bold tracking-[-0.02em] text-[#101936]">
              Hotel Management SaaS
            </span>

          </div>

       

        </div>

      </header>

      {/* =====================================================
          MAIN CONTAINER
      ===================================================== */}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ===================================================
            HEADER
        =================================================== */}

      <section className="pt-7 sm:pt-9">

  <div className="flex flex-col items-center gap-5">

    {/* TITLE */}

    <div className="text-center">
      <h1 className="mt-2 text-[27px] sm:text-[34px] lg:text-[39px] leading-[1.05] font-bold tracking-[-0.045em] text-[#101936]">
        Choose Your Plan
      </h1>

      <p className="mt-2 text-xs sm:text-sm leading-5 text-[#59647C]">
        Select the subscription plan that best fits your hotel's needs.
      </p>
    </div>

    {/* BILLING SWITCH */}

    {plans.length > 0 && (
      <div className="flex justify-center">

        <div className="inline-flex items-center gap-0.5 rounded-xl bg-[#E9E7FF] p-1">

          <BillingButton
            label="Monthly"
            active={billingCycle === "monthly"}
            onClick={() =>
              setBillingCycle("monthly")
            }
          />

          <BillingButton
            label="Quarterly"
            active={billingCycle === "quarterly"}
            onClick={() =>
              setBillingCycle("quarterly")
            }
          />

          <BillingButton
            label="Half Yearly"
            active={billingCycle === "halfYearly"}
            onClick={() =>
              setBillingCycle("halfYearly")
            }
          />

          <BillingButton
            label="Yearly"
            active={billingCycle === "yearly"}
            onClick={() =>
              setBillingCycle("yearly")
            }
          />

        </div>

      </div>
    )}

  </div>

</section>

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3">

            <AlertCircle
              size={18}
              className="text-red-600 shrink-0 mt-0.5"
            />

            <div className="flex-1 min-w-0">

              <p className="text-xs sm:text-sm font-bold text-red-800">
                Unable to load plans
              </p>

              <p className="mt-1 text-xs sm:text-sm text-red-700">
                {error}
              </p>

            </div>

            <button
              type="button"
              onClick={fetchPlans}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-red-700 hover:text-red-900"
            >
              <RefreshCw size={14} />
              Retry
            </button>

          </div>
        )}

        {/* ===================================================
            NO PLANS
        =================================================== */}

        {!error &&
          plans.length === 0 && (
            <div className="mt-8 rounded-2xl border border-[#E8E5F5] bg-white p-10 sm:p-14 text-center">

              <Building2
                size={40}
                className="mx-auto text-[#69728A]"
              />

              <h2 className="mt-4 text-lg font-bold text-[#101936]">
                No Plans Available
              </h2>

              <p className="mt-2 text-sm text-[#69728A]">
                There are currently no active subscription plans.
              </p>

            </div>
          )}

        {/* ===================================================
            PLANS
        =================================================== */}

        {plans.length > 0 && (
        <section className="mt-7 sm:mt-9">

  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

    {[...plans]
      .sort((a, b) => {
        const priceA = Number(
          getPlanPrice(a, billingCycle) || 0
        );

        const priceB = Number(
          getPlanPrice(b, billingCycle) || 0
        );

        return priceA - priceB;
      })
      .map((plan, index) => {

        const price = getPlanPrice(
          plan,
          billingCycle
        );

        const isSelected =
          selectedPlan?._id === plan._id;

        return (
          <div
            key={plan._id}
            onClick={() => setSelectedPlan(plan)}
            className={`
              group
              relative
              flex
              flex-col
              min-h-[455px]
              bg-white
              rounded-[18px]
              border
              cursor-pointer
              overflow-hidden
              transition-all
              duration-200
              ${
                isSelected
                  ? "border-[#4338CA] border-2"
                  : "border-[#E1E3EC] hover:border-[#B7B9D9]"
              }
            `}
          >

            {/* =====================================================
                SELECTED TOP ACCENT
            ===================================================== */}

            {isSelected && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#4338CA]" />
            )}

            {/* =====================================================
                RECOMMENDED BADGE
            ===================================================== */}

            {index === 1 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-[#4338CA] text-white px-4 py-2 rounded-b-lg text-[8px] font-bold tracking-wide whitespace-nowrap">
                  ★ RECOMMENDED • MOST POPULAR
                </div>
              </div>
            )}

            {/* =====================================================
                CARD CONTENT
            ===================================================== */}

            <div className="flex flex-col flex-1 p-5 sm:p-6">

              {/* ===================================================
                  HEADER
              =================================================== */}

              <div className="flex items-start justify-between gap-4">

                <div className="min-w-0">

                  <div className="flex items-center gap-2 flex-wrap">

                    <h2 className="text-[20px] sm:text-[22px] font-bold tracking-[-0.025em] text-[#111827]">
                      {plan.planName}
                    </h2>

                    {isSelected && (
                      <span className="inline-flex items-center rounded-full bg-[#EDE9FE] px-2 py-0.5 text-[9px] font-bold text-[#4338CA]">
                        Selected
                      </span>
                    )}

                  </div>

                  {plan.description && (
                    <p className="mt-1 text-sm font-medium leading-5 text-[#64748B]">
                      {plan.description}
                    </p>
                  )}

                </div>

                {/* PLAN ICON */}

                <div
                  className={`
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    ${
                      isSelected
                        ? "bg-[#4338CA] text-white"
                        : "bg-[#EEF0FF] text-[#4338CA]"
                    }
                  `}
                >
                  {isSelected ? (
                    <Check
                      size={19}
                      strokeWidth={2.7}
                    />
                  ) : (
                    <Building2
                      size={19}
                      strokeWidth={2}
                    />
                  )}
                </div>

              </div>

              {/* ===================================================
                  PRICE
              =================================================== */}

              <div className="mt-7">

                <div className="flex items-end">

                  <span className="text-[34px] sm:text-[38px] font-extrabold leading-none tracking-[-0.055em] text-[#0F172A]">
                    {formatCurrency(price)}
                  </span>

                  <span className="mb-1.5 ml-1.5 text-sm font-medium text-[#64748B]">
                    / {getBillingLabel(billingCycle)}
                  </span>

                </div>

                <div className="mt-2 flex items-center gap-1.5">

                  <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" />

                  <span className="text-[10px] font-semibold text-[#047857]">
                    Billed as per chosen frequency
                  </span>

                </div>

              </div>

              {/* ===================================================
                  TRIAL
              =================================================== */}

              {Number(plan.trialDays || 0) > 0 && (
                <div className="mt-3 self-start">

                  <span className="inline-flex items-center rounded-lg bg-[#ECFDF5] px-2.5 py-1 text-[10px] font-bold text-[#047857]">
                    {plan.trialDays} days free trial
                  </span>

                </div>
              )}

              {/* ===================================================
                  DIVIDER
              =================================================== */}

              <div className="my-6 h-px bg-[#E8EAF1]" />

              {/* ===================================================
                  LIMITS
              =================================================== */}

              <div className="rounded-xl border border-[#E2E4F1] bg-[#F6F6FF] px-3 py-4">

                <div className="grid grid-cols-3 divide-x divide-[#DCDFF0]">

                  <PlanLimit
                    label="Rooms"
                    value={
                      plan?.limits?.rooms
                    }
                  />

                  <PlanLimit
                    label="Branches"
                    value={
                      plan?.limits?.branches
                    }
                  />

                  <PlanLimit
                    label="Receptionists"
                    value={
                      plan?.limits?.receptionists
                    }
                  />

                </div>

              </div>

              {/* ===================================================
                  FEATURES
              =================================================== */}

              <div className="mt-6">

                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#475569]">
                  Included Capabilities
                </p>

                <div className="mt-3 space-y-3">

                  {/* EXISTING TEXT — NOT CHANGED */}

                  <Feature
                    label="Food Service"
                    enabled={
                      plan?.features
                        ?.foodService
                    }
                  />

                  {/* EXISTING TEXT — NOT CHANGED */}

                  <Feature
                    label="Room Service"
                    enabled={
                      plan?.features
                        ?.roomService
                    }
                  />

                </div>

              </div>

              {/* ===================================================
                  BUTTON
              =================================================== */}

              <div className="mt-auto pt-7">

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();

                    setSelectedPlan(plan);
                  }}
                  className={`
                    w-full
                    cursor-pointer
                    h-11
                    rounded-xl
                    text-sm
                    font-bold
                    flex
                    items-center
                    justify-center
                    gap-2
                    transition-colors
                    ${
                      isSelected
                        ? "bg-[#4338CA] text-white hover:bg-[#3730A3]"
                        : "bg-[#E4E8FF] text-[#172033] hover:bg-[#D9DEFF]"
                    }
                  `}
                >

                  {isSelected && (
                    <Check
                      size={15}
                      strokeWidth={3}
                    />
                  )}

                  {isSelected
                    ? "Selected"
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

      {/* =====================================================
          BOTTOM SELECTED PLAN BAR
      ===================================================== */}

      {selectedPlan && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E5E1F3] bg-white/95 backdrop-blur-md shadow-[0_-5px_20px_rgba(39,35,91,0.08)]">

          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

              {/* SELECTED PLAN */}

              <div className="flex items-center gap-2.5 min-w-0">

                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#4338CA] flex items-center justify-center shrink-0">

                  <Check
                    size={16}
                    className="text-white"
                  />

                </div>

                <div className="min-w-0">

                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.08em] text-[#69728A]">
                    Selected
                  </p>

                  <p className="text-xs sm:text-sm font-bold text-[#101936] truncate">
                    {selectedPlan.planName}
                    {" • "}
                    {formatCurrency(
                      getPlanPrice(
                        selectedPlan,
                        billingCycle
                      )
                    )}
                    /
                    {getBillingLabel(
                      billingCycle
                    )}
                  </p>

                </div>

              </div>

              {/* CONTINUE */}

              <button
                type="button"
                onClick={
                  handleContinue
                }
                className="w-full cursor-pointer sm:w-auto min-w-[220px] px-5 py-2.5 rounded-lg bg-[#4338CA] hover:bg-[#3730A3] text-white text-xs sm:text-sm font-bold transition shadow-[0_4px_12px_rgba(67,56,202,0.22)] flex items-center justify-center gap-2"
              >
                Continue
                <ArrowRight
                  size={16}
                />
              </button>

            </div>

          </div>

        </div>
      )}
    </div>
  );
};

// ============================================================
// BILLING BUTTON
// ============================================================

const BillingButton = ({
  label,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        px-3 sm:px-4
        py-2
        rounded-lg
        text-[10px] sm:text-xs
        font-semibold
        transition-all
        whitespace-nowrap
        ${
          active
            ? "bg-white text-[#4338CA] shadow-[0_2px_6px_rgba(67,56,202,0.10)]"
            : "text-[#59647C] hover:text-[#29334D] hover:bg-white/60"
        }
      `}
    >
      {label}
    </button>
  );
};

// ============================================================
// PLAN LIMIT
// ============================================================

const PlanLimit = ({
  label,
  value,
}) => {
  const unlimited =
    Number(value || 0) === 0;

  return (
    <div className="text-center min-w-0">

      <p className="text-sm sm:text-base font-bold text-[#4338CA] truncate">
        {unlimited
          ? "Unlimited"
          : value}
      </p>

      <p className="mt-0.5 text-[9px] sm:text-[10px] text-[#59647C] truncate">
        {label}
      </p>

    </div>
  );
};

// ============================================================
// FEATURE
// ============================================================

const Feature = ({
  label,
  enabled,
}) => {
  return (
    <div className="flex items-center gap-2">

      <div
        className={`
          w-[17px]
          h-[17px]
          rounded-full
          flex
          items-center
          justify-center
          shrink-0
          ${
            enabled
              ? "bg-[#E1FAF0] text-[#087A58]"
              : "bg-[#F1F1F4] text-[#A3A7B4]"
          }
        `}
      >
        <Check size={11} />
      </div>

      <span
        className={`
          text-[11px] sm:text-xs
          leading-5
          ${
            enabled
              ? "text-[#29334D]"
              : "text-[#A3A7B4] line-through"
          }
        `}
      >
        {label}
      </span>

    </div>
  );
};

export default SaaSUserChoosePlan;