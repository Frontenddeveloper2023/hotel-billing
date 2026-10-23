import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getMySubscription } from "../service/subscriptionApi";

// ==========================================================
// SUBSCRIPTION CONTEXT
// ==========================================================
//
// Fetches subscription status ONCE per session (on mount),
// caches the result in memory, and provides it to any
// component that needs it — avoiding repeated API calls
// on every route change.
//
// Also listens to:
//   • "subscriptionUpdated" window event  → immediate re-fetch
//   • 30-second polling interval          → background freshness
//
// ==========================================================

const SubscriptionContext = createContext(null);

export function SubscriptionProvider({ children }) {
  const { isAuthenticated, userData } = useAuth();

  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  // ----------------------------------------------------------
  // COMPUTE STATUS (pure function — same logic as before)
  // ----------------------------------------------------------
  const computeStatus = useCallback((subscription, isExpiredExplicit) => {
    if (!subscription) return null;

    const now = new Date();
    const endDate = subscription.endDate ? new Date(subscription.endDate) : null;

    let daysRemaining = null;
    if (endDate) {
      const diffTime = endDate.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const isExpired =
      isExpiredExplicit === true ||
      subscription.status === "expired" ||
      (endDate && now >= endDate) ||
      (daysRemaining !== null && daysRemaining <= 0);

    const isCancelled =
      subscription.status === "cancelled" ||
      subscription.status === "suspended";

    const isExpiringSoon =
      !isExpired &&
      !isCancelled &&
      daysRemaining !== null &&
      daysRemaining <= 3 &&
      daysRemaining >= 0;

    const isTrial = Boolean(
      subscription.billingCycle === "trial" ||
      subscription.trialStatus === "active" ||
      subscription.status === "trial" ||
      subscription.planId?.planName?.toLowerCase().includes("trial")
    );

    return {
      subscription,
      daysRemaining: daysRemaining ?? 0,
      isExpired,
      isCancelled,
      isExpiringSoon,
      isTrial,
      status: subscription.status,
      planName: subscription.planId?.planName || (isTrial ? "Free Trial" : "Current Plan"),
      cancellationReason: subscription.cancellationReason || "",
    };
  }, []);

  // ----------------------------------------------------------
  // FETCH
  // ----------------------------------------------------------
  const checkStatus = useCallback(async () => {
    if (!isAuthenticated || userData?.role === "admin") {
      setLoading(false);
      return;
    }

    try {
      const res = await getMySubscription();

      if (res?.success && res?.data) {
        const computed = computeStatus(res.data, res.isExpired);
        setSubData(computed);
      }
    } catch (err) {
      if (err?.status === 404 || err?.response?.status === 404) {
        setSubData({
          isExpired: true,
          isCancelled: false,
          isExpiringSoon: false,
          daysRemaining: 0,
          planName: "None",
          cancellationReason: "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, userData, computeStatus]);

  // ----------------------------------------------------------
  // LIFECYCLE: single fetch on mount + polling + event listener
  // ----------------------------------------------------------
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      checkStatus();
    }

    const handleSubscriptionUpdated = () => {
      checkStatus();
    };

    window.addEventListener("subscriptionUpdated", handleSubscriptionUpdated);

    const interval = setInterval(() => {
      checkStatus();
    }, 30000);

    return () => {
      window.removeEventListener("subscriptionUpdated", handleSubscriptionUpdated);
      clearInterval(interval);
    };
  }, [checkStatus]);

  // ----------------------------------------------------------
  // PUBLIC: allow manual refresh from any consumer
  // ----------------------------------------------------------
  const refresh = useCallback(() => {
    return checkStatus();
  }, [checkStatus]);

  return (
    <SubscriptionContext.Provider value={{ subData, loading, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return ctx;
}

export default SubscriptionContext;
