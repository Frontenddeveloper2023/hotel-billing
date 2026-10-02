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

          const statusKey = `${computed.isExpired ? "expired" : computed.isCancelled ? "cancelled" : computed.isExpiringSoon ? `expiring\_${computed.daysRemaining}` : "active"}`;



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

    navigate("/plan-upgrade");

  };



  if (loading || !subData) return null;



  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // 1. EXPIRED BANNER
  // ----------------------------------------------------------
  if (subData.isExpired) {
    return (
      <div className="w-full border-b border-red-200 bg-gradient-to-r from-[#FFF5F5] via-white to-[#FFF7F7] text-[#172B4D] shadow-[0_4px_18px_rgba(15,42,74,0.06)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 ring-1 ring-red-200"><AlertOctagon size={19} /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-red-700">Plan expired</span>
                <span className="text-sm font-bold text-[#0E2A4A] sm:text-[15px]">Your hotel plan has ended.</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#64748B] sm:text-sm">Renew your plan to restore room management, bookings, and receptionist features.</p>
            </div>
          </div>
          <button type="button" onClick={handleUpgradeClick} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(52,123,233,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2868DA] hover:shadow-[0_12px_24px_rgba(52,123,233,0.25)] active:translate-y-0 sm:w-auto">
            <Sparkles size={15} /><span>Renew Plan</span><ArrowRight size={15} />
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
      <div className="w-full border-b border-rose-200 bg-gradient-to-r from-[#FFF5F7] via-white to-[#FFF7F8] text-[#172B4D] shadow-[0_4px_18px_rgba(15,42,74,0.06)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 ring-1 ring-rose-200"><ShieldAlert size={19} /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-rose-700">{subData.status === "suspended" ? "Plan suspended" : "Plan cancelled"}</span>
                <span className="text-sm font-bold text-[#0E2A4A] sm:text-[15px]">Your hotel plan is currently unavailable.</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#64748B] sm:text-sm">{subData.cancellationReason ? `Reason: ${subData.cancellationReason}` : "Choose a new plan to continue using your hotel system."}</p>
            </div>
          </div>
          <button type="button" onClick={handleUpgradeClick} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(52,123,233,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2868DA] hover:shadow-[0_12px_24px_rgba(52,123,233,0.25)] active:translate-y-0 sm:w-auto">
            <Sparkles size={15} /><span>Choose Plan</span><ArrowRight size={15} />
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
      <div className="w-full border-b border-amber-200 bg-gradient-to-r from-[#FFF9EB] via-white to-[#FFF8EE] text-[#172B4D] shadow-[0_4px_18px_rgba(15,42,74,0.06)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 ring-1 ring-amber-200"><Clock size={19} /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-amber-700">Expires in {daysText}</span>
                <span className="text-sm font-bold text-[#0E2A4A] sm:text-[15px]">Your plan is ending soon.</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#64748B] sm:text-sm">Current plan: <strong className="font-bold text-[#334155]">{subData.planName}</strong>. Renew now to keep your hotel system running without interruption.</p>
            </div>
          </div>
          <button type="button" onClick={handleUpgradeClick} className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#347BE9] px-4 text-sm font-bold text-white shadow-[0_8px_18px_rgba(52,123,233,0.20)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#2868DA] hover:shadow-[0_12px_24px_rgba(52,123,233,0.25)] active:translate-y-0 sm:w-auto">
            <Sparkles size={15} /><span>Renew Now</span><ArrowRight size={15} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
