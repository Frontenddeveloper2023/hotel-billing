import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  AlertOctagon,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../Context/AuthContext";
import { useToast } from "../Context/ToastContext";
import { getMySubscription } from "../service/subscriptionApi";

export default function SubscriptionAlertBanner() {
  const navigate = useNavigate();
  const { isAuthenticated, userData } = useAuth();
  const toast = useToast();

  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const lastToastStatusRef = useRef(null);

  // ==========================================================
  // CALCULATE EXPIRY & STATUS
  // ==========================================================
  const computeStatus = useCallback((subscription, isExpiredExplicit) => {
    if (!subscription) return null;

    const now = new Date();
    const endDate = subscription.endDate ? new Date(subscription.endDate) : null;

    // Days remaining difference (rounded)
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

    return {
      subscription,
      daysRemaining: daysRemaining ?? 0,
      isExpired,
      isCancelled,
      isExpiringSoon,
      status: subscription.status,
      planName: subscription.planId?.planName || "Current Plan",
      cancellationReason: subscription.cancellationReason || "",
    };
  }, []);

  // ==========================================================
  // FETCH SUBSCRIPTION STATUS
  // ==========================================================
  const checkStatus = useCallback(async (isInitial = false) => {
    // Only check for logged-in hotel users (not main SaaS admin)
    if (!isAuthenticated || userData?.role === "admin") {
      setLoading(false);
      return;
    }

    try {
      const res = await getMySubscription();
      if (res?.success && res?.data) {
        const computed = computeStatus(res.data, res.isExpired);
        setSubData(computed);

        // Toast notifications immediately on status detection (zero-refresh)
        if (computed) {
          const statusKey = `${computed.isExpired ? "expired" : computed.isCancelled ? "cancelled" : computed.isExpiringSoon ? `expiring_${computed.daysRemaining}` : "active"}`;

          // Only fire toast if status changed or initial load
          if (lastToastStatusRef.current !== statusKey) {
            lastToastStatusRef.current = statusKey;

            if (computed.isExpired) {
              toast.error(
                "Your plan subscription has expired! Please upgrade to continue your work.",
                6000
              );
            } else if (computed.isCancelled) {
              const reasonText = computed.cancellationReason
                ? `: ${computed.cancellationReason}`
                : "";
              toast.error(
                `Your plan subscription was cancelled by admin${reasonText}. Please upgrade or reactivate.`,
                6000
              );
            } else if (computed.isExpiringSoon) {
              if (computed.daysRemaining === 0) {
                toast.warn(
                  "Your plan expires today! Please upgrade now to continue your work without interruption.",
                  5000
                );
              } else if (computed.daysRemaining === 1) {
                toast.warn(
                  "Your plan is going to expire in 1 day (tomorrow)! Upgrade now to continue your work.",
                  5000
                );
              } else {
                toast.warn(
                  `Your plan is going to expire in ${computed.daysRemaining} days. Upgrade to continue your work.`,
                  5000
                );
              }
            }
          }
        }
      }
    } catch (err) {
      // If 404 and hotel account exists, user has no active subscription
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
  }, [isAuthenticated, userData, computeStatus, toast]);

  useEffect(() => {
    checkStatus(true);

    // Listen to real-time subscription update event
    const handleSubscriptionUpdated = () => {
      checkStatus(false);
    };

    window.addEventListener("subscriptionUpdated", handleSubscriptionUpdated);

    // Check periodically every 30 seconds for background expiration without refresh
    const interval = setInterval(() => {
      checkStatus(false);
    }, 30000);

    return () => {
      window.removeEventListener("subscriptionUpdated", handleSubscriptionUpdated);
      clearInterval(interval);
    };
  }, [checkStatus]);

  // Navigate to upgrade plan page
  const handleUpgradeClick = () => {
    navigate("/saas-user/choose-plan");
  };

  if (loading || !subData) return null;

  // ----------------------------------------------------------
  // 1. EXPIRED BANNER
  // ----------------------------------------------------------
  if (subData.isExpired) {
    return (
      <div className="w-full bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white shadow-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-xs animate-pulse">
              <AlertOctagon size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                  Subscription Expired
                </span>
                <span className="text-xs sm:text-sm font-bold">
                  Your plan has expired. Please upgrade to continue your work!
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-red-100 mt-0.5">
                Room management, new bookings, and receptionist features are paused until renewal.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpgradeClick}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-red-700 hover:bg-red-50 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles size={14} className="text-red-600" />
            <span>Upgrade Plan</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // 2. CANCELLED / SUSPENDED BY ADMIN BANNER
  // ----------------------------------------------------------
  if (subData.isCancelled) {
    return (
      <div className="w-full bg-gradient-to-r from-rose-700 via-pink-700 to-red-800 text-white shadow-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                  {subData.status === "suspended" ? "Plan Suspended" : "Plan Cancelled by Admin"}
                </span>
                <span className="text-xs sm:text-sm font-bold">
                  {subData.cancellationReason
                    ? `Reason: ${subData.cancellationReason}`
                    : "Your subscription was cancelled by the administrator."}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-rose-100 mt-0.5">
                Please choose a plan to reactivate your hotel operations immediately.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpgradeClick}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Reactivate Plan</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // 3. EXPIRING SOON IN <= 3 DAYS BANNER
  // ----------------------------------------------------------
  if (subData.isExpiringSoon) {
    const days = subData.daysRemaining;
    const daysText =
      days === 0
        ? "today"
        : days === 1
        ? "1 day"
        : `${days} days`;

    return (
      <div className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-xs animate-bounce">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 justify-center sm:justify-start flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider bg-white/25 px-2.5 py-0.5 rounded-full text-white">
                  ⏳ Expires in {daysText}
                </span>
                <span className="text-xs sm:text-sm font-bold">
                  {days === 0
                    ? "Your plan expires today! Upgrade now to continue your work without interruption."
                    : `Your plan is going to expire in ${daysText}. Upgrade to continue your work without interruption.`}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100 mt-0.5">
                Current Plan: <strong>{subData.planName}</strong> &bull; Existing hotel details will be auto-linked on checkout.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUpgradeClick}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-orange-700 hover:bg-orange-50 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles size={14} className="text-orange-600" />
            <span>Upgrade Plan</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
