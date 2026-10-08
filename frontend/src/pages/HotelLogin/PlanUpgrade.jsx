import React, { memo, useEffect, useRef, useState } from "react";

import { useAuth } from "../../Context/AuthContext";

import { useToast } from "../../Context/ToastContext";

import { getPublicActivePlans } from "../../service/planApi";

import {
  getMySubscription,
  upgradeHotelSubscription,
} from "../../service/subscriptionApi";

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
      px-3
      py-2.5
      sm:gap-2.5
      sm:px-4
      sm:py-3
      ${cls}
    `}
  >
    <span className="shrink-0 text-[11px] text-white sm:text-xs">
      {label}:
    </span>

    <strong className="min-w-0 truncate text-xs sm:text-sm">
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
  ({ plan, index, isCurrent, price, billingCycle, onSelect }) => {
    const grad = tiers[index % tiers.length];

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

          <div
            className="
              relative
              mt-4
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
              ₹{price.toLocaleString("en-IN")}
            </span>

            <span className="pb-0.5 text-[10px] text-blue-100 sm:pb-1 sm:text-xs">
              / {billingCycle}
            </span>
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
  const { hotelUser: userData } = useAuth();

  const toast = useToast();

  const toastRef = useRef(toast);
  toastRef.current = toast;

  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [processing, setProcessing] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingSub, setLoadingSub] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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

  const getPrice = (plan, cycle) =>
    plan?.pricing?.[cycle] ?? 0;

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

  const handleSelectPlan = (plan) => {
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
  };

  const handleUpgrade = async () => {
    if (!selectedPlan) return;

    setProcessing(true);

    try {
      const res = await upgradeHotelSubscription({
        planId: selectedPlan._id,
        billingCycle,
      });

      if (res.success) {
        toastRef.current.success(
          res.message || "Plan upgraded successfully!"
        );

        setCurrentSub(res.data);
        setShowPaymentModal(false);
        setSelectedPlan(null);
      } else {
        toastRef.current.error(
          res.message || "Upgrade failed. Please try again."
        );
      }
    } catch (err) {
      toastRef.current.error(
        err.message || "Upgrade failed. Please try again."
      );
    } finally {
      setProcessing(false);
    }
  };

  const isLoading = loadingPlans || loadingSub;

  if (isLoading) {
    return (
      <div
        className="
          flex
          min-h-[60vh]
          w-full
          items-center
          justify-center
          gap-3
          px-4
        "
      >
        <Loader2 className="h-7 w-7 animate-spin text-white sm:h-8 sm:w-8" />

        <span className="text-sm text-blue-100 sm:text-lg">
          Loading plans...
        </span>
      </div>
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
    "Your Hotel";

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

  return (
    <div
      className="
        mx-auto
        w-full
        max-w-[1200px]
        min-w-0
        overflow-x-hidden
        px-3
        font-['Inter']
        sm:px-4
        md:px-5
        lg:px-6
        xl:px-0
      "
    >
      <style>{styles}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="pu-in mb-5 min-w-0 sm:mb-6">
        <div
          className="
            flex
            min-w-0
            flex-col
            gap-3
            sm:gap-4
          "
        >
          <h1
            className="
              flex
              min-w-0
              items-center
              gap-2.5
              text-[clamp(1.35rem,5vw,2rem)]
              font-extrabold
              tracking-[-0.02em]
              text-white
              sm:gap-3
            "
          >
            <span
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-white/20
                bg-white/15
                sm:h-10
                sm:w-10
                sm:rounded-2xl
              "
            >
              <ArrowUpCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>

            <span className="min-w-0">
              Upgrade Your Plan
            </span>
          </h1>

          <p
            className="
              min-w-0
              break-words
              text-xs
              leading-relaxed
              text-blue-100/80
              sm:text-sm
            "
          >
            Hotel:{" "}
            <strong className="text-white">
              {hotelName}
            </strong>

            {currentPlanObj && (
              <>
                {" "}
                <span className="hidden sm:inline">
                  &bull;
                </span>{" "}
                <span className="sm:inline">
                  Current Plan:{" "}
                </span>

                <strong className="text-emerald-300">
                  {currentPlanObj.planName}
                </strong>

                {" "}
                <span className="hidden sm:inline">
                  &bull;
                </span>{" "}
                <span className="sm:inline">
                  Billing:{" "}
                </span>

                <strong className="text-amber-300">
                  {currentSub?.billingCycle}
                </strong>

                {" "}
                <span className="hidden sm:inline">
                  &bull;
                </span>{" "}
                <span className="sm:inline">
                  Status:{" "}
                </span>

                <strong
                  className={
                    currentSub?.status === "active"
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                >
                  {currentSub?.status}
                </strong>
              </>
            )}
          </p>

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
                  cls="bg-emerald-500/10 border-emerald-300/25 text-white"
                />

                <InfoChip
                  label="Expires On"
                  value={fmtDate(currentSub.endDate)}
                  cls="bg-red-500/10 border-red-300/25 text-white"
                />

                <InfoChip
                  label="Days Left"
                  value={`${daysLeft} days`}
                  cls="bg-white/10 border-white/20 text-white"
                />
              </div>
            )}

          {/* EXPIRED BANNER */}
          {isSubExpired && (
            <div
              className="
                mt-2
                flex
                items-center
                gap-2.5
                rounded-2xl
                border
                border-amber-300/40
                bg-amber-500/20
                px-4
                py-3
                text-xs
                font-semibold
                text-amber-100
                backdrop-blur
                sm:text-sm
              "
            >
              <Sparkles size={18} className="shrink-0 text-amber-300" />
              <span>
                Your subscription has expired. You can choose and activate any plan below to restore your hotel service immediately.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          BILLING CYCLE SELECTOR
      ===================================================== */}

      <div
        style={delay(1)}
        className="
          pu-in
          pu-scroll
          mb-5
          flex
          w-full
          min-w-0
          gap-2
          overflow-x-auto
          pb-1
          sm:mb-6
        "
      >
        {BILLING_CYCLES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setBillingCycle(c.key)}
            className={`
              inline-flex
              min-h-10
              shrink-0
              cursor-pointer
              items-center
              justify-center
              rounded-xl
              px-4
              py-2.5
              text-xs
              font-bold
              transition-all
              duration-200
              active:scale-[0.98]
              sm:px-5
              sm:text-sm
              ${
                billingCycle === c.key
                  ? "bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white shadow-md shadow-blue-500/25"
                  : "border border-white/20 bg-white/10 text-blue-100 hover:bg-white/15"
              }
            `}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* =====================================================
          PLANS GRID
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
            grid
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
                  <CreditCard
                    size={18}
                    className="sm:h-5 sm:w-5"
                  />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold sm:text-lg">
                    Confirm Plan Upgrade
                  </h3>

                  <p className="mt-0.5 truncate text-[10px] text-blue-100 sm:text-xs">
                    Review the details before you confirm.
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
                You are upgrading to{" "}
                <strong className="text-[#2568e0]">
                  {selectedPlan.planName}
                </strong>{" "}
                with{" "}
                <strong className="text-amber-600">
                  {billingCycle}
                </strong>{" "}
                billing.
              </p>

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
                {[
                  ["Plan", selectedPlan.planName],
                  ["Billing Cycle", billingCycle],
                  ["Hotel", hotelName],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="
                      flex
                      min-w-0
                      flex-col
                      gap-1
                      text-xs
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                      sm:gap-3
                      sm:text-sm
                    "
                  >
                    <span className="shrink-0 text-[#6b7f99]">
                      {l}
                    </span>

                    <span
                      className="
                        min-w-0
                        break-words
                        font-semibold
                        text-[#0e2a4a]
                        sm:text-right
                      "
                    >
                      {v}
                    </span>
                  </div>
                ))}

                <div
                  className="
                    flex
                    min-w-0
                    flex-col
                    gap-1
                    text-xs
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    sm:gap-3
                    sm:text-sm
                  "
                >
                  <span className="flex shrink-0 items-center gap-1.5 text-[#6b7f99]">
                    <CalendarDays size={13} />
                    New Plan Starts
                  </span>

                  <span className="font-semibold text-emerald-600 sm:text-right">
                    {fmtDate(previewStart)}
                  </span>
                </div>

                <div
                  className="
                    flex
                    min-w-0
                    flex-col
                    gap-1
                    text-xs
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    sm:gap-3
                    sm:text-sm
                  "
                >
                  <span className="text-[#6b7f99]">
                    New Plan Expires
                  </span>

                  <span className="font-semibold text-red-600 sm:text-right">
                    {fmtDate(previewEnd)}
                  </span>
                </div>

                <div
                  className="
                    flex
                    min-w-0
                    flex-col
                    gap-1
                    text-xs
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                    sm:gap-3
                    sm:text-sm
                  "
                >
                  <span className="text-[#6b7f99]">
                    Validity
                  </span>

                  <span className="font-semibold text-[#2568e0] sm:text-right">
                    {previewDays} days
                  </span>
                </div>

                {/* TOTAL */}
                <div
                  className="
                    mt-1
                    flex
                    items-center
                    justify-between
                    gap-3
                    border-t
                    border-[#e2ebf7]
                    pt-3
                  "
                >
                  <span className="text-sm font-bold text-[#0e2a4a] sm:text-base">
                    Total
                  </span>

                  <span className="text-lg font-extrabold text-[#2568e0] sm:text-xl">
                    ₹
                    {getPrice(
                      selectedPlan,
                      billingCycle
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-center text-[10px] leading-relaxed text-[#9aabc0] sm:text-xs">
                This is a dummy payment. Your subscription
                will be upgraded immediately.
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
                    text-slate-700
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
                  disabled={processing}
                  className="
                    inline-flex
                    min-h-11
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-gradient-to-r
                    from-emerald-500
                    to-emerald-600
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    text-white
                    shadow-md
                    shadow-emerald-500/25
                    transition
                    hover:brightness-110
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                  "
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {isSubExpired ? "Pay & Reactivate" : "Pay & Upgrade"}
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
}