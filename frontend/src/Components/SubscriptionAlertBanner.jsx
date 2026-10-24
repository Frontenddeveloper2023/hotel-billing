import React, { useEffect, useRef } from "react";
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
import { useSubscription } from "../Context/SubscriptionContext";

export default function SubscriptionAlertBanner() {
  const navigate = useNavigate();
  const { isAuthenticated, userData } = useAuth();
  const toast = useToast();

  // ──────────────────────────────────────────────────────────
  // USE SHARED SUBSCRIPTION CONTEXT (no more per-component fetch)
  // ──────────────────────────────────────────────────────────
  const { subData, loading } = useSubscription();

  const lastToastStatusRef = useRef(null);

  // ==========================================================
  // TOAST NOTIFICATIONS (fire once per unique status change)
  // ==========================================================
  useEffect(() => {
    if (!subData) return;

    const statusKey = `${subData.isExpired ? "expired" : subData.isCancelled ? "cancelled" : subData.isExpiringSoon ? `expiring_${subData.daysRemaining}` : "active"}`;

    if (lastToastStatusRef.current !== statusKey) {
      lastToastStatusRef.current = statusKey;

      if (subData.isExpired) {
        if (subData.isTrial) {
          toast.warn(
            "Your free trial was ended so purchase any active plan and continue your portal.",
            6000
          );
        } else {
          toast.warn(
            "Your plan subscription has expired! Please upgrade to continue your work.",
            6000
          );
        }
      } else if (subData.isCancelled) {
        const reasonText = subData.cancellationReason
          ? `: ${subData.cancellationReason}`
          : "";
        toast.warn(
          `Your plan subscription was cancelled by admin${reasonText}. Please upgrade or reactivate.`,
          6000
        );
      } else if (subData.isExpiringSoon) {
        if (subData.isTrial) {
          const daysText = subData.daysRemaining === 0 ? "today" : subData.daysRemaining === 1 ? "1 day (tomorrow)" : `${subData.daysRemaining} days`;
          toast.warn(
            `Your free trial expires ${daysText}! Purchase an active plan to continue your portal.`,
            5000
          );
        } else if (subData.daysRemaining === 0) {
          toast.warn(
            "Your plan expires today! Please upgrade now to continue your work without interruption.",
            5000
          );
        } else if (subData.daysRemaining === 1) {
          toast.warn(
            "Your plan is going to expire in 1 day (tomorrow)! Upgrade now to continue your work.",
            5000
          );
        } else {
          toast.warn(
            `Your plan is going to expire in ${subData.daysRemaining} days. Upgrade to continue your work.`,
            5000
          );
        }
      }
    }
  }, [subData, toast]);

  const handleUpgradeClick = () => {
    navigate("/plan-upgrade");
  };

  if (loading || !subData) return null;

  // ----------------------------------------------------------
  // 1. EXPIRED BANNER (FREE TRIAL vs REGULAR PLAN)
  // ----------------------------------------------------------
  if (subData.isExpired) {
    if (subData.isTrial) {
      return (
        <div className="w-full border-b border-amber-300 bg-gradient-to-r from-[#FFFBEB] via-[#FEF3C7] to-[#FFFBEB] text-[#172B4D] shadow-sm">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="shrink-0 rounded-full bg-amber-200/90 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-900 ring-1 ring-amber-300 sm:text-[10px]">
                Trial Ended
              </span>
              <p className="truncate text-xs font-bold text-[#0E2A4A] sm:text-sm">
                Free trial ended. Activate a plan to resume billing & bookings.
              </p>
            </div>
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[#347BE9] px-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#2868DA] active:scale-[0.98] sm:h-8 sm:px-3 sm:text-xs"
            >
              <Sparkles size={12} className="shrink-0" />
              <span>Choose Plan</span>
              <ArrowRight size={12} className="shrink-0" />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full border-b border-red-200 bg-gradient-to-r from-[#FFF5F5] via-white to-[#FFF7F7] text-[#172B4D] shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-700 sm:text-[10px]">
              Expired
            </span>
            <p className="truncate text-xs font-bold text-[#0E2A4A] sm:text-sm">
              Subscription expired. Renew to continue hotel operations.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[#347BE9] px-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#2868DA] active:scale-[0.98] sm:h-8 sm:px-3 sm:text-xs"
          >
            <span>Renew Plan</span>
            <ArrowRight size={12} className="shrink-0" />
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
      <div className="w-full border-b border-rose-200 bg-gradient-to-r from-[#FFF5F7] via-white to-[#FFF7F8] text-[#172B4D] shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-700 sm:text-[10px]">
              {subData.status === "suspended" ? "Suspended" : "Cancelled"}
            </span>
            <p className="truncate text-xs font-bold text-[#0E2A4A] sm:text-sm">
              Plan unavailable. Select a new plan to resume.
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[#347BE9] px-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#2868DA] active:scale-[0.98] sm:h-8 sm:px-3 sm:text-xs"
          >
            <Sparkles size={12} className="shrink-0" />
            <span>Choose Plan</span>
            <ArrowRight size={12} className="shrink-0" />
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
    const daysText = days === 0 ? "today" : days === 1 ? "in 1d" : `in ${days}d`;

    return (
      <div className="w-full border-b border-amber-200 bg-gradient-to-r from-[#FFF9EB] via-white to-[#FFF8EE] text-[#172B4D] shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-700 sm:text-[10px]">
              Ends {daysText}
            </span>
            <p className="truncate text-xs font-bold text-[#0E2A4A] sm:text-sm">
              {subData.isTrial ? "Trial ends soon. Upgrade to keep access." : "Plan expiring soon. Renew to avoid disruption."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[#347BE9] px-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#2868DA] active:scale-[0.98] sm:h-8 sm:px-3 sm:text-xs"
          >
            <Sparkles size={12} className="shrink-0" />
            <span>{subData.isTrial ? "Pick Plan" : "Renew Now"}</span>
            <ArrowRight size={12} className="shrink-0" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}