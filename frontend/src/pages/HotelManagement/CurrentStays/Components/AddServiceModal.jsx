import React, { useEffect, useRef, useState } from "react";
import {
  X,
  BedDouble,
  User,
  Phone,
  Loader2,
  UtensilsCrossed,
  Wrench,
  ShieldAlert,
} from "lucide-react";

import FoodOrderTab from "./FoodOrderTab";
import ServiceTab from "./ServiceTab";

import {
  checkFoodServiceAccess,
  checkRoomServiceAccess,
} from "../../../../service/subscriptionFeatureApi";

/* ── Tab switch animation keyframes ─────────────────────────── */
const TAB_STYLES = `
@keyframes tab-in-right{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
@keyframes tab-in-left {from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:none}}
.tab-in-r{animation:tab-in-right .28s cubic-bezier(.2,.7,.2,1) both}
.tab-in-l{animation:tab-in-left  .28s cubic-bezier(.2,.7,.2,1) both}
@media(prefers-reduced-motion:reduce){.tab-in-r,.tab-in-l{animation:none}}
`;

const TAB_ORDER = ["food", "service"];

export default function AddServiceModal({
  customer,
  room,
  roomNumber,
  bookingId,
  onClose,
}) {
  /* ── TAB STATE ─────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState(null);
  const [prevTab,   setPrevTab]   = useState(null);

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  const tabAnimCls = (() => {
    if (!prevTab || !activeTab) return "";
    const pi = TAB_ORDER.indexOf(prevTab);
    const ci = TAB_ORDER.indexOf(activeTab);
    return ci > pi ? "tab-in-r" : "tab-in-l";
  })();

  /* ── SUBSCRIPTION ──────────────────────────────────────────── */
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [foodAllowed,         setFoodAllowed]         = useState(false);
  const [roomServiceAllowed,  setRoomServiceAllowed]  = useState(false);
  const [accessMessage,       setAccessMessage]       = useState("");

  /* ── NORMALISE CUSTOMER / ROOM ─────────────────────────────── */
  const actualCustomer =
    customer?.customer && !customer?.customerName ? customer.customer : customer;

  const actualRoom = room || customer?.room || null;

  const customerId =
    actualCustomer?._id || actualCustomer?.id || actualCustomer?.customerId || "";

  const resolvedBookingId =
    bookingId ||
    actualRoom?.bookingId ||
    actualRoom?.booking?._id ||
    actualRoom?.booking?.id ||
    actualRoom?.bookingId?._id ||
    "";

  const resolvedRoomId =
    actualRoom?._id || actualRoom?.id || actualRoom?.bookingRoomId || "";

  const safeBookingId =
    typeof resolvedBookingId === "object"
      ? resolvedBookingId?._id || resolvedBookingId?.id || ""
      : resolvedBookingId;

  const safeRoomId =
    typeof resolvedRoomId === "object"
      ? resolvedRoomId?._id || resolvedRoomId?.id || ""
      : resolvedRoomId;

  const selectedRoomNumber =
    roomNumber || actualRoom?.roomNumber || actualRoom?.roomNo || "";

  const customerName =
    actualCustomer?.customerName || actualCustomer?.name || "-";

  const phoneNumber =
    actualCustomer?.phoneNumber || actualCustomer?.phone || "-";

  /* ── CHECK ACCESS ──────────────────────────────────────────── */
  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        setSubscriptionLoading(true);
        setAccessMessage("");

        const [foodResult, roomResult] = await Promise.all([
          checkFoodServiceAccess(),
          checkRoomServiceAccess(),
        ]);

        if (!mounted) return;

        const food        = foodResult?.featureAllowed === true;
        const roomService = roomResult?.featureAllowed === true;

        setFoodAllowed(food);
        setRoomServiceAllowed(roomService);

        if (foodResult?.allowed === false && roomResult?.allowed === false) {
          setAccessMessage(
            foodResult?.message ||
              roomResult?.message ||
              "Your subscription is not active. Please renew to use service features."
          );
          setActiveTab(null);
          return;
        }

        if (food) {
          setActiveTab("food");
        } else if (roomService) {
          setActiveTab("service");
        } else {
          setActiveTab(null);
          setAccessMessage(
            foodResult?.message ||
              roomResult?.message ||
              "Food Service and Room Service are not included in your current plan."
          );
        }
      } catch (error) {
        console.error("Failed to check service subscription access:", error);
        if (!mounted) return;
        setFoodAllowed(false);
        setRoomServiceAllowed(false);
        setActiveTab(null);
        setAccessMessage(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to verify your subscription features."
        );
      } finally {
        if (mounted) setSubscriptionLoading(false);
      }
    };

    checkAccess();
    return () => { mounted = false; };
  }, []);

  /* ── RENDER ────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 bg-[#061434]/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <style>{TAB_STYLES}</style>

      <div className="bg-[#f8fafc] w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(6,20,52,0.35)] border border-slate-200/90 overflow-hidden flex flex-col h-[92vh] max-h-[92vh] transition-all">

        {/* HEADER ──────────────────────────────────────────────── */}
        <div className="px-5 sm:px-7 py-3.5 sm:py-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center justify-between shrink-0 shadow-xs">

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs min-w-0">

            <div className="font-extrabold text-[#0f2a63] text-sm sm:text-base flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#1877F2] to-[#3b82f6] flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30 text-white">
                <User className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <span className="truncate max-w-[160px] sm:max-w-[260px]">{customerName}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50/80 border border-blue-200/70 text-blue-900 font-bold shrink-0 text-xs">
              <BedDouble className="w-3.5 h-3.5 text-[#1877F2]" />
              <span className="text-slate-500 font-medium">Room:</span>
              <span className="text-[#1877F2]">{selectedRoomNumber || "-"}</span>
            </div>

            {phoneNumber && phoneNumber !== "-" && (
              <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-medium shrink-0 text-xs">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{phoneNumber}</span>
              </div>
            )}

          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 ml-3 shrink-0 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SUBSCRIPTION CHECKING ───────────────────────────────── */}
        {subscriptionLoading ? (

          <div className="flex-1 flex items-center justify-center min-h-[350px] bg-white">
            <div className="text-center p-6">
              <div className="relative w-12 h-12 mx-auto mb-3.5">
                <div className="w-12 h-12 rounded-full border-3 border-blue-100" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-3 border-transparent border-t-[#1877F2] animate-spin" />
              </div>
              <h3 className="text-sm font-bold text-[#0f2a63]">Verifying Service Access</h3>
              <p className="text-xs text-slate-400 mt-1">Checking active room and food service subscriptions...</p>
            </div>
          </div>

        ) : !foodAllowed && !roomServiceAllowed ? (

          <div className="flex-1 flex items-center justify-center min-h-[350px] px-6 bg-white">
            <div className="text-center max-w-md p-6 rounded-2xl bg-amber-50/60 border border-amber-200/80">
              <div className="w-14 h-14 rounded-2xl bg-amber-100/90 border border-amber-200 flex items-center justify-center mx-auto mb-3.5 text-amber-600">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-[#0f2a63]">Service Features Unavailable</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                {accessMessage || "Food Service and Room Service are not active in your current subscription plan."}
              </p>
            </div>
          </div>

        ) : (
          <>
            {/* ── MODERN SEGMENTED PILL TAB BAR ──────────────── */}
            <div className="px-5 sm:px-7 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4 shrink-0">
              <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 shadow-inner">

                {foodAllowed && (
                  <button
                    type="button"
                    onClick={() => switchTab("food")}
                    className={`
                      relative px-4 sm:px-6 py-2 rounded-lg text-xs font-bold
                      flex items-center gap-2 transition-all duration-200 cursor-pointer
                      ${activeTab === "food"
                        ? "bg-white text-[#1877F2] shadow-sm shadow-slate-200/80"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                      }
                    `}
                  >
                    <UtensilsCrossed
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        activeTab === "food" ? "scale-110 text-[#1877F2]" : "text-slate-400"
                      }`}
                    />
                    <span>Food Order</span>
                  </button>
                )}

                {roomServiceAllowed && (
                  <button
                    type="button"
                    onClick={() => switchTab("service")}
                    className={`
                      relative px-4 sm:px-6 py-2 rounded-lg text-xs font-bold
                      flex items-center gap-2 transition-all duration-200 cursor-pointer
                      ${activeTab === "service"
                        ? "bg-white text-[#1877F2] shadow-sm shadow-slate-200/80"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                      }
                    `}
                  >
                    <Wrench
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        activeTab === "service" ? "scale-110 text-[#1877F2]" : "text-slate-400"
                      }`}
                    />
                    <span>Room Service</span>
                  </button>
                )}

              </div>

            
            </div>

            {/* ── TAB CONTENT — Directional Fade + Natural Scroll ──── */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-[#f8fafc] staylio-scrollbar">

              {activeTab === "food" && foodAllowed && (
                <div key="food" className={tabAnimCls}>
                  <FoodOrderTab
                    customerId={customerId}
                    bookingId={safeBookingId}
                    roomId={safeRoomId}
                    roomNumber={selectedRoomNumber}
                  />
                </div>
              )}

              {activeTab === "service" && roomServiceAllowed && (
                <div key="service" className={tabAnimCls}>
                  <ServiceTab
                    customerId={customerId}
                    bookingId={safeBookingId}
                    roomId={safeRoomId}
                    roomNumber={selectedRoomNumber}
                  />
                </div>
              )}

            </div>
          </>
        )}

      </div>
    </div>
  );
}