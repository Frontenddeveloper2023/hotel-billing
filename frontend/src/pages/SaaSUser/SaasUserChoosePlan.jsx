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
  ShieldCheck,
  Award,
  Crown,
  Gem,
  Zap,
} from "lucide-react";

import {
  getPublicActivePlans,
  getPublicFreeTrialConfig,
  getPublicBillingCycleConfig,
} from "../../service/planApi";
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
      return "halfYearly";
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
// PLAN BADGE DESIGN
// ============================================================

const getPlanBadge = (planName) => {
  const name = String(planName || "").toLowerCase();

  if (name.includes("basic")) {
    return {
      Icon: ShieldCheck,
      container:
        "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25",
      glow: "bg-blue-400/20",
    };
  }

  if (name.includes("standard")) {
    return {
      Icon: Award,
      container:
        "bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25",
      glow: "bg-cyan-400/20",
    };
  }

  if (name.includes("premium")) {
    return {
      Icon: Crown,
      container:
        "bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-md shadow-purple-500/25",
      glow: "bg-purple-400/20",
    };
  }

  if (name.includes("enterprise")) {
    return {
      Icon: Building2,
      container:
        "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25",
      glow: "bg-amber-400/20",
    };
  }

  if (name.includes("pro")) {
    return {
      Icon: Gem,
      container:
        "bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-md shadow-emerald-500/25",
      glow: "bg-emerald-400/20",
    };
  }

  return {
    Icon: Zap,
    container:
      "bg-gradient-to-br from-indigo-500 to-blue-700 text-white shadow-md shadow-indigo-500/25",
    glow: "bg-indigo-400/20",
  };
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

  const [freeTrialConfig, setFreeTrialConfig] = useState({
    isEnabled: true,
    trialDays: 14,
  });

  const [billingCycleConfig, setBillingCycleConfig] = useState({
    monthly: true,
    quarterly: true,
    halfYearly: true,
    yearly: true,
  });

  // ==========================================================
  // FETCH PLANS & CONFIGURATION
  // ==========================================================

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError("");

      const [plansRes, trialRes, cyclesRes] =
        await Promise.allSettled([
          getPublicActivePlans(),
          getPublicFreeTrialConfig(),
          getPublicBillingCycleConfig(),
        ]);

      if (
        plansRes.status === "fulfilled" &&
        plansRes.value?.success
      ) {
        const fetchedPlans = Array.isArray(
          plansRes.value?.data
        )
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
        throw new Error(
          plansRes.reason?.message ||
            "Unable to load subscription plans."
        );
      }

      if (
        trialRes.status === "fulfilled" &&
        trialRes.value?.success &&
        trialRes.value?.data
      ) {
        setFreeTrialConfig({
          isEnabled: Boolean(
            trialRes.value.data.isEnabled
          ),
          trialDays: Number(
            trialRes.value.data.trialDays || 14
          ),
        });
      }

      if (
        cyclesRes.status === "fulfilled" &&
        cyclesRes.value?.success &&
        cyclesRes.value?.data
      ) {
        const cfg = cyclesRes.value.data;

        const newCyclesConfig = {
          monthly: cfg.monthly ?? true,
          quarterly: cfg.quarterly ?? true,
          halfYearly: cfg.halfYearly ?? true,
          yearly: cfg.yearly ?? true,
        };

        setBillingCycleConfig(newCyclesConfig);

        setBillingCycle((current) => {
          if (newCyclesConfig[current]) {
            return current;
          }

          const order = [
            "monthly",
            "quarterly",
            "halfYearly",
            "yearly",
          ];

          const firstActive = order.find(
            (cycle) => newCyclesConfig[cycle]
          );

          return firstActive || "monthly";
        });
      }
    } catch (err) {
      console.error("Get public plans error:", err);

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
  // INITIAL LOAD & EMAIL VERIFICATION GUARD
  // ==========================================================

  const verifiedEmail = sessionStorage.getItem(
    "hotelRegistrationEmail"
  );

  useEffect(() => {
    if (!verifiedEmail) {
      navigate("/saas-user/verify-email", {
        replace: true,
      });
      return;
    }

    fetchPlans();
  }, [verifiedEmail, navigate]);

  // ==========================================================
  // CONTINUE WITH PAID PLAN
  // ==========================================================

  const handleContinue = (planObj) => {
    const planToUse = planObj || selectedPlan;

    if (!planToUse?._id) {
      setError("Please select a plan to continue.");
      return;
    }

    sessionStorage.setItem(
      "saasSelectedPlan",
      JSON.stringify(planToUse)
    );

    sessionStorage.setItem(
      "saasBillingCycle",
      billingCycle
    );

    sessionStorage.removeItem("saasIsFreeTrial");
    sessionStorage.removeItem("saasIsUpgrade");
    sessionStorage.removeItem("saasHotelDetails");
    sessionStorage.removeItem("saasPaymentStatus");
    sessionStorage.removeItem("saasRegistrationId");
    sessionStorage.removeItem("saasRegistration");

    navigate("/saas-user/registration", {
      state: {
        selectedPlan: planToUse,
        billingCycle,
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
        receptionists:
          defaultRefPlan?.limits?.receptionists || 10,
      },

      features: {
        foodService: true,
        roomService: true,
      },
    };

    sessionStorage.setItem(
      "saasSelectedPlan",
      JSON.stringify(trialPlanObj)
    );

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
          backgroundImage:
            'url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=85")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#06182F]/75 backdrop-blur-sm" />

        <div className="relative z-10 flex flex-col items-center rounded-3xl border border-white/20 bg-white/95 px-8 py-7 shadow-2xl backdrop-blur-md">
          <Loader2
            size={34}
            className="animate-spin text-blue-600"
          />

          <p className="mt-4 text-sm font-semibold text-slate-800">
            Loading luxury hotel plans...
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
      <SaaSSetupProgress activeStep={2} />

      <div
        className="relative min-h-screen overflow-hidden pb-28 font-sans text-slate-900 antialiased sm:pb-24"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=85")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-[#071B33]/70 backdrop-blur-[2px]" />

        <main className="relative z-10 mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">

          {/* HEADER */}

          <section className="text-center">
            {verifiedEmail && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3.5 py-1.5 text-xs text-white shadow-sm backdrop-blur-md">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />

                <span>
                  Verified Property Email:{" "}
                  <strong className="font-bold">
                    {verifiedEmail}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/saas-user/verify-email")
                  }
                  className="ml-1 cursor-pointer text-[11px] text-blue-200 underline transition-colors hover:text-white"
                >
                  Change
                </button>
              </div>
            )}

            <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl">
              Choose the Ideal Plan for Your Hotel Management Suite
            </h1>
            <p className="mt-2 text-xs text-blue-100 sm:text-sm">
              Streamline check-ins, room service, billing, and multi-branch operations seamlessly.
            </p>

            {/* BILLING SWITCH */}

            {plans.length > 0 && (
              <div className="mt-8 flex justify-center">
                <div className="inline-flex max-w-full items-center overflow-x-auto rounded-full border border-white/30 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md">
                  {billingCycleConfig.monthly && (
                    <BillingButton
                      label="Monthly"
                      active={billingCycle === "monthly"}
                      onClick={() =>
                        setBillingCycle("monthly")
                      }
                    />
                  )}

                  {billingCycleConfig.quarterly && (
                    <BillingButton
                      label="Quarterly"
                      sublabel="Save More"
                      active={billingCycle === "quarterly"}
                      onClick={() =>
                        setBillingCycle("quarterly")
                      }
                    />
                  )}

                  {billingCycleConfig.halfYearly && (
                    <BillingButton
                      label="Half Yearly"
                      sublabel="Popular"
                      active={billingCycle === "halfYearly"}
                      onClick={() =>
                        setBillingCycle("halfYearly")
                      }
                    />
                  )}

                  {billingCycleConfig.yearly && (
                    <BillingButton
                      label="Yearly"
                      sublabel="Best Value"
                      active={billingCycle === "yearly"}
                      onClick={() =>
                        setBillingCycle("yearly")
                      }
                    />
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ERROR */}

          {error && (
            <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-2xl border border-red-200 bg-white px-5 py-4 shadow-2xl">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-red-900">
                  Unable to load plans
                </p>

                <p className="mt-1 text-xs font-medium text-red-700">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={fetchPlans}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-bold text-red-700 hover:text-red-900"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {/* NO PLANS */}

          {!error && plans.length === 0 && (
            <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-white/30 bg-white/90 p-12 text-center shadow-2xl backdrop-blur-md">
              <Building2
                size={40}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                No Plans Available
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                There are currently no active subscription plans.
              </p>
            </div>
          )}

          {/* PLANS GRID */}

          {plans.length > 0 && (
            <section className="mt-10">
              <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                  .map((plan, planIndex) => {
                    const price = getPlanPrice(
                      plan,
                      billingCycle
                    );

                    const actualPrice = Number(
                      plan?.actualPricing?.[billingCycle] || 0
                    );

                    const hasDiscount =
                      actualPrice > price && price > 0;

                    const discountPercent = hasDiscount
                      ? Math.round(
                          ((actualPrice - price) /
                            actualPrice) *
                            100
                        )
                      : 0;

                    const cycleMonths =
                      billingCycle === "quarterly"
                        ? 3
                        : billingCycle === "halfYearly"
                        ? 6
                        : billingCycle === "yearly"
                        ? 12
                        : 1;

                    const perMonthPrice =
                      price > 0
                        ? Math.round(price / cycleMonths)
                        : 0;

                    const actualPerMonth =
                      actualPrice > 0
                        ? Math.round(
                            actualPrice / cycleMonths
                          )
                        : 0;

                    const limitValue = (value) =>
                      Number(value || 0) === 0
                        ? "Unlimited"
                        : value;

                    const handlePlanClick = () => {
                      setSelectedPlan(plan);
                      handleContinue(plan);
                    };

                    const isPopular = planIndex === 1;

                    // NEW: Plan-specific badge

                    const badge = getPlanBadge(
                      plan.planName
                    );

                    const BadgeIcon = badge.Icon;

                    return (
                      <div
                        key={plan._id}
                        className="flex"
                      >
                        {/* PLAN CARD */}

                        <div
                          onClick={handlePlanClick}
                          className={`
                            group relative flex w-full cursor-pointer flex-col justify-between overflow-hidden
                            rounded-3xl border bg-white/95 p-7 text-slate-900 shadow-xl backdrop-blur-md
                            transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl
                            active:translate-y-0
                            ${
                              isPopular
                                ? "border-2 border-transparent bg-gradient-to-b from-white via-white to-blue-50/50 ring-4 ring-blue-500/25 shadow-blue-500/15"
                                : "border-slate-100 hover:border-blue-400"
                            }
                          `}
                        >
                          {/* BACKGROUND GLOW ACCENT FOR POPULAR PLAN */}
                          {isPopular && (
                            <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-gradient-to-br from-blue-500/25 via-indigo-500/15 to-transparent blur-3xl pointer-events-none" />
                          )}

                          {/* TOP ACCENT */}
                          <div
                            className={`absolute left-0 right-0 top-0 h-1.5 transition-all duration-300 ${
                              isPopular
                                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-sm shadow-blue-500"
                                : "bg-transparent group-hover:bg-gradient-to-r group-hover:from-blue-500 group-hover:via-indigo-500 group-hover:to-purple-500"
                            }`}
                          />

                          <div>
                            {/* CARD HEADER */}
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                {/* NEW PLAN BADGE DESIGN */}
                               

                                <div className="min-w-0">
                                  <h2 className="text-xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600">
                                    {plan.planName}
                                  </h2>
                                </div>
                              </div>

                              <div className="flex shrink-0 flex-col items-end gap-1.5">
                                {hasDiscount && (
                                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1 text-xs font-bold text-white shadow-sm shadow-emerald-500/20 ">
                                    {discountPercent}% OFF
                                  </span>
                                )}

                                {Number(plan.trialDays || 0) > 0 && (
                                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 shadow-sm">
                                    ✨ {plan.trialDays}d Trial
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* DESCRIPTION */}
                            <p className="mt-4 min-h-[42px] text-xs leading-relaxed text-slate-600 sm:text-sm">
                              {plan.description ||
                                "Designed for upscale hospitality properties, packed with essential hotel billing features."}
                            </p>

                            {/* PRICE */}
                            <div className="mt-6 border-t border-slate-100 pt-5">
                              {hasDiscount && (
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-400 line-through">
                                    {formatCurrency(actualPerMonth)}
                                  </span>

                                  <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/60 shadow-xs">
                                    Save {formatCurrency(actualPrice - price)}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-blue-600 sm:text-4xl">
                                  {formatCurrency(perMonthPrice)}
                                </span>

                                <span className="text-xs font-semibold text-slate-500">
                                  / month
                                </span>
                              </div>

                              {cycleMonths > 1 ? (
                                <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                  <span>
                                    {formatCurrency(price)} / {getBillingLabel(billingCycle)}
                                  </span>
                                  <span className="text-slate-400">
                                    ({cycleMonths} {cycleMonths === 1 ? "month" : "months"})
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-2 text-xs font-medium text-slate-400">
                                  Billed monthly
                                </div>
                              )}
                            </div>

                            {/* FEATURES */}
                            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Included hotel capabilities
                              </p>

                              <PlanFeatureRow
                                label={`Up to ${limitValue(plan?.limits?.rooms)} rooms`}
                              />

                              <PlanFeatureRow
                                label={`Up to ${limitValue(plan?.limits?.branches)} branches`}
                              />

                              <PlanFeatureRow
                                label={`Up to ${limitValue(plan?.limits?.receptionists)} receptionists`}
                              />

                              <PlanFeatureRow
                                label="Food & Dining Service"
                                enabled={plan?.features?.foodService}
                              />

                              <PlanFeatureRow
                                label="Room Service Management"
                                enabled={plan?.features?.roomService}
                              />

                              {Number(plan.trialDays || 0) > 0 && (
                                <PlanFeatureRow
                                  label={`${plan.trialDays} days free trial`}
                                />
                              )}
                            </div>
                          </div>

                          {/* CTA BUTTON */}
                          {/* CTA BUTTON */}
<div className="mt-8">
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      setSelectedPlan(plan);
      handleContinue(plan);
    }}
    className={`
      inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2
      rounded-2xl text-xs font-semibold shadow-md transition-all duration-200
      active:scale-[0.98] sm:text-sm
      ${
        isPopular
          ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:opacity-95"
          : "border border-slate-300 bg-white text-slate-800 hover:border-slate-900 hover:bg-slate-900 hover:text-white shadow-xs"
      }
    `}
  >
    <span>
      {price === 0 ? "Get Started for Free" : "Select Hotel Plan"}
    </span>

    <ArrowRight
      size={16}
      className="transition-transform group-hover:translate-x-1"
    />
  </button>
</div>

                          
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* FREE TRIAL BANNER */}

          {freeTrialConfig.isEnabled && (
            <div className="mt-10 rounded-3xl border border-white/40 bg-white/95 p-6 shadow-2xl backdrop-blur-md transition-all hover:border-white sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/60 bg-emerald-50 text-emerald-600 shadow-inner">
                    <Sparkles size={24} />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        {freeTrialConfig.trialDays}-Day Free Trial
                      </span>

                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        No Credit Card Required
                      </span>
                    </div>

                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      Test drive your property management tools risk-free
                    </h2>

                    <p className="max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
                      Get full access to hotel billing, room reservations, food orders, and staff management for {freeTrialConfig.trialDays} days.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-6 border-t border-slate-100 pt-4 lg:justify-end lg:border-t-0 lg:pt-0">
                  <div className="text-left lg:text-right">
                    <div className="text-2xl font-extrabold text-slate-900">
                      ₹0
                    </div>

                    <div className="text-xs text-slate-500">
                      For {freeTrialConfig.trialDays} days
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFreeTrialClick}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs font-semibold text-white shadow-lg transition-all hover:bg-blue-600 active:scale-[0.99] sm:text-sm"
                  >
                    <span>Start Free Trial</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

// ============================================================
// PLAN FEATURE ROW
// ============================================================

const PlanFeatureRow = ({ label, enabled = true }) => {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
          enabled
            ? "bg-blue-50 text-blue-600"
            : "bg-slate-100 text-slate-300"
        }`}
      >
        {enabled ? (
          <Check size={13} strokeWidth={3} />
        ) : (
          <span className="text-[11px] font-bold">—</span>
        )}
      </span>

      <span
        className={`text-xs font-medium sm:text-sm ${
          enabled
            ? "text-slate-700"
            : "text-slate-400 line-through"
        }`}
      >
        {label}
      </span>
    </div>
  );
};

// ============================================================
// BILLING BUTTON
// ============================================================

const BillingButton = ({
  label,
  sublabel,
  active,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        cursor-pointer rounded-full px-4 py-2 text-xs font-semibold
        transition-all duration-200 sm:px-5 sm:py-2.5 sm:text-sm
        ${
          active
            ? "scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
        }
      `}
    >
      <span>{label}</span>

      {sublabel && (
        <span
          className={`ml-1 text-[10px] font-bold ${
            active ? "text-blue-200" : "text-emerald-600"
          }`}
        >
          ({sublabel})
        </span>
      )}
    </button>
  );
};

export default SaaSUserChoosePlan;