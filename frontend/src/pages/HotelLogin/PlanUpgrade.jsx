import React, { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../Context/AuthContext";

import { useToast } from "../../Context/ToastContext";
import StaylioLoader from "../../Components/StaylioLoader";

import {
  getPublicActivePlans,
  getPublicBillingCycleConfig,
} from "../../service/planApi";

import {
  getMySubscription,
  upgradeHotelSubscription,
} from "../../service/subscriptionApi";
import {
  createSubscriptionUpgradeOrder,
  verifySubscriptionUpgradePayment,
  getSubscriptionUpgradePreview,
  switchSubscriptionPlanDirect,
} from "../../service/paymentApi";
import {
  openCashfreeCheckoutModal,
  isPaymentCancellation,
} from "../../util/cashfreeCheckout";
import api from "../../service/api";

import {
  CreditCard,
  CheckCircle2,
  ArrowUpCircle,
  Loader2,
  BedDouble,
  Building2,
  Users,
  UtensilsCrossed,
  Wrench,
  Crown,
  Sparkles,
  CalendarDays,
  X,
  Tag,
  Info,
  ArrowRight,
  Lock,
  Check,
  ShieldCheck,
} from "lucide-react";

const BILLING_CYCLES = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "halfYearly", label: "Half-Yearly" },
  { key: "yearly", label: "Yearly" },
];

// ======================================================
// STYLE + SHARED UI
// ======================================================

const styles = `
@keyframes pu-up {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pu-pop {
  from {
    opacity: 0;
    transform: translateY(22px) scale(.96);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pu-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.pu-in {
  opacity: 0;
  animation: pu-up .5s cubic-bezier(.2,.7,.2,1) forwards;
}

.pu-pop {
  animation: pu-pop .3s cubic-bezier(.2,.8,.2,1);
}

.pu-fade {
  animation: pu-fade .2s ease-out;
}

.pu-scroll::-webkit-scrollbar {
  display: none;
}

.pu-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

@media (prefers-reduced-motion: reduce) {
  .pu-in {
    animation: none;
    opacity: 1;
  }

  .pu-pop,
  .pu-fade {
    animation: none;
  }
}
`;

const delay = (i, step = 70) => ({
  animationDelay: `${Math.min(i, 10) * step}ms`,
});

const card =
  "rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.16)]";

const InfoChip = ({ label, value, cls }) => (
  <div
    className={`
      flex
      min-w-0
      items-center
      gap-2
      rounded-2xl
      border
      px-3.5
      py-2.5
      shadow-sm
      sm:gap-2.5
      sm:px-4
      sm:py-3
      ${cls}
    `}
  >
    <span className="shrink-0 text-[11px] font-semibold text-black/70 sm:text-xs">
      {label}:
    </span>

    <strong className="min-w-0 truncate text-xs font-black text-black sm:text-sm">
      {value}
    </strong>
  </div>
);

const tiers = [
  "from-[#5b9bf5] to-[#2568e0]",
  "from-[#3b82f0] to-[#1d4fc4]",
  "from-[#4aa3ff] to-[#1f6fd8]",
  "from-[#6aa8f7] to-[#2f5fd0]",
];

const PlanCard = memo(
  ({ plan, index, isCurrent, price, actualPrice = 0, billingCycle, onSelect }) => {
    const grad = tiers[index % tiers.length];

    const cycleMonths =
      billingCycle === "quarterly" ? 3 :
      billingCycle === "halfYearly" ? 6 :
      billingCycle === "yearly" ? 12 : 1;

    const perMonthPrice = price > 0 ? Math.round(price / cycleMonths) : 0;
    const actualPerMonth = actualPrice > 0 ? Math.round(actualPrice / cycleMonths) : 0;
    const hasDiscount = actualPrice > price && price > 0;
    const discountPercent = hasDiscount ? Math.round(((actualPrice - price) / actualPrice) * 100) : 0;

    return (
      <div
        style={delay(index + 2)}
        onClick={() => onSelect(plan)}
        className={`
          pu-in
          ${card}
          flex
          min-w-0
          flex-col
          overflow-hidden
          transition-all
          duration-300
          ${
            isCurrent
              ? "ring-2 ring-emerald-400"
              : "cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_26px_60px_rgba(6,20,52,0.3)]"
          }
        `}
      >
        {/* PLAN HEADER */}
        <div
          className={`
            relative
            overflow-hidden
            bg-gradient-to-br
            ${grad}
            p-4
            text-white
            sm:p-5
          `}
        >
          <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-white/10 blur-xl sm:h-32 sm:w-32" />

          <div
            className="
              relative
              flex
              min-w-0
              flex-col
              gap-3
              sm:flex-row
              sm:items-start
              sm:justify-between
            "
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  border
                  border-white/25
                  bg-white/20
                  backdrop-blur
                  sm:h-11
                  sm:w-11
                "
              >
                <Crown size={19} className="sm:h-5 sm:w-5" />
              </div>

              <h2
                className="
                  min-w-0
                  truncate
                  text-base
                  font-bold
                  sm:text-lg
                "
              >
                {plan.planName}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {hasDiscount && (
                <span className="inline-flex items-center rounded-full bg-emerald-400/30 border border-emerald-200/50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-100">
                  {discountPercent}% OFF
                </span>
              )}
              {isCurrent && (
                <span
                  className="
                    inline-flex
                    w-fit
                    shrink-0
                    items-center
                    gap-1
                    rounded-full
                    border
                    border-emerald-200/40
                    bg-emerald-400/25
                    px-2.5
                    py-1
                    text-[10px]
                    font-bold
                    text-emerald-50
                    sm:text-[11px]
                  "
                >
                  <CheckCircle2 size={12} />
                  Current
                </span>
              )}
            </div>
          </div>

          {plan.description && (
            <p
              className="
                relative
                mt-3
                line-clamp-2
                text-[11px]
                leading-relaxed
                text-blue-100
                sm:text-xs
              "
            >
              {plan.description}
            </p>
          )}

          <div className="relative mt-4">
            {hasDiscount && (
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs sm:text-sm font-semibold text-blue-200/80 line-through">
                  ₹{actualPerMonth.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] font-bold text-emerald-200 bg-emerald-500/20 border border-emerald-300/30 px-1.5 py-0.5 rounded">
                  Save ₹{(actualPrice - price).toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {/* 1. Show per-month first */}
            <div
              className="
                flex
                min-w-0
                flex-wrap
                items-end
                gap-x-1.5
                gap-y-1
              "
            >
              <span
                className="
                  break-all
                  text-2xl
                  font-extrabold
                  tracking-tight
                  sm:text-3xl
                "
              >
                ₹{perMonthPrice.toLocaleString("en-IN")}
              </span>

              <span className="pb-0.5 text-[10px] text-blue-100 sm:pb-1 sm:text-xs">
                / month
              </span>
            </div>

            {/* 2. Down show full amount for multi-month */}
            {cycleMonths > 1 ? (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white/15 border border-white/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
                <span>₹{price.toLocaleString("en-IN")} / {billingCycle}</span>
                <span className="text-blue-100/70 font-normal text-[11px]">({cycleMonths} mo)</span>
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-blue-100/70">
                Billed monthly
              </div>
            )}
          </div>
        </div>

        {/* PLAN BODY */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* LIMITS */}
          <div className="mb-4 grid grid-cols-3 gap-1.5 sm:gap-2">
            {[
              [BedDouble, plan.limits?.rooms, "Rooms"],
              [Building2, plan.limits?.branches, "Branches"],
              [Users, plan.limits?.receptionists, "Staff"],
            ].map(([Icon, v, l]) => (
              <div
                key={l}
                className="
                  min-w-0
                  rounded-xl
                  border
                  border-[#e7eff8]
                  p-2
                  text-center
                  sm:p-3
                "
              >
                <Icon
                  size={16}
                  className="mx-auto text-[#2568e0] sm:h-[17px] sm:w-[17px]"
                />

                <p
                  className="
                    mt-1
                    text-base
                    font-extrabold
                    text-[#0e2a4a]
                    sm:text-lg
                  "
                >
                  {v || 0}
                </p>

                <p className="truncate text-[9px] text-[#6b7f99] sm:text-[10px]">
                  {l}
                </p>
              </div>
            ))}
          </div>

          {/* FEATURES */}
          <div className="mb-4 flex flex-wrap gap-1.5 sm:gap-2">
            {plan.features?.foodService && (
              <span
                className="
                  inline-flex
                  max-w-full
                  items-center
                  gap-1
                  rounded-lg
                  bg-orange-50
                  px-2
                  py-1.5
                  text-[10px]
                  font-semibold
                  text-orange-700
                  sm:gap-1.5
                  sm:px-2.5
                  sm:text-xs
                "
              >
                <UtensilsCrossed size={12} />
                <span className="truncate">Food</span>
              </span>
            )}

            {plan.features?.roomService && (
              <span
                className="
                  inline-flex
                  max-w-full
                  items-center
                  gap-1
                  rounded-lg
                  bg-[#eaf3ff]
                  px-2
                  py-1.5
                  text-[10px]
                  font-semibold
                  text-[#2568e0]
                  sm:gap-1.5
                  sm:px-2.5
                  sm:text-xs
                "
              >
                <Wrench size={12} />
                <span className="truncate">Room Service</span>
              </span>
            )}

            {!plan.features?.foodService &&
              !plan.features?.roomService && (
                <span className="text-[10px] text-[#9aabc0] sm:text-xs">
                  No additional features
                </span>
              )}
          </div>

          {/* SELECT BUTTON */}
          {!isCurrent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(plan);
              }}
              className="
                mt-auto
                inline-flex
                min-h-10
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-gradient-to-r
                from-[#5b9bf5]
                to-[#2568e0]
                px-3
                py-2.5
                text-xs
                font-bold
                text-white
                shadow-md
                shadow-blue-500/25
                transition
                hover:brightness-110
                active:scale-[0.99]
                sm:text-sm
              "
            >
              <Sparkles size={15} />
              Select This Plan
            </button>
          )}
        </div>
      </div>
    );
  }
);

export default function PlanUpgrade() {
  const { hotelUser: userData, isAuthenticated } = useAuth();

  const toast = useToast();

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [publicHotel, setPublicHotel] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [billingCycleConfig, setBillingCycleConfig] = useState({
    monthly: true,
    quarterly: true,
    halfYearly: true,
    yearly: true,
  });
  const [processing, setProcessing] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSub, setLoadingSub] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [prorationPreview, setProrationPreview] = useState(null);
  const [loadingProration, setLoadingProration] = useState(false);

  // Fetch active billing cycle config
  useEffect(() => {
    let cancelled = false;

    const fetchCycles = async () => {
      try {
        const res = await getPublicBillingCycleConfig();
        if (!cancelled && res?.success && res?.data) {
          const cfg = res.data;
          const newCycles = {
            monthly: cfg.monthly ?? true,
            quarterly: cfg.quarterly ?? true,
            halfYearly: cfg.halfYearly ?? true,
            yearly: cfg.yearly ?? true,
          };
          setBillingCycleConfig(newCycles);
          setBillingCycle((current) => {
            if (newCycles[current]) return current;
            const order = ["monthly", "quarterly", "halfYearly", "yearly"];
            const firstActive = order.find((c) => newCycles[c]);
            return firstActive || "monthly";
          });
        }
      } catch (err) {
        console.warn("[PlanUpgrade] Could not load billing cycle config:", err?.message);
      }
    };

    fetchCycles();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load public hotel info if hotelId is passed via query params (e.g. from reminder email)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hotelIdParam = params.get("hotelId");
    if (hotelIdParam && /^[0-9a-fA-F]{24}$/.test(hotelIdParam)) {
      api
        .get(`/hotels/public/${hotelIdParam}`)
        .then((res) => {
          if (res.data?.success && res.data?.data) {
            setPublicHotel(res.data.data);
          }
        })
        .catch((err) => {
          console.warn("[PlanUpgrade] Could not load public hotel info:", err?.message);
        });
    }
  }, []);

  // Fetch active plans from DB
  useEffect(() => {
    let cancelled = false;

    const fetchPlans = async () => {
      try {
        const res = await getPublicActivePlans();

        if (!cancelled && res.success) {
          setPlans(res.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          toastRef.current.error(
            err.message || "Failed to load plans."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPlans(false);
        }
      }
    };

    fetchPlans();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch current subscription
  useEffect(() => {
    let cancelled = false;

    const fetchSub = async () => {
      try {
        const res = await getMySubscription();

        if (!cancelled && res.success) {
          setCurrentSub(res.data || null);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("No active subscription found.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSub(false);
        }
      }
    };

    fetchSub();

    return () => {
      cancelled = true;
    };
  }, []);

  // Handle return parameters from 1-click email renewal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const orderId = params.get("order_id");
    const err = params.get("error");
    const notice = params.get("notice");

    if (notice === "already_active") {
      toastRef.current.info("Your subscription is already active and up to date!");
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (err) {
      toastRef.current.error(decodeURIComponent(err));
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (payment === "success" && (orderId?.startsWith("REN_") || orderId?.startsWith("FREE_"))) {
      const verifyRenewal = async () => {
        try {
          const res = await api.get(`/payments/verify-renewal?orderId=${encodeURIComponent(orderId)}`);
          if (res.data?.success) {
            toastRef.current.success("Subscription successfully upgraded & activated!");
            if (res.data.data) {
              setCurrentSub(res.data.data);
            }
            window.dispatchEvent(new CustomEvent("subscriptionUpdated"));
          }
        } catch (e) {
          console.warn("[verifyRenewal] Auto-check:", e?.message);
        } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      verifyRenewal();
    }
  }, []);

  const getPrice = (plan, cycle) =>
    plan?.pricing?.[cycle] ?? 0;

  const getActualPrice = (plan, cycle) =>
    plan?.actualPricing?.[cycle] ?? 0;

  const currentPlanId =
    typeof currentSub?.planId === "object"
      ? currentSub?.planId?._id
      : currentSub?.planId;

  const isSubExpired =
    !currentSub ||
    currentSub?.status === "expired" ||
    currentSub?.status === "suspended" ||
    currentSub?.status === "cancelled" ||
    (currentSub?.endDate && new Date() >= new Date(currentSub.endDate));

  const handleSelectPlan = async (plan) => {
    // If not authenticated, prompt user to log in with their hotel account
    if (!isAuthenticated) {
      setSelectedPlan(plan);
      setShowLoginModal(true);
      return;
    }

    // Block only if the subscription is currently ACTIVE and BOTH planId AND billingCycle match
    if (
      !isSubExpired &&
      currentSub?.status === "active" &&
      String(plan._id) === String(currentPlanId) &&
      billingCycle === currentSub?.billingCycle
    ) {
      toastRef.current.info(
        "You are already on this plan with the same billing cycle. Please choose a different plan or billing cycle to upgrade."
      );
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentModal(true);
    setProrationPreview(null);

    // Fetch authoritative proration calculation from backend
    try {
      setLoadingProration(true);
      const prevRes = await getSubscriptionUpgradePreview({
        planId: plan._id,
        billingCycle,
      });
      if (prevRes?.success && prevRes?.data) {
        setProrationPreview(prevRes.data);
      }
    } catch (err) {
      console.warn("[getSubscriptionUpgradePreview] Fallback to standard price:", err?.message);
    } finally {
      setLoadingProration(false);
    }
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    setProcessing(true);

    try {
      // 1. Direct 1-Click switch if 100% covered by unused credit (NO Cashfree needed)
      if (finalPayable === 0) {
        const switchRes = await switchSubscriptionPlanDirect({
          planId: selectedPlan._id,
          billingCycle,
        });

        if (!switchRes?.success) {
          throw new Error(switchRes?.message || "Failed to switch plan.");
        }

        toastRef.current.success(
          switchRes.message || "Plan switched successfully with unused credit!"
        );

        setShowPaymentModal(false);
        if (switchRes.data) {
          setCurrentSub(switchRes.data);
        } else {
          try {
            const subRes = await getMySubscription();
            if (subRes?.success && subRes?.data) setCurrentSub(subRes.data);
          } catch (_) {}
        }
        setSelectedPlan(null);
        window.dispatchEvent(new CustomEvent("subscriptionUpdated"));
        return;
      }

      // 2. Create Cashfree / Backend Order for Upgrade / Partial Payment
      const orderRes = await createSubscriptionUpgradeOrder({
        planId: selectedPlan._id,
        billingCycle,
      });

      if (!orderRes?.success) {
        throw new Error(orderRes?.message || "Failed to initiate upgrade order.");
      }

      if (!orderRes?.data?.paymentSessionId) {
        throw new Error(orderRes?.message || "Failed to initiate payment with Cashfree.");
      }

      const { paymentSessionId, orderId, env } = orderRes.data;

      // Close local overview modal
      setShowPaymentModal(false);

      // 2. Launch Cashfree Web SDK Modal Checkout
      const checkoutResult = await openCashfreeCheckoutModal({
        paymentSessionId,
        mode: env || "sandbox",
      });

      if (checkoutResult?.error) {
        if (isPaymentCancellation(checkoutResult.error)) {
          toastRef.current.info(
            "Payment was cancelled. You have not been charged. You can upgrade anytime.",
            4500,
            "Payment Cancelled"
          );
          setProcessing(false);
          return;
        }
        throw new Error(checkoutResult.error.message || "Payment could not be completed.");
      }

      // 3. Double-check with backend to activate upgraded subscription
      setProcessing(true);
      const verifyRes = await verifySubscriptionUpgradePayment({
        orderId,
        planId: selectedPlan._id,
        billingCycle,
      });

      if (!verifyRes?.success) {
        throw new Error(verifyRes?.message || "Payment verification failed. Please contact support.");
      }

      toastRef.current.success(
        verifyRes.message || "Plan upgraded successfully!"
      );

      if (verifyRes.data) {
        setCurrentSub(verifyRes.data);
      } else {
        try {
          const subRes = await getMySubscription();
          if (subRes?.success && subRes?.data) setCurrentSub(subRes.data);
        } catch (_) {}
      }
      setSelectedPlan(null);

      // Notify other components (e.g. SubscriptionAlertBanner) immediately
      window.dispatchEvent(new CustomEvent("subscriptionUpdated"));
    } catch (err) {
      if (isPaymentCancellation(err)) {
        toastRef.current.info(
          "Payment was cancelled. You have not been charged. You can upgrade anytime.",
          4500,
          "Payment Cancelled"
        );
      } else {
        toastRef.current.error(
          err.message || "Upgrade payment could not be completed. Please try again."
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  const isLoading = loadingPlans || loadingSub;

  if (isLoading) {
    return (
      <StaylioLoader
        message="Loading Subscription Plans"
        subtitle="Fetching tier features, pricing models, and room quota packages..."
      />
    );
  }

  const currentPlanObj =
    typeof currentSub?.planId === "object"
      ? currentSub?.planId
      : null;

  const hotelName =
    (typeof currentSub?.hotelId === "object"
      ? currentSub?.hotelId?.hotelName
      : null) ||
    userData?.hotelName ||
    userData?.name ||
    publicHotel?.hotelName ||
    "";

  const daysLeft = currentSub?.endDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(currentSub.endDate) - new Date()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  // Preview dates for the confirm modal
  const cycleDays = {
    monthly: 30,
    quarterly: 90,
    halfYearly: 180,
    yearly: 365,
  };

  const previewDays =
    cycleDays[billingCycle] ||
    selectedPlan?.validityDays ||
    30;

  const previewStart = new Date();

  const previewEnd = new Date(previewStart);

  previewEnd.setDate(
    previewEnd.getDate() + previewDays
  );

  const currentPlanName =
    prorationPreview?.currentPlanName ||
    currentPlanObj?.planName ||
    "Current Plan";

  const currentPlanPrice = Number(
    prorationPreview?.currentPlanPrice ??
      (currentSub?.amount || currentSub?.finalAmount || 0)
  );

  const currentPlanValidity = Number(
    prorationPreview?.totalDays ??
      (currentSub?.customDurationDays || cycleDays[currentSub?.billingCycle] || 30)
  );

  const remainingUnusedDays = Number(
    prorationPreview?.remainingDays ??
      (isSubExpired ? 0 : (daysLeft ?? 0))
  );

  const newPlanPrice = Number(
    prorationPreview?.originalPrice ??
      getPrice(selectedPlan, billingCycle)
  );

  const unusedCredit = Number(prorationPreview?.unusedCredit ?? 0);

  const rawCredit = Number(
    prorationPreview?.rawCredit ??
      (currentPlanPrice && currentPlanValidity
        ? Math.round(((currentPlanPrice * remainingUnusedDays) / currentPlanValidity) * 100) / 100
        : 0)
  );

  const excessCredit = Number(
    prorationPreview?.excessCredit ??
      Math.max(0, rawCredit - unusedCredit)
  );

  const finalPayable = Number(
    prorationPreview?.payableAmount ??
      Math.max(0, newPlanPrice - unusedCredit)
  );

  const newPlanStart = prorationPreview?.newPlanStartDate
    ? new Date(prorationPreview.newPlanStartDate)
    : previewStart;

  const newPlanEnd = prorationPreview?.newPlanEndDate
    ? new Date(prorationPreview.newPlanEndDate)
    : previewEnd;

  return (
    <div
      className={`
        w-full
        font-['Inter']
        antialiased
        staylio-scrollbar
        text-white
        ${!isAuthenticated ? "min-h-screen flex flex-col" : "min-h-full "}
      `}
    >
      <style>{styles}</style>

      {/* =====================================================
          STANDALONE PUBLIC HEADER (when not inside dashboard)
      ===================================================== */}
      {!isAuthenticated && (
        <header className="w-full border-b border-white/10 bg-white/[0.04] backdrop-blur-xl shrink-0">
          <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] shadow-md shadow-blue-500/25">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  StayLio
                </span>
                <p className="text-[10px] sm:text-[11px] text-blue-200/70 leading-none">
                  Hotel Management Platform
                </p>
              </div>
            </div>

            <Link
              to={`/hotel-login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-white/20 hover:border-white/30 active:scale-95"
            >
              <span>Hotel Login</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>
      )}

      {/* =====================================================
          MAIN CONTENT CONTAINER
      ===================================================== */}
      <div
        className="
          mx-auto
          w-full
          max-w-[1200px]
          min-w-0
          flex-1
          overflow-x-hidden
        
        "
      >
        {/* =====================================================
            HEADER
        ===================================================== */}
        {/* =====================================================
            HEADER / CURRENT SUBSCRIPTION CARD
        ===================================================== */}
        <div className="pu-in mb-5 min-w-0 sm:mb-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_18px_45px_rgba(6,20,52,0.14)] p-5 sm:p-6">
          <div
            className="
              flex
              min-w-0
              flex-col
              gap-3
              sm:gap-4
            "
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-[18px] sm:text-[22px] lg:text-[25px] leading-tight font-extrabold tracking-[-0.035em] text-black">
                  Upgrade Your Plan
                </h1>
                <p className="text-xs text-black/60 font-medium mt-0.5">
                  Select a subscription tier that matches your property size and service requirements
                </p>
              </div>
            </div>

            <div
              className="
                min-w-0
                break-words
                text-xs
                leading-relaxed
                text-black
                font-semibold
                bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:text-sm flex flex-wrap items-center gap-x-2 gap-y-1.5
              "
            >
              {hotelName && (
                <span>
                  Hotel:{" "}
                  <strong className="text-black font-extrabold">
                    {hotelName}
                  </strong>
                </span>
              )}

            {currentPlanObj && (
              <>
                <span className="hidden sm:inline text-slate-400">
                  &bull;
                </span>
                <span>
                  Current Plan:{" "}
                  <strong className="text-blue-700 font-extrabold uppercase tracking-wide">
                    {currentPlanObj.planName}
                  </strong>
                </span>

                <span className="hidden sm:inline text-slate-400">
                  &bull;
                </span>
                <span>
                  Billing:{" "}
                  <strong className="text-amber-700 font-extrabold uppercase">
                    {currentSub?.billingCycle}
                  </strong>
                </span>

                <span className="hidden sm:inline text-slate-400">
                  &bull;
                </span>
                <span>
                  Status:{" "}
                  <strong
                    className={`font-black uppercase px-2 py-0.5 rounded-md text-[11px] ${
                      currentSub?.status === "active"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                    }`}
                  >
                    {currentSub?.status}
                  </strong>
                </span>
              </>
            )}
          </div>

          {/* VALIDITY DATES */}
          {currentSub?.startDate &&
            currentSub?.endDate && (
              <div
                className="
                  grid
                  w-full
                  min-w-0
                  grid-cols-1
                  gap-2
                  sm:grid-cols-2
                  sm:gap-3
                  lg:grid-cols-3
                "
              >
                <InfoChip
                  label="Valid From"
                  value={fmtDate(currentSub.startDate)}
                  cls="bg-emerald-50 border-emerald-200 text-emerald-950"
                />

                <InfoChip
                  label="Expires On"
                  value={fmtDate(currentSub.endDate)}
                  cls="bg-rose-50 border-rose-200 text-rose-950"
                />

                <InfoChip
                  label="Days Left"
                  value={`${daysLeft} days`}
                  cls="bg-blue-50 border-blue-200 text-blue-950"
                />
              </div>
            )}

          {/* EXPIRED BANNER */}
          {isSubExpired && (
            <div
              className="
                mt-3
                flex
                items-center
                gap-3
                rounded-2xl
                border
                border-amber-400/50
                bg-amber-50
                px-4
                py-3.5
                text-xs
                font-medium
                text-amber-950
                shadow-sm
                sm:text-sm
              "
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200 border border-amber-300 text-amber-900">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <strong className="block text-amber-950 font-bold mb-0.5">
                  Subscription Expired
                </strong>
                <span className="text-amber-900 leading-relaxed">
                  Your subscription has expired. You can choose and activate any plan below to restore your hotel service immediately.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MOBILE PAYWALL EXPERIENCE (Hidden on sm+, matching modern in-app design)
      ========================================================================= */}
      <div className="block sm:hidden pu-in mb-6">
       
         {(() => {
          const activePlan = selectedPlan || plans[0];
          const roomsLimit = activePlan?.limits?.rooms || 0;
          const branchesLimit = activePlan?.limits?.branches || 1;
          const staffLimit = activePlan?.limits?.receptionists || 1;
          const hasFood = Boolean(activePlan?.features?.foodService);
          const hasRoomService = Boolean(activePlan?.features?.roomService);

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

              {/* 2. DYNAMIC PLAN FEATURES & CAPABILITIES (POINTS CHANGE BASED ON CHOSEN PLAN) */}
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
                  {/* Dynamic Limit Badges / Points */}
                  <div className="flex items-start gap-2 text-xs font-bold text-black">
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="leading-snug">
                      <strong className="text-[#1d4fc4]">{roomsLimit} Total Rooms</strong> management &amp; multi-room bookings
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-xs font-bold text-black">
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="leading-snug">
                      <strong className="text-[#1d4fc4]">{branchesLimit} Hotel Branch{branchesLimit > 1 ? "es" : ""}</strong> access with centralized billing
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-xs font-bold text-black">
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Check size={11} strokeWidth={3} />
                    </div>
                    <span className="leading-snug">
                      <strong className="text-[#1d4fc4]">{staffLimit} Staff / Receptionist</strong> role-based login account{staffLimit > 1 ? "s" : ""}
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
                  {BILLING_CYCLES.filter((c) => billingCycleConfig[c.key]).map((c) => {
                    const isActive = billingCycle === c.key;
                    const cyclePrice = activePlan ? getPrice(activePlan, c.key) : 0;
                    const cycleActual = activePlan ? getActualPrice(activePlan, c.key) : 0;
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
                        {/* Badge: Best Value / Discount */}
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
                            {/* Monthly amount shown upside big */}
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-black text-black tracking-tight">
                                ₹{monthlyEquiv.toLocaleString("en-IN")}
                              </span>
                              <span className="text-[11px] font-bold text-black/60">
                                /mo
                              </span>
                            </div>

                            {/* Downside show total amount for multi-month, or billed monthly */}
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
                Instant activation &bull; Upgrade or downgrade anytime
              </p>

              {/* 4. PRIMARY CALL TO ACTION BUTTON */}
              <button
                type="button"
                onClick={() => handleSelectPlan(activePlan)}
                disabled={processing}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#2568e0] to-[#5b9bf5] hover:brightness-110 active:scale-[0.98] text-white text-sm font-black shadow-lg shadow-blue-500/35 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed with {activePlan?.planName || "Plan"}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          );
        })()}
      </div>

      {/* =====================================================
          DESKTOP BILLING CYCLE SELECTOR (Retained exactly for sm+)
      ===================================================== */}
      <div
        style={delay(1)}
        className="hidden sm:flex pu-in mb-6 sm:mb-8 justify-center w-full px-3"
      >
        <div
          className="
            flex
            items-center
            gap-1.5
            p-1.5
            rounded-2xl
            bg-white/95
            backdrop-blur-xl
            border
            border-white/60
            shadow-[0_8px_25px_rgba(6,20,52,0.12)]
            max-w-full
            overflow-x-auto
            overflow-y-hidden
            pu-scroll
            scroll-smooth
            overscroll-x-contain
            touch-pan-x
          "
        >
          {BILLING_CYCLES.filter((c) => billingCycleConfig[c.key]).map((c) => {
            const isActive = billingCycle === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setBillingCycle(c.key)}
                className={`
                  inline-flex
                  h-10
                  shrink-0
                  cursor-pointer
                  items-center
                  justify-center
                  rounded-xl
                  px-4
                  sm:px-5
                  text-xs
                  sm:text-sm
                  font-extrabold
                  transition-all
                  duration-200
                  active:scale-95
                  ${
                    isActive
                      ? "bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white shadow-md shadow-blue-500/30"
                      : "text-black/80 hover:text-black hover:bg-slate-100/80"
                  }
                `}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================
          DESKTOP PLANS GRID (Retained exactly for sm+)
      ===================================================== */}

      {plans.length === 0 ? (
        <div
          className={`
            pu-pop
            ${card}
            w-full
            px-4
            py-12
            text-center
            sm:py-16
          `}
        >
          <CreditCard className="mx-auto h-10 w-10 text-[#c7d6ea] sm:h-12 sm:w-12" />

          <p className="mt-4 text-sm font-semibold text-[#6b7f99] sm:text-lg">
            No plans available at the moment.
          </p>
        </div>
      ) : (
        <div
          className="
            hidden
            sm:grid
            w-full
            min-w-0
            grid-cols-1
            gap-4
            pb-4
            sm:grid-cols-2
            sm:gap-5
            xl:grid-cols-3
          "
        >
          {plans.map((plan, i) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              index={i}
              isCurrent={
                !isSubExpired &&
                currentSub?.status === "active" &&
                String(plan._id) === String(currentPlanId) &&
                billingCycle === currentSub?.billingCycle
              }
              price={getPrice(plan, billingCycle)}
              actualPrice={getActualPrice(plan, billingCycle)}
              billingCycle={billingCycle}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      )}

      {/* =====================================================
          PAYMENT CONFIRMATION MODAL
      ===================================================== */}

      {showPaymentModal && selectedPlan && (
        <div
          className="
            pu-fade
            fixed
            inset-0
            z-50
            flex
            items-end
            justify-center
            bg-[#0b1d3d]/65
            p-0
            backdrop-blur-sm
            sm:items-center
            sm:p-4
          "
          onClick={() => {
            if (!processing) {
              setShowPaymentModal(false);
              setSelectedPlan(null);
            }
          }}
        >
          <div
            className="
              pu-pop
              flex
              max-h-[94vh]
              w-full
              flex-col
              overflow-hidden
              rounded-t-3xl
              bg-white
              shadow-[0_24px_70px_rgba(6,20,52,0.45)]
              sm:max-w-md
              sm:rounded-3xl
              md:max-w-lg
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div
              className="
                flex
                shrink-0
                items-center
                justify-between
                gap-3
                bg-gradient-to-r
                from-[#5b9bf5]
                to-[#2568e0]
                px-4
                py-3.5
                text-white
                sm:px-6
                sm:py-4
              "
            >
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div
                  className="
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-white/20
                    sm:h-10
                    sm:w-10
                  "
                >
                  {finalPayable === 0 ? (
                    <Sparkles
                      size={18}
                      className="sm:h-5 sm:w-5"
                    />
                  ) : (
                    <CreditCard
                      size={18}
                      className="sm:h-5 sm:w-5"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold sm:text-lg">
                    {finalPayable === 0 ? "Confirm Plan Switch" : "Confirm Plan Upgrade"}
                  </h3>

                  <p className="mt-0.5 truncate text-[10px] text-blue-100 sm:text-xs">
                    {finalPayable === 0
                      ? "100% covered by unused credit • ₹0 to pay"
                      : "Review the details before you confirm."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!processing) {
                    setShowPaymentModal(false);
                    setSelectedPlan(null);
                  }
                }}
                disabled={processing}
                aria-label="Close"
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-white/15
                  transition
                  hover:bg-white/25
                  disabled:opacity-50
                  sm:h-9
                  sm:w-9
                "
              >
                <X size={17} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div
              className="
                min-h-0
                overflow-y-auto
                p-4
                sm:p-6
              "
            >
              <p className="mb-4 text-xs leading-relaxed text-[#6b7f99] sm:text-sm">
                You are {finalPayable === 0 ? "switching" : "upgrading"} to{" "}
                <strong className="text-[#2568e0]">
                  {selectedPlan.planName}
                </strong>{" "}
                with{" "}
                <strong className="text-amber-600">
                  {billingCycle}
                </strong>{" "}
                billing.
              </p>

              {finalPayable === 0 && unusedCredit > 0 && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-300 bg-emerald-500/10 p-3 text-xs sm:text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <strong className="block font-bold text-emerald-900">
                      This Switch is 100% Free!
                    </strong>
                    <span>
                      You have ₹{unusedCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left from your current plan, so you don't need to pay anything!
                    </span>
                  </div>
                </div>
              )}
              {/* DETAILS */}
              <div
                    className="
                      space-y-3
                      rounded-2xl
                      border
                      border-[#e7eff8]
                      bg-[#f4f8fd]
                      p-3
                      sm:p-4
                    "
                  >
                    {/* CURRENT SUBSCRIPTION SECTION */}
                    <div className="border-b border-[#e2ebf7] pb-3">
                      <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-black">
                        <span>Current Subscription</span>
                        {remainingUnusedDays > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Active ({remainingUnusedDays}d left)
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-black">
                            Expired / 0d left
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7f99]">Current Plan Name</span>
                          <strong className="text-[#0e2a4a]">{currentPlanName}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7f99]">Current Plan Price</span>
                          <span className="font-semibold text-black">
                            ₹{currentPlanPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7f99]">Original Plan Validity</span>
                          <span className="font-semibold text-black">{currentPlanValidity} days</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7f99]">Remaining Unused Days</span>
                          <span className={`font-semibold ${remainingUnusedDays > 0 ? "text-emerald-700" : "text-black"}`}>
                            {remainingUnusedDays} days
                          </span>
                        </div>
                        {rawCredit > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-[#6b7f99]">Current Plan Remaining Amount</span>
                            <span className="font-bold text-emerald-700">
                              ₹{rawCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* NEW SUBSCRIPTION SECTION */}
                    <div className="border-b border-[#e2ebf7] pb-3">
                      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-black">
                        New Subscription
                      </div>
                      <div className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7f99]">New Plan Name</span>
                          <strong className="text-[#2568e0]">{selectedPlan.planName}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7f99]">Billing Cycle</span>
                          <span className="font-semibold text-amber-700 capitalize">{billingCycle}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7f99]">New Plan Price</span>
                          <span className="font-semibold text-black">
                            ₹{newPlanPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[#6b7f99]">
                            <CalendarDays size={13} />
                            New Plan Starts
                          </span>
                          <span className="font-semibold text-emerald-600">{fmtDate(newPlanStart)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6b7f99]">New Plan Expires</span>
                          <span className="font-semibold text-red-600">{fmtDate(newPlanEnd)}</span>
                        </div>
                      </div>
                    </div>

                    {/* PRORATION / CREDIT BREAKDOWN */}
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-black">
                        <span className="flex items-center gap-1.5 text-black font-medium">
                          <Tag size={13} className="text-emerald-600" />
                          New Plan Price
                        </span>
                        <span className="font-bold text-black">
                          ₹{newPlanPrice.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {unusedCredit > 0 && (
                        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-emerald-700">
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="font-medium text-emerald-700 text-xs sm:text-sm">
                              Current Plan Balance Discount
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-emerald-600 leading-tight">
                              {rawCredit > unusedCredit
                                ? `Using ₹${unusedCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} from your ₹${rawCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} balance (${remainingUnusedDays}d left)`
                                : `Credit for ${remainingUnusedDays} unused days @ ₹${prorationPreview?.perDayCost || 0}/day`}
                            </span>
                          </div>
                          <span className="font-bold text-emerald-700 text-[11px] sm:text-sm shrink-0 whitespace-nowrap">
                            - ₹{unusedCredit.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-emerald-200/80 pt-2 text-xs sm:text-sm">
                        <span className="font-bold text-black">Total to Pay</span>
                        <div className="flex items-center gap-2">
                          {finalPayable === 0 && (
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                              Free
                            </span>
                          )}
                          <span className="text-base font-extrabold text-[#2568e0] sm:text-xl">
                            ₹{finalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

              <p className="mt-4 text-center text-[10px] leading-relaxed text-[#9aabc0] sm:text-xs">
                {finalPayable === 0
                  ? "Instant 1-click activation. No payment gateway needed. Your updated plan features will take effect immediately."
                  : "Instant activation powered by Cashfree. Your upgraded plan features will take effect immediately."}
              </p>

              {/* ACTION BUTTONS */}
              <div
                className="
                  mt-5
                  grid
                  grid-cols-1
                  gap-2.5
                  sm:grid-cols-2
                  sm:gap-3
                "
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPlan(null);
                  }}
                  disabled={processing}
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    rounded-xl
                    bg-slate-100
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-black
                    transition
                    hover:bg-slate-200
                    disabled:opacity-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={processing || loadingProration}
                  className={`
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    shadow-md
                    transition
                    hover:brightness-110
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    ${
                      finalPayable === 0
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/25"
                        : "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/25"
                    }
                  `}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {finalPayable === 0 ? "Activating..." : "Processing..."}
                    </>
                  ) : loadingProration ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : finalPayable === 0 ? (
                    <>
                      <CheckCircle2 className="h-4 cursor-pointer w-4" />
                      Confirm & Switch Plan 
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {isSubExpired
                        ? "Pay & Reactivate"
                        : unusedCredit > 0
                        ? `Pay & Upgrade (₹${finalPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                        : "Pay & Switch Plan"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          LOGIN REQUIRED MODAL (for unauthenticated users)
      ===================================================== */}
      {showLoginModal && (
        <div
          className="
            pu-fade
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-[#0b1d3d]/75
            p-4
            backdrop-blur-sm
          "
          onClick={() => setShowLoginModal(false)}
        >
          <div
            className="
              pu-pop
              w-full
              max-w-md
              overflow-hidden
              rounded-3xl
              bg-[#132f57]
              border
              border-white/15
              p-6
              text-white
              shadow-2xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Hotel Login Required</h3>
                  <p className="text-xs text-blue-200/70">
                    {hotelName ? `To upgrade ${hotelName}` : "Sign in to your account"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="rounded-lg p-1.5 text-blue-200/70 hover:bg-white/10 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="mt-4 text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Please log in with your registered hotel email address to upgrade or reactivate your subscription with your saved hotel settings.
            </p>

            {selectedPlan && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-blue-200/70 block">Selected Plan</span>
                  <span className="text-sm font-bold text-white">{selectedPlan.planName}</span>
                </div>
                <span className="text-sm font-extrabold text-blue-300">
                  ₹{getPrice(selectedPlan, billingCycle).toLocaleString("en-IN")}/{billingCycle}
                </span>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="flex-1 rounded-xl border border-white/20 bg-white/10 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/15"
              >
                Cancel
              </button>
              <Link
                to={`/hotel-login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] py-2.5 text-center text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/30 hover:brightness-110"
              >
                Log In Now →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main content container closing div */}
      </div>

      {/* =====================================================
          STANDALONE PUBLIC FOOTER
      ===================================================== */}
      {!isAuthenticated && (
        <footer className="mt-auto border-t border-white/10 bg-white/[0.02] py-4 text-center text-xs text-blue-200/60 shrink-0">
          <p>
            © {new Date().getFullYear()} StayLio · Developed by{" "}
            <a
              href="https://jayamwebsolutions.com/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-blue-200 hover:text-white hover:underline transition-colors"
            >
              Jayam Web Solutions
            </a>
            . All rights reserved.
          </p>
        </footer>
      )}
    </div>
  );
}