import React, { useEffect, useState } from "react";
import {
  Check,
  CheckCircle2,
  ArrowRight,
  Building2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Gift,
  Clock,
  Zap,
} from "lucide-react";

import { getPublicActivePlans, getPublicFreeTrialConfig } from "../../service/planApi";

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
  const [freeTrialConfig, setFreeTrialConfig] = useState({ isEnabled: true, trialDays: 14 });


  // ==========================================================
  // FETCH PLANS & FREE TRIAL CONFIG
  // ==========================================================

  const fetchPlans = async () => {
    try {
      setLoading(true);

      const [plansRes, trialRes] = await Promise.allSettled([
        getPublicActivePlans(),
        getPublicFreeTrialConfig(),
      ]);

      if (plansRes.status === "fulfilled" && plansRes.value?.success) {
        const fetchedPlans = Array.isArray(plansRes.value?.data)
          ? plansRes.value.data
          : Array.isArray(plansRes.value?.data?.plans)
          ? plansRes.value.data.plans
          : Array.isArray(plansRes.value?.plans)
          ? plansRes.value.plans
          : [];

        setPlans(fetchedPlans);
        if (fetchedPlans.length > 0 && !selectedPlan) {
          setSelectedPlan(fetchedPlans[0]);
        }
      } else if (plansRes.status === "rejected") {
        throw new Error(plansRes.reason?.message || "Unable to load subscription plans.");
      }

      if (trialRes.status === "fulfilled" && trialRes.value?.success && trialRes.value?.data) {
        setFreeTrialConfig({
          isEnabled: Boolean(trialRes.value.data.isEnabled),
          trialDays: Number(trialRes.value.data.trialDays || 14),
        });
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
  // CONTINUE WITH PAID PLAN
  // ==========================================================

  const handleContinue = (planObj) => {
    const planToUse = planObj || selectedPlan;

    if (!planToUse?._id) {
      setError("Please select a plan to continue.");
      return;
    }

    sessionStorage.setItem("saasSelectedPlan", JSON.stringify(planToUse));
    sessionStorage.setItem("saasBillingCycle", billingCycle);
    sessionStorage.removeItem("saasIsFreeTrial");

    // New customer registration flow (no auto‑upgrade)
    sessionStorage.removeItem("saasIsUpgrade");
    sessionStorage.removeItem("saasHotelDetails");

    // Clear stale payment data from any previous registration
    sessionStorage.removeItem("saasPaymentStatus");
    sessionStorage.removeItem("saasRegistrationId");
    sessionStorage.removeItem("saasRegistration");
    navigate("/saas-user/registration", {
      state: {
        selectedPlan: planToUse,
        billingCycle: billingCycle,
        isFreeTrial: false,
      },
    });
  };

  // ==========================================================
  // CONTINUE WITH FREE TRIAL
  // ==========================================================

  const handleFreeTrialClick = () => {
    const defaultRefPlan = plans[0] || null;

    const trialPlanObj = {
      _id: defaultRefPlan?._id || "free-trial",
      planName: "Free Trial Plan",
      description: `Full access to all system features for ${freeTrialConfig.trialDays} days.`,
      trialDays: freeTrialConfig.trialDays,
      validityDays: freeTrialConfig.trialDays,
      isFreeTrial: true,
      pricing: {
        monthly: 0,
        quarterly: 0,
        halfYearly: 0,
        yearly: 0,
      },
      limits: {
        rooms: defaultRefPlan?.limits?.rooms || 50,
        branches: defaultRefPlan?.limits?.branches || 5,
        receptionists: defaultRefPlan?.limits?.receptionists || 10,
      },
      features: {
        foodService: true,
        roomService: true,
      },
    };

    sessionStorage.setItem("saasSelectedPlan", JSON.stringify(trialPlanObj));
    sessionStorage.setItem("saasBillingCycle", "trial");
    sessionStorage.setItem("saasIsFreeTrial", "true");

    sessionStorage.removeItem("saasIsUpgrade");
    sessionStorage.removeItem("saasHotelDetails");
    sessionStorage.removeItem("saasPaymentStatus");
    sessionStorage.removeItem("saasRegistrationId");
    sessionStorage.removeItem("saasRegistration");

    navigate("/saas-user/registration", {
      state: {
        selectedPlan: trialPlanObj,
        billingCycle: "trial",
        isFreeTrial: true,
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

        {/* FREE TRIAL OPTION BANNER */}
        {freeTrialConfig.isEnabled && (
       <div className="mx-auto mt-6 w-full max-w-[1120px] rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
    
    {/* Left content group */}
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
        <Sparkles size={20} />
      </div>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            {freeTrialConfig.trialDays}-Day Free Trial
          </span>
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            Instant Activation
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 tracking-tight">
          Try premium features completely free
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
          Get full access to hotel billing, room reservations, food orders, and room service. No credit card required.
        </p>
      </div>
    </div>

    {/* Right CTA group */}
    <div className="flex shrink-0 flex-col sm:flex-row items-start sm:items-center gap-4 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
      <div className="text-left sm:text-right">
        <div className="text-xl font-bold text-slate-900">₹0</div>
        <div className="text-xs text-slate-500">For {freeTrialConfig.trialDays} days</div>
      </div>

      <button
        type="button"
        onClick={handleFreeTrialClick}
        className="w-full cursor-pointer sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        <span>Start Free Trial</span>
        <ArrowRight size={16} className="text-slate-400" />
      </button>
    </div>

  </div>
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
    group relative flex min-h-[500px] w-full cursor-pointer flex-col overflow-hidden 
    rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 text-slate-900 
    shadow-sm transition-all duration-200 ease-out 
    hover:-translate-y-1 hover:border-slate-300 hover:shadow-md active:translate-y-0
  "
>
  {/* Header: Plan Name & Description */}
  <div className="flex flex-col">
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 transition-colors group-hover:text-indigo-600">
        {plan.planName}
      </h2>
      {Number(plan.trialDays || 0) > 0 && (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
          {plan.trialDays}d Trial
        </span>
      )}
    </div>

    <p className="mt-2 min-h-[38px] text-xs sm:text-sm text-slate-500 leading-relaxed">
      {plan.description || "Get advanced features and flexibility. Perfect for frequent, professional use."}
    </p>

    {/* Price Section */}
    <div className="mt-5 flex items-baseline gap-1">
      <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
        {formatCurrency(price)}
      </span>
      <span className="text-xs font-medium text-slate-500">
        /{getBillingLabel(billingCycle)}
      </span>
    </div>
  </div>

  {/* Divider */}
  <div className="my-6 h-px w-full bg-slate-100" />

  {/* Features List */}
  <div className="flex flex-1 flex-col justify-between">
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Included with this plan
      </p>

      <div className="space-y-2.5 text-xs sm:text-sm text-slate-600">
        <PlanFeatureRow
          label={`Up to ${limitValue(plan?.limits?.rooms)} rooms`}
          selected={false}
        />
        <PlanFeatureRow
          label={`Up to ${limitValue(plan?.limits?.branches)} branches`}
          selected={false}
        />
        <PlanFeatureRow
          label={`Up to ${limitValue(plan?.limits?.receptionists)} receptionists`}
          selected={false}
        />
        <PlanFeatureRow
          label="Food Service"
          enabled={plan?.features?.foodService}
          selected={false}
        />
        <PlanFeatureRow
          label="Room Service"
          enabled={plan?.features?.roomService}
          selected={false}
        />
        {Number(plan.trialDays || 0) > 0 && (
          <PlanFeatureRow
            label={`${plan.trialDays} days free trial`}
            selected={false}
          />
        )}
      </div>
    </div>

    {/* Primary CTA Button */}
    <div className="mt-8">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedPlan(plan);
          handleContinue(plan);
        }}
        className="
          inline-flex cursor-pointer h-11 w-full items-center justify-center gap-2 rounded-xl 
          bg-slate-900 px-4 text-xs sm:text-sm font-medium text-white 
          shadow-sm transition-all duration-150 
          hover:bg-slate-800 active:scale-[0.98] 
          focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900
        "
      >
        <span>{price === 0 ? "Get Started for Free" : "Select Plan"}</span>
      </button>
    </div>
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