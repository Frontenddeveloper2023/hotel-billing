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
  X,
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

          <p className="mt-4 text-sm font-semibold text-black">
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
        className="relative min-h-screen overflow-hidden pb-8 sm:pb-12 font-sans text-black antialiased"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2200&q=85")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-[#071B33]/70 backdrop-blur-[2px]" />

        <main className="relative z-10 mx-auto w-full max-w-[1240px] px-4 pt-6 pb-6 sm:px-6 sm:pt-8 sm:pb-8 lg:px-8 lg:pt-10 lg:pb-10">

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

            <h1 className="text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-white drop-shadow-md leading-tight">
              Choose the Ideal Plan for Your Hotel Management Suite
            </h1>
            <p className="mt-2 text-xs text-blue-100 sm:text-sm">
              Streamline check-ins, room service, billing, and multi-branch operations seamlessly.
            </p>

            {/* BILLING SWITCH */}

            {plans.length > 0 && (
              <div className="hidden sm:flex mt-6 sm:mt-8 justify-center w-full px-2">
                <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl sm:rounded-full border border-white/50 bg-white/95 p-1 sm:p-1.5 shadow-xl backdrop-blur-md pu-scroll scroll-smooth overscroll-x-contain touch-pan-x">
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
                className="mx-auto text-black"
              />

              <h2 className="mt-4 text-xl font-bold text-black">
                No Plans Available
              </h2>

              <p className="mt-2 text-sm text-black">
                There are currently no active subscription plans.
              </p>
            </div>
          )}

          {/* PLANS GRID */}

          {plans.length > 0 && (
            <section className="mt-6 sm:mt-10">
              {/* =========================================================================
                  MOBILE PAYWALL EXPERIENCE (Mirroring Plan-Upgrade, hidden on sm+)
              ========================================================================= */}
              <div className="block sm:hidden mb-6">
                {(() => {
                  const activePlan = selectedPlan || plans[0];
                  const roomsLimit = activePlan?.limits?.rooms || 0;
                  const branchesLimit = activePlan?.limits?.branches || 1;
                  const staffLimit = activePlan?.limits?.receptionists || 1;
                  const hasFood = Boolean(activePlan?.features?.foodService);
                  const hasRoomService = Boolean(activePlan?.features?.roomService);

                  const cycleKeys = [
                    { key: "monthly", label: "Monthly" },
                    { key: "quarterly", label: "Quarterly" },
                    { key: "halfYearly", label: "Half-Yearly" },
                    { key: "yearly", label: "Yearly" },
                  ];

                  return (
                    <div className="rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_18px_45px_rgba(6,20,52,0.18)] overflow-hidden p-5 space-y-5">
                      {/* 1. SELECT PLAN TIER (TOP) */}
                      {plans.length > 1 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-bold text-black/60 uppercase tracking-wider">
                              1. Select Plan Tier
                            </p>
                            <span className="text-[10px] font-extrabold text-[#2568e0] bg-blue-50 px-2 py-0.5 rounded-full">
                              Active: {activePlan?.planName}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 overflow-x-auto pu-scroll scroll-smooth overscroll-x-contain touch-pan-x pb-1 pt-0.5 -mx-1 px-1">
                            {plans.map((p) => {
                              const isTierSelected = activePlan?._id === p._id;
                              return (
                                <button
                                  key={p._id}
                                  type="button"
                                  onClick={() => setSelectedPlan(p)}
                                  className={`flex-1 min-w-[95px] shrink-0 py-2.5 px-3 rounded-2xl text-xs font-black transition-all duration-200 cursor-pointer border text-center capitalize flex items-center justify-center gap-1.5 whitespace-nowrap select-none active:scale-95 ${
                                    isTierSelected
                                      ? "bg-[#0b1b36] text-white border-[#0b1b36] shadow-md shadow-slate-900/25 ring-2 ring-[#0b1b36]/20"
                                      : "bg-slate-50 text-black border-slate-200 hover:bg-slate-100"
                                  }`}
                                >
                                  <Crown size={13} className={`shrink-0 ${isTierSelected ? "text-amber-400" : "text-black/40"}`} />
                                  <span className="leading-none">{p.planName}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. DYNAMIC PLAN FEATURES & CAPABILITIES */}
                      <div className="rounded-2xl bg-gradient-to-b from-blue-50/60 to-slate-50/80 border border-blue-100/80 p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-[#2568e0]" />
                            {activePlan?.planName} Inclusions &amp; Access
                          </p>
                          <span className="text-[10px] font-bold text-black/60">
                            Live Details
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs font-bold text-black">
                            <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                              <Check size={11} strokeWidth={3} />
                            </div>
                            <span className="leading-snug">
                              <strong className="text-[#1d4fc4]">{roomsLimit === 0 ? "Unlimited" : roomsLimit} Total Rooms</strong> management &amp; multi-room bookings
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-xs font-bold text-black">
                            <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                              <Check size={11} strokeWidth={3} />
                            </div>
                            <span className="leading-snug">
                              <strong className="text-[#1d4fc4]">{branchesLimit === 0 ? "Unlimited" : branchesLimit} Hotel Branch{branchesLimit === 1 ? "" : "es"}</strong> access with centralized billing
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-xs font-bold text-black">
                            <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                              <Check size={11} strokeWidth={3} />
                            </div>
                            <span className="leading-snug">
                              <strong className="text-[#1d4fc4]">{staffLimit === 0 ? "Unlimited" : staffLimit} Staff / Receptionist</strong> role-based login account{staffLimit === 1 ? "" : "s"}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-xs font-bold text-black">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                              hasFood ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                            }`}>
                              {hasFood ? <Check size={11} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                            </div>
                            <span className={`leading-snug ${hasFood ? "text-black" : "text-black/50 line-through"}`}>
                              {hasFood ? "Food service included" : "Food service not included (Upgrade required)"}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-xs font-bold text-black">
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                              hasRoomService ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                            }`}>
                              {hasRoomService ? <Check size={11} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                            </div>
                            <span className={`leading-snug ${hasRoomService ? "text-black" : "text-black/50 line-through"}`}>
                              {hasRoomService ? "Room service included" : "Room service not included (Upgrade required)"}
                            </span>
                          </div>

                          <div className="flex items-start gap-2 text-xs font-bold text-black">
                            <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                              <Check size={11} strokeWidth={3} />
                            </div>
                            <span className="leading-snug">
                               PDF Invoices, GST Breakdown &amp; Excel Reports
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3. SIDE-BY-SIDE BILLING CYCLE CARDS */}
                      <div>
                        <p className="text-[11px] font-bold text-black/60 uppercase tracking-wider mb-2 text-center">
                          2. Choose Billing Cycle
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                          {cycleKeys.filter((c) => billingCycleConfig[c.key]).map((c) => {
                            const isActive = billingCycle === c.key;
                            const cyclePrice = activePlan ? getPlanPrice(activePlan, c.key) : 0;
                            const cycleActual = Number(activePlan?.actualPricing?.[c.key] || 0);
                            const cycleMonths = c.key === "quarterly" ? 3 : c.key === "halfYearly" ? 6 : c.key === "yearly" ? 12 : 1;
                            const monthlyEquiv = cyclePrice > 0 ? Math.round(cyclePrice / cycleMonths) : 0;
                            const hasDiscount = cycleActual > cyclePrice && cyclePrice > 0;
                            const discountPct = hasDiscount ? Math.round(((cycleActual - cyclePrice) / cycleActual) * 100) : 0;

                            return (
                              <button
                                key={c.key}
                                type="button"
                                onClick={() => setBillingCycle(c.key)}
                                className={`relative p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                                  isActive
                                    ? "border-2 border-[#2568e0] bg-blue-50/70 shadow-md shadow-blue-500/15 ring-2 ring-[#2568e0]/20"
                                    : "border border-slate-200/90 bg-white hover:border-blue-300"
                                }`}
                              >
                                {c.key === "yearly" && (
                                  <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-[#2568e0] text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                                    Best Value
                                  </span>
                                )}
                                {discountPct > 0 && c.key !== "yearly" && (
                                  <span className="absolute -top-2.5 right-2 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                                    Save {discountPct}%
                                  </span>
                                )}

                                <div>
                                  <p className="text-xs font-black text-black capitalize">
                                    {c.label}
                                  </p>
                                  <div className="mt-1">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xl font-black text-black tracking-tight">
                                        ₹{monthlyEquiv.toLocaleString("en-IN")}
                                      </span>
                                      <span className="text-[11px] font-bold text-black/60">
                                        /mo
                                      </span>
                                    </div>

                                    {cycleMonths > 1 ? (
                                      <span className="text-[10px] font-bold text-black/75 block mt-0.5">
                                        ₹{cyclePrice.toLocaleString("en-IN")} total / {c.label.toLowerCase()}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-medium text-black/55 block mt-0.5">
                                        Billed monthly
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {discountPct > 0 && (
                                  <p className="mt-2 text-[10px] font-extrabold text-emerald-700">
                                    Save {discountPct}%
                                  </p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Subtext reminder */}
                      <p className="text-[11px] text-center font-medium text-black/60">
                        Instant activation &bull; Upgrade or cancel anytime
                      </p>

                      {/* 4. PRIMARY CALL TO ACTION BUTTON */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlan(activePlan);
                          handleContinue(activePlan);
                        }}
                        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#2568e0] to-[#5b9bf5] hover:brightness-110 active:scale-[0.98] text-white text-sm font-black shadow-lg shadow-blue-500/35 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>
                          {getPlanPrice(activePlan, billingCycle) === 0 ? "Get Started for Free" : `Proceed with ${activePlan?.planName || "Plan"}`}
                        </span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* =========================================================================
                  DESKTOP PLANS GRID (Retained exactly as original on sm+)
              ========================================================================= */}
              <div className="hidden sm:grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                            rounded-3xl border bg-white/95 p-7 text-black shadow-xl backdrop-blur-md
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
                                <div className="min-w-0">
                                  <h2 className="text-xl font-bold tracking-tight text-black transition-colors group-hover:text-blue-600">
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
                            <p className="mt-4 min-h-[42px] text-xs leading-relaxed text-black sm:text-sm">
                              {plan.description ||
                                "Designed for upscale hospitality properties, packed with essential hotel billing features."}
                            </p>

                            {/* PRICE */}
                            <div className="mt-6 border-t border-slate-100 pt-5">
                              {hasDiscount && (
                                <div className="mb-2 flex items-center gap-2">
                                  <span className="text-sm font-semibold text-black line-through">
                                    {formatCurrency(actualPerMonth)}
                                  </span>

                                  <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/60 shadow-xs">
                                    Save {formatCurrency(actualPrice - price)}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-baseline gap-1.5">
                                <span className="text-3xl font-extrabold tracking-tight text-black transition-colors group-hover:text-blue-600 sm:text-4xl">
                                  {formatCurrency(perMonthPrice)}
                                </span>

                                <span className="text-xs font-semibold text-black">
                                  / month
                                </span>
                              </div>

                              {cycleMonths > 1 ? (
                                <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-black bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                  <span>
                                    {formatCurrency(price)} / {getBillingLabel(billingCycle)}
                                  </span>
                                  <span className="text-black">
                                    ({cycleMonths} {cycleMonths === 1 ? "month" : "months"})
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-2 text-xs font-medium text-black">
                                  Billed monthly
                                </div>
                              )}
                            </div>

                            {/* FEATURES */}
                            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-black">
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
                                    : "border border-slate-300 bg-white text-black hover:border-slate-900 hover:bg-slate-900 hover:text-white shadow-xs"
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
            <div className="mt-6 sm:mt-10 rounded-2xl sm:rounded-3xl border border-white/50 bg-white/95 p-4 sm:p-6 shadow-xl backdrop-blur-md transition-all hover:border-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] sm:text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      {freeTrialConfig.trialDays}-Day Free Trial
                    </span>

                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-black">
                      No Credit Card Required
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg lg:text-xl font-bold tracking-tight text-black leading-snug">
                    Test drive your property management tools risk-free
                  </h2>

                  <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-black/75">
                    Get full access to hotel billing, room reservations, food orders, and staff management for {freeTrialConfig.trialDays} days.
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:pt-4 lg:justify-end lg:border-t-0 lg:pt-0">
                  <div className="text-left lg:text-right">
                    <div className="text-xl sm:text-2xl font-extrabold text-black">
                      ₹0
                    </div>

                    <div className="text-[11px] sm:text-xs font-medium text-black/60">
                      For {freeTrialConfig.trialDays} days
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleFreeTrialClick}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-slate-900 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:bg-blue-600 active:scale-[0.98]"
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
            : "bg-slate-100 text-black"
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
            ? "text-black"
            : "text-black line-through"
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
        cursor-pointer rounded-xl sm:rounded-full px-3 py-2 text-xs font-bold
        transition-all duration-200 sm:px-5 sm:py-2.5 sm:text-sm whitespace-nowrap shrink-0 flex items-center justify-center gap-1 active:scale-95
        ${
          active
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/30 scale-[1.02]"
            : "text-black hover:bg-slate-100/80 hover:text-black"
        }
      `}
    >
      <span>{label}</span>

      {sublabel && (
        <span
          className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
            active
              ? "bg-white/20 text-blue-100"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {sublabel}
        </span>
      )}
    </button>
  );
};

export default SaaSUserChoosePlan;