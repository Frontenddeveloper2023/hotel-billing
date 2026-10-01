import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../Context/AuthContext";
import { useToast } from "../../Context/ToastContext";
import { getPublicActivePlans } from "../../service/planApi";
import { getMySubscription, upgradeHotelSubscription } from "../../service/subscriptionApi";
import {
  CreditCard,
  CheckCircle,
  ArrowUpCircle,
  Loader2,
  BedDouble,
  Building2,
  Users,
  UtensilsCrossed,
  Wrench,
  Crown,
  Sparkles,
} from "lucide-react";

const BILLING_CYCLES = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "halfYearly", label: "Half-Yearly" },
  { key: "yearly", label: "Yearly" },
];

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

  const getPrice = (plan, cycle) => {
    return plan?.pricing?.[cycle] ?? 0;
  };

  const currentPlanId =
    typeof currentSub?.planId === "object"
      ? currentSub?.planId?._id
      : currentSub?.planId;

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-400 text-lg">Loading plans...</span>
      </div>
    );
  }

  const currentPlanObj =
    typeof currentSub?.planId === "object" ? currentSub?.planId : null;

  // Hotel name from populated subscription or userData
  const hotelName =
    (typeof currentSub?.hotelId === "object" ? currentSub?.hotelId?.hotelName : null) ||
    userData?.hotelName ||
    userData?.name ||
    "Your Hotel";

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#e2e8f0", display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
          <ArrowUpCircle style={{ width: 32, height: 32, color: "#60a5fa" }} />
          Upgrade Your Plan
        </h1>
        <p style={{ color: "#94a3b8", marginTop: "8px", fontSize: "15px" }}>
          Hotel: <strong style={{ color: "#cbd5e1" }}>{hotelName}</strong>
          {currentPlanObj && (
            <span>
              {" "}&bull; Current Plan: <strong style={{ color: "#22c55e" }}>{currentPlanObj.planName}</strong>
              {" "}&bull; Billing: <strong style={{ color: "#facc15" }}>{currentSub?.billingCycle}</strong>
              {" "}&bull; Status: <strong style={{ color: currentSub?.status === "active" ? "#22c55e" : "#ef4444" }}>{currentSub?.status}</strong>
            </span>
          )}
        </p>

        {/* Validity Dates */}
        {currentSub?.startDate && currentSub?.endDate && (
          <div style={{
            marginTop: "16px", display: "flex", gap: "16px", flexWrap: "wrap",
          }}>
            <div style={{
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: "12px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>Valid From:</span>
              <strong style={{ color: "#22c55e", fontSize: "14px" }}>
                {new Date(currentSub.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </strong>
            </div>
            <div style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "12px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>Expires On:</span>
              <strong style={{ color: "#ef4444", fontSize: "14px" }}>
                {new Date(currentSub.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </strong>
            </div>
            <div style={{
              background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
              borderRadius: "12px", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ color: "#94a3b8", fontSize: "13px" }}>Days Left:</span>
              <strong style={{ color: "#60a5fa", fontSize: "14px" }}>
                {Math.max(0, Math.ceil((new Date(currentSub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Billing Cycle Selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {BILLING_CYCLES.map((c) => (
          <button
            key={c.key}
            onClick={() => setBillingCycle(c.key)}
            style={{
              padding: "8px 20px",
              borderRadius: "10px",
              border: billingCycle === c.key ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.12)",
              background: billingCycle === c.key ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
              color: billingCycle === c.key ? "#60a5fa" : "#94a3b8",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
          <CreditCard style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.5 }} />
          <p style={{ fontSize: "18px" }}>No plans available at the moment.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {plans.map((plan) => {
            const isCurrent = String(plan._id) === String(currentPlanId);
            const price = getPrice(plan, billingCycle);

            return (
              <div
                key={plan._id}
                onClick={() => handleSelectPlan(plan)}
                style={{
                  position: "relative",
                  borderRadius: "16px",
                  padding: "28px 24px",
                  cursor: isCurrent ? "default" : "pointer",
                  border: isCurrent
                    ? "2px solid #22c55e"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: isCurrent
                    ? "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))"
                    : "rgba(255,255,255,0.04)",
                  transition: "all 0.25s ease",
                  boxShadow: isCurrent ? "0 0 20px rgba(34,197,94,0.1)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.border = "1px solid rgba(59,130,246,0.5)";
                    e.currentTarget.style.background = "rgba(59,130,246,0.06)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(59,130,246,0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {/* Current badge */}
                {isCurrent && (
                  <div style={{
                    position: "absolute", top: 12, right: 12, display: "flex", alignItems: "center", gap: 4,
                    background: "rgba(34,197,94,0.15)", color: "#22c55e", padding: "4px 12px", borderRadius: "20px",
                    fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                  }}>
                    <CheckCircle style={{ width: 14, height: 14 }} /> Current
                  </div>
                )}

                {/* Plan Name */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <Crown style={{ width: 22, height: 22, color: "#facc15" }} />
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                    {plan.planName}
                  </h2>
                </div>

                {/* Description */}
                {plan.description && (
                  <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "16px", lineHeight: 1.5 }}>
                    {plan.description}
                  </p>
                )}

                {/* Price */}
                <div style={{ marginBottom: "20px" }}>
                  <span style={{ fontSize: "32px", fontWeight: 800, color: "#60a5fa" }}>
                    {"\u20B9"}{price.toLocaleString("en-IN")}
                  </span>
                  <span style={{ color: "#64748b", fontSize: "14px", marginLeft: "4px" }}>
                    / {billingCycle}
                  </span>
                </div>

                {/* Limits */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "13px" }}>
                    <BedDouble style={{ width: 16, height: 16, color: "#818cf8" }} />
                    <span>{plan.limits?.rooms || 0} Rooms</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "13px" }}>
                    <Building2 style={{ width: 16, height: 16, color: "#818cf8" }} />
                    <span>{plan.limits?.branches || 0} Branches</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#cbd5e1", fontSize: "13px" }}>
                    <Users style={{ width: 16, height: 16, color: "#818cf8" }} />
                    <span>{plan.limits?.receptionists || 0} Receptionists</span>
                  </div>
                </div>

                {/* Features */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {plan.features?.foodService && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "3px 10px", borderRadius: "8px" }}>
                      <UtensilsCrossed style={{ width: 13, height: 13 }} /> Food
                    </span>
                  )}
                  {plan.features?.roomService && (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px", color: "#60a5fa", background: "rgba(96,165,250,0.1)", padding: "3px 10px", borderRadius: "8px" }}>
                      <Wrench style={{ width: 13, height: 13 }} /> Room Service
                    </span>
                  )}
                </div>

                {/* Upgrade Button */}
                {!isCurrent && (
                  <button
                    style={{
                      marginTop: "20px", width: "100%", padding: "10px", borderRadius: "10px", border: "none",
                      background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff",
                      fontWeight: 600, fontSize: "14px", cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center", gap: "6px", transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <Sparkles style={{ width: 16, height: 16 }} /> Select This Plan
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {showPaymentModal && selectedPlan && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          }}
          onClick={() => { if (!processing) { setShowPaymentModal(false); setSelectedPlan(null); } }}
        >
          <div
            style={{
              background: "#1e293b", borderRadius: "16px", padding: "32px", maxWidth: "460px", width: "90%",
              border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#e2e8f0", margin: "0 0 8px" }}>
              Confirm Plan Upgrade
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "14px", marginBottom: "20px" }}>
              You are upgrading to <strong style={{ color: "#60a5fa" }}>{selectedPlan.planName}</strong> with{" "}
              <strong style={{ color: "#facc15" }}>{billingCycle}</strong> billing.
            </p>

            <div style={{
              background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "16px", marginBottom: "20px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#94a3b8", fontSize: "14px" }}>Plan</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "14px" }}>{selectedPlan.planName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#94a3b8", fontSize: "14px" }}>Billing Cycle</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "14px" }}>{billingCycle}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ color: "#94a3b8", fontSize: "14px" }}>Hotel</span>
                <span style={{ color: "#e2e8f0", fontWeight: 600, fontSize: "14px" }}>{hotelName}</span>
              </div>
              {(() => {
                const today = new Date();
                const cycleDays = { monthly: 30, quarterly: 90, halfYearly: 180, yearly: 365 };
                const days = cycleDays[billingCycle] || (selectedPlan?.validityDays || 30);
                const endDate = new Date(today);
                endDate.setDate(endDate.getDate() + days);
                const fmt = (d) => d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                return (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "14px" }}>New Plan Starts</span>
                      <span style={{ color: "#22c55e", fontWeight: 600, fontSize: "14px" }}>{fmt(today)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "14px" }}>New Plan Expires</span>
                      <span style={{ color: "#ef4444", fontWeight: 600, fontSize: "14px" }}>{fmt(endDate)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#94a3b8", fontSize: "14px" }}>Validity</span>
                      <span style={{ color: "#60a5fa", fontWeight: 600, fontSize: "14px" }}>{days} days</span>
                    </div>
                  </>
                );
              })()}
              <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "12px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: "16px" }}>Total</span>
                <span style={{ color: "#22c55e", fontWeight: 800, fontSize: "20px" }}>
                  {"\u20B9"}{getPrice(selectedPlan, billingCycle).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "20px", textAlign: "center" }}>
              This is a dummy payment. Your subscription will be upgraded immediately.
            </p>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => { setShowPaymentModal(false); setSelectedPlan(null); }}
                disabled={processing}
                style={{
                  flex: 1, padding: "10px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: "14px", cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpgrade}
                disabled={processing}
                style={{
                  flex: 1, padding: "10px", borderRadius: "10px", border: "none",
                  background: processing ? "#475569" : "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#fff", fontWeight: 600, fontSize: "14px", cursor: processing ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
              >
                {processing ? (
                  <><Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> Processing...</>
                ) : (
                  <><CreditCard style={{ width: 16, height: 16 }} /> Pay & Upgrade</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
