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
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="flex items-start gap-3 sm:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-300">
                <AlertOctagon size={20} />
              </div>
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide text-amber-900 ring-1 ring-amber-300">
                    Free Trial Ended
                  </span>
                  <span className="text-xs sm:text-sm md:text-[15px] font-bold text-[#0E2A4A]">
                    Your free trial has ended. Purchase an active plan to continue.
                  </span>
                </div>
                <p className="mt-0.5 text-xs sm:text-sm text-[#64748B] leading-relaxed">
                  You have full read-only access. Upgrade to reactivate room creation, bookings, and billing operations.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="inline-flex h-10 w-full sm:w-auto shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-4 text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2868DA] active:translate-y-0"
            >
              <Sparkles size={16} />
              <span>Purchase Plan</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full border-b border-red-200 bg-gradient-to-r from-[#FFF5F5] via-white to-[#FFF7F7] text-[#172B4D] shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 ring-1 ring-red-200">
              <AlertOctagon size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide text-red-700">
                  Plan Expired
                </span>
                <span className="text-xs sm:text-sm md:text-[15px] font-bold text-[#0E2A4A]">
                  Your hotel plan has ended.
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-[#64748B] leading-relaxed">
                Renew your plan to restore room management, bookings, and receptionist features.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="inline-flex h-10 w-full sm:w-auto shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-4 text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2868DA] active:translate-y-0"
          >
            <Sparkles size={16} />
            <span>Renew Plan</span>
            <ArrowRight size={16} />
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
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 ring-1 ring-rose-200">
              <ShieldAlert size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide text-rose-700">
                  {subData.status === "suspended" ? "Plan Suspended" : "Plan Cancelled"}
                </span>
                <span className="text-xs sm:text-sm md:text-[15px] font-bold text-[#0E2A4A]">
                  Your hotel plan is currently unavailable.
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-[#64748B] leading-relaxed">
                {subData.cancellationReason
                  ? `Reason: ${subData.cancellationReason}`
                  : "Choose a new plan to continue using your hotel system."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="inline-flex h-10 w-full sm:w-auto shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-4 text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2868DA] active:translate-y-0"
          >
            <Sparkles size={16} />
            <span>Choose Plan</span>
            <ArrowRight size={16} />
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
    const daysText = days === 0 ? "today" : days === 1 ? "1 day" : `${days} days`;

    return (
      <div className="w-full border-b border-amber-200 bg-gradient-to-r from-[#FFF9EB] via-white to-[#FFF8EE] text-[#172B4D] shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 ring-1 ring-amber-200">
              <Clock size={20} />
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide text-amber-700">
                  {subData.isTrial ? `Trial ends in ${daysText}` : `Expires in ${daysText}`}
                </span>
                <span className="text-xs sm:text-sm md:text-[15px] font-bold text-[#0E2A4A]">
                  {subData.isTrial ? "Your free trial is ending soon." : "Your plan is ending soon."}
                </span>
              </div>
              <p className="mt-0.5 text-xs sm:text-sm text-[#64748B] leading-relaxed">
                {subData.isTrial ? (
                  "Purchase an active plan to continue using your portal without interruption."
                ) : (
                  <>
                    Current plan: <strong className="font-bold text-[#334155]">{subData.planName}</strong>. Renew now to keep your hotel system running.
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUpgradeClick}
            className="inline-flex h-10 w-full sm:w-auto shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-4 text-xs sm:text-sm font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2868DA] active:translate-y-0"
          >
            <Sparkles size={16} />
            <span>{subData.isTrial ? "Purchase Plan" : "Renew Now"}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}