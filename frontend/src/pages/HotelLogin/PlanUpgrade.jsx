import React, { memo, useEffect, useRef, useState } from "react";
import { useAuth } from "../../Context/AuthContext";
import { useToast } from "../../Context/ToastContext";
import { getPublicActivePlans } from "../../service/planApi";
import { getMySubscription, upgradeHotelSubscription } from "../../service/subscriptionApi";
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
@keyframes pu-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes pu-pop{from{opacity:0;transform:translateY(22px) scale(.96)}to{opacity:1;transform:none}}
@keyframes pu-fade{from{opacity:0}to{opacity:1}}
.pu-in{opacity:0;animation:pu-up .5s cubic-bezier(.2,.7,.2,1) forwards}
.pu-pop{animation:pu-pop .3s cubic-bezier(.2,.8,.2,1)}
.pu-fade{animation:pu-fade .2s ease-out}
@media (prefers-reduced-motion:reduce){.pu-in{animation:none;opacity:1}.pu-pop,.pu-fade{animation:none}}
`;

const delay = (i, step = 70) => ({ animationDelay: `${Math.min(i, 10) * step}ms` });
const card = "rounded-3xl bg-white shadow-[0_18px_45px_rgba(6,20,52,0.16)]";

const InfoChip = ({ label, value, cls }) => (
  <div className={`rounded-2xl border px-4 py-3 flex items-center gap-2.5 ${cls}`}>
    <span className="text-xs text-white">{label}:</span>
    <strong className="text-sm">{value}</strong>
  </div>
);

const tiers = ["from-[#5b9bf5] to-[#2568e0]", "from-[#3b82f0] to-[#1d4fc4]", "from-[#4aa3ff] to-[#1f6fd8]", "from-[#6aa8f7] to-[#2f5fd0]"];

const PlanCard = memo(({ plan, index, isCurrent, price, billingCycle, onSelect }) => {
  const grad = tiers[index % tiers.length];

  return (
    <div
      style={delay(index + 2)}
      onClick={() => onSelect(plan)}
      className={`pu-in ${card} overflow-hidden flex flex-col transition-all duration-300 ${
        isCurrent ? "ring-2 ring-emerald-400" : "cursor-pointer hover:-translate-y-1.5 hover:shadow-[0_26px_60px_rgba(6,20,52,0.3)]"
      }`}
    >
      <div className={`relative overflow-hidden bg-gradient-to-br ${grad} p-5 text-white`}>
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/25 backdrop-blur flex items-center justify-center shrink-0">
              <Crown size={20} />
            </div>
            <h2 className="font-bold text-lg truncate">{plan.planName}</h2>
          </div>

          {isCurrent && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-400/25 border border-emerald-200/40 text-emerald-50">
              <CheckCircle2 size={12} /> Current
            </span>
          )}
        </div>

        {plan.description && <p className="relative mt-3 text-xs text-blue-100 line-clamp-2">{plan.description}</p>}

        <div className="relative mt-4 flex items-end gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight">₹{price.toLocaleString("en-IN")}</span>
          <span className="pb-1 text-xs text-blue-100">/ {billingCycle}</span>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[[BedDouble, plan.limits?.rooms, "Rooms"], [Building2, plan.limits?.branches, "Branches"], [Users, plan.limits?.receptionists, "Staff"]].map(([Icon, v, l]) => (
            <div key={l} className="text-center p-3 rounded-xl border border-[#e7eff8]">
              <Icon size={17} className="mx-auto text-[#2568e0]" />
              <p className="text-lg font-extrabold text-[#0e2a4a] mt-1">{v || 0}</p>
              <p className="text-[10px] text-[#6b7f99] truncate">{l}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {plan.features?.foodService && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold"><UtensilsCrossed size={13} /> Food</span>
          )}
          {plan.features?.roomService && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#eaf3ff] text-[#2568e0] text-xs font-semibold"><Wrench size={13} /> Room Service</span>
          )}
          {!plan.features?.foodService && !plan.features?.roomService && <span className="text-xs text-[#9aabc0]">No additional features</span>}
        </div>

        {!isCurrent && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(plan); }}
            className="mt-auto w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] hover:brightness-110 text-white text-sm font-bold shadow-md shadow-blue-500/25 transition"
          >
            <Sparkles size={16} /> Select This Plan
          </button>
        )}
      </div>
    </div>
  );
});

export default function PlanUpgrade() {
  const { userData } = useAuth();
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
        if (!cancelled) toastRef.current.error(err.message || "Failed to load plans.");
      } finally {
        if (!cancelled) setLoadingPlans(false);
      }
    };
    fetchPlans();
    return () => { cancelled = true; };
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
        if (!cancelled) console.warn("No active subscription found.");
      } finally {
        if (!cancelled) setLoadingSub(false);
      }
    };
    fetchSub();
    return () => { cancelled = true; };
  }, []);

  const getPrice = (plan, cycle) => plan?.pricing?.[cycle] ?? 0;

  const currentPlanId =
    typeof currentSub?.planId === "object" ? currentSub?.planId?._id : currentSub?.planId;

  const handleSelectPlan = (plan) => {
    if (String(plan._id) === String(currentPlanId)) {
      toastRef.current.info("You are already on this plan.");
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
        toastRef.current.success(res.message || "Plan upgraded successfully!");
        setCurrentSub(res.data);
        setShowPaymentModal(false);
        setSelectedPlan(null);
      } else {
        toastRef.current.error(res.message || "Upgrade failed. Please try again.");
      }
    } catch (err) {
      toastRef.current.error(err.message || "Upgrade failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const isLoading = loadingPlans || loadingSub;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
        <span className="text-blue-100 text-lg">Loading plans...</span>
      </div>
    );
  }

  const currentPlanObj = typeof currentSub?.planId === "object" ? currentSub?.planId : null;

  const hotelName =
    (typeof currentSub?.hotelId === "object" ? currentSub?.hotelId?.hotelName : null) ||
    userData?.hotelName ||
    userData?.name ||
    "Your Hotel";

  const daysLeft = currentSub?.endDate
    ? Math.max(0, Math.ceil((new Date(currentSub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // Preview dates for the confirm modal
  const cycleDays = { monthly: 30, quarterly: 90, halfYearly: 180, yearly: 365 };
  const previewDays = cycleDays[billingCycle] || selectedPlan?.validityDays || 30;
  const previewStart = new Date();
  const previewEnd = new Date(previewStart);
  previewEnd.setDate(previewEnd.getDate() + previewDays);

  return (
    <div className="max-w-[1200px] mx-auto font-['Inter']">
      <style>{styles}</style>

      {/* HEADER */}
      <div className="pu-in mb-6">
        <h1 className="flex items-center gap-3 text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] font-extrabold tracking-[-0.02em] text-white">
          <span className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
            <ArrowUpCircle className="w-6 h-6" />
          </span>
          Upgrade Your Plan
        </h1>

        <p className="text-sm text-blue-100/80 mt-2">
          Hotel: <strong className="text-white">{hotelName}</strong>
          {currentPlanObj && (
            <>
              {" "}&bull; Current Plan: <strong className="text-emerald-300">{currentPlanObj.planName}</strong>
              {" "}&bull; Billing: <strong className="text-amber-300">{currentSub?.billingCycle}</strong>
              {" "}&bull; Status: <strong className={currentSub?.status === "active" ? "text-emerald-300" : "text-red-300"}>{currentSub?.status}</strong>
            </>
          )}
        </p>

        {/* VALIDITY DATES */}
        {currentSub?.startDate && currentSub?.endDate && (
          <div className="mt-4 flex flex-wrap gap-3">
            <InfoChip label="Valid From" value={fmtDate(currentSub.startDate)} cls="bg-emerald-500/10 border-emerald-300/25 text-white" />
            <InfoChip label="Expires On" value={fmtDate(currentSub.endDate)} cls="bg-red-500/10 border-red-300/25 text-white" />
            <InfoChip label="Days Left" value={`${daysLeft} days`} cls="bg-white/10 border-white/20 text-white" />
          </div>
        )}
      </div>

      {/* BILLING CYCLE SELECTOR */}
      <div style={delay(1)} className="pu-in flex flex-wrap gap-2 mb-6">
        {BILLING_CYCLES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setBillingCycle(c.key)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              billingCycle === c.key
                ? "bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white shadow-md shadow-blue-500/25"
                : "bg-white/10 border border-white/20 text-blue-100 hover:bg-white/15"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* PLANS GRID */}
      {plans.length === 0 ? (
        <div className={`pu-pop ${card} py-16 text-center`}>
          <CreditCard className="w-12 h-12 mx-auto text-[#c7d6ea]" />
          <p className="mt-4 text-lg font-semibold text-[#6b7f99]">No plans available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pb-4">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan._id}
              plan={plan}
              index={i}
              isCurrent={String(plan._id) === String(currentPlanId)}
              price={getPrice(plan, billingCycle)}
              billingCycle={billingCycle}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      )}

      {/* PAYMENT CONFIRMATION MODAL */}
      {showPaymentModal && selectedPlan && (
        <div
          className="pu-fade fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0b1d3d]/65 backdrop-blur-sm p-0 sm:p-4"
          onClick={() => { if (!processing) { setShowPaymentModal(false); setSelectedPlan(null); } }}
        >
          <div
            className="pu-pop w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-[0_24px_70px_rgba(6,20,52,0.45)] overflow-hidden max-h-[94vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-gradient-to-r from-[#5b9bf5] to-[#2568e0] text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><CreditCard size={20} /></div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold">Confirm Plan Upgrade</h3>
                  <p className="text-xs text-blue-100 mt-0.5">Review the details before you confirm.</p>
                </div>
              </div>
              <button type="button" onClick={() => { if (!processing) { setShowPaymentModal(false); setSelectedPlan(null); } }} disabled={processing} aria-label="Close"
                className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center disabled:opacity-50 shrink-0 transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto">
              <p className="text-sm text-[#6b7f99] mb-4">
                You are upgrading to <strong className="text-[#2568e0]">{selectedPlan.planName}</strong> with{" "}
                <strong className="text-amber-600">{billingCycle}</strong> billing.
              </p>

              <div className="rounded-2xl bg-[#f4f8fd] border border-[#e7eff8] p-4 space-y-2.5">
                {[["Plan", selectedPlan.planName], ["Billing Cycle", billingCycle], ["Hotel", hotelName]].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-3 text-sm">
                    <span className="text-[#6b7f99]">{l}</span>
                    <span className="font-semibold text-[#0e2a4a]">{v}</span>
                  </div>
                ))}

                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-[#6b7f99] flex items-center gap-1.5"><CalendarDays size={13} /> New Plan Starts</span>
                  <span className="font-semibold text-emerald-600">{fmtDate(previewStart)}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-[#6b7f99]">New Plan Expires</span>
                  <span className="font-semibold text-red-600">{fmtDate(previewEnd)}</span>
                </div>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-[#6b7f99]">Validity</span>
                  <span className="font-semibold text-[#2568e0]">{previewDays} days</span>
                </div>

                <div className="pt-3 mt-1 border-t border-[#e2ebf7] flex justify-between items-center">
                  <span className="font-bold text-[#0e2a4a]">Total</span>
                  <span className="text-xl font-extrabold text-[#2568e0]">₹{getPrice(selectedPlan, billingCycle).toLocaleString("en-IN")}</span>
                </div>
              </div>

              <p className="text-xs text-[#9aabc0] text-center mt-4">
                This is a dummy payment. Your subscription will be upgraded immediately.
              </p>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setSelectedPlan(null); }}
                  disabled={processing}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold disabled:opacity-50 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUpgrade}
                  disabled={processing}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:brightness-110 text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-emerald-500/25 transition"
                >
                  {processing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> Pay &amp; Upgrade</>
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