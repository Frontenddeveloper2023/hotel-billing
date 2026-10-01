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
    <div className="fixed inset-0 z-50 bg-[#061434]/55 backdrop-blur-sm flex items-center justify-center p-4">
      <style>{TAB_STYLES}</style>

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-[0_18px_45px_rgba(6,20,52,0.22)] overflow-hidden flex flex-col max-h-[90vh]">

        {/* HEADER ──────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-[#e7eff8] flex items-center justify-between bg-gradient-to-r from-[#f4f8fd] to-white shrink-0">

          <div className="flex flex-wrap items-center gap-3 text-xs min-w-0">

            <div className="font-bold text-[#0e2a4a] text-sm flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5b9bf5] to-[#2568e0] flex items-center justify-center shrink-0 shadow-md shadow-blue-500/25">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="truncate">{customerName}</span>
            </div>

            <div className="flex items-center gap-1 text-[#6b7f99] bg-white px-2.5 py-1 rounded-lg border border-[#dbe6f5] shrink-0">
              <BedDouble className="w-3.5 h-3.5 text-[#2568e0]" />
              <span>Room:</span>
              <strong className="text-[#2568e0]">{selectedRoomNumber || "-"}</strong>
            </div>

            <div className="flex items-center gap-1 text-[#6b7f99] bg-white px-2.5 py-1 rounded-lg border border-[#dbe6f5] shrink-0">
              <Phone className="w-3.5 h-3.5 text-[#2568e0]" />
              {phoneNumber}
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 ml-3 shrink-0 rounded-xl border border-[#dbe6f5] bg-white text-[#6b7f99] hover:bg-[#eaf3ff] hover:text-[#2568e0] hover:border-[#5b9bf5] active:scale-95 transition-all duration-200 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ROOM CHIP ───────────────────────────────────────────── */}
        <div className="px-6 pt-3 shrink-0">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#eaf3ff] border border-[#dbe6f5]">
              <BedDouble className="w-4 h-4 text-[#2568e0]" />
              <span className="text-xs font-semibold text-[#6b7f99]">Adding services for</span>
              <span className="text-xs font-extrabold text-[#2568e0]">
                Room {selectedRoomNumber || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* SUBSCRIPTION CHECKING ───────────────────────────────── */}
        {subscriptionLoading ? (

          <div className="flex-1 flex items-center justify-center min-h-[350px]">
            <div className="text-center">
              <div className="relative w-14 h-14 mx-auto mb-4">
                <div className="w-14 h-14 rounded-full border-4 border-[#dbe6f5]" />
                <div className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-[#2568e0] animate-spin" />
              </div>
              <h3 className="text-sm font-bold text-[#0e2a4a]">Checking Service Access</h3>
              <p className="text-xs text-[#9aabc0] mt-1">Verifying your subscription and plan features...</p>
            </div>
          </div>

        ) : !foodAllowed && !roomServiceAllowed ? (

          <div className="flex-1 flex items-center justify-center min-h-[350px] px-6">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-[#0e2a4a]">Service Features Not Available</h3>
              <p className="text-xs text-[#6b7f99] mt-2 leading-5">
                {accessMessage || "Food Service and Room Service are not included in your current subscription plan."}
              </p>
            </div>
          </div>

        ) : (
          <>
            {/* ── TAB BAR — sliding underline indicator ──────── */}
            <div className="flex justify-center border-b border-[#dbe6f5] bg-white pt-3 pb-0 shrink-0">
              <div className="inline-flex">

                {foodAllowed && (
                  <button
                    type="button"
                    onClick={() => switchTab("food")}
                    className={`
                      relative px-7 py-2.5 text-xs font-bold
                      flex items-center gap-2 transition-colors duration-200
                      ${activeTab === "food" ? "text-[#2568e0]" : "text-[#6b7f99] hover:text-[#0e2a4a]"}
                    `}
                  >
                    <UtensilsCrossed
                      className={`w-3.5 h-3.5 transition-all duration-200 ${
                        activeTab === "food" ? "scale-110 text-[#2568e0]" : ""
                      }`}
                    />
                    Food Order

                    {/* sliding underline */}
                    <span
                      className={`
                        absolute bottom-0 left-2 right-2 h-0.5 rounded-full
                        bg-gradient-to-r from-[#5b9bf5] to-[#2568e0]
                        transition-all duration-300 origin-center
                        ${activeTab === "food" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}
                      `}
                    />
                  </button>
                )}

                {roomServiceAllowed && (
                  <button
                    type="button"
                    onClick={() => switchTab("service")}
                    className={`
                      relative px-7 py-2.5 text-xs font-bold
                      flex items-center gap-2 transition-colors duration-200
                      ${activeTab === "service" ? "text-[#2568e0]" : "text-[#6b7f99] hover:text-[#0e2a4a]"}
                    `}
                  >
                    <Wrench
                      className={`w-3.5 h-3.5 transition-all duration-200 ${
                        activeTab === "service" ? "scale-110 text-[#2568e0]" : ""
                      }`}
                    />
                    Room Service

                    {/* sliding underline */}
                    <span
                      className={`
                        absolute bottom-0 left-2 right-2 h-0.5 rounded-full
                        bg-gradient-to-r from-[#5b9bf5] to-[#2568e0]
                        transition-all duration-300 origin-center
                        ${activeTab === "service" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"}
                      `}
                    />
                  </button>
                )}

              </div>
            </div>

            {/* ── TAB CONTENT — directional fade + slide ──────── */}
            <div className="overflow-y-auto flex-1 bg-white">

              {activeTab === "food" && foodAllowed && (
                <div key="food" className={`p-6 ${tabAnimCls}`}>
                  <FoodOrderTab
                    customerId={customerId}
                    bookingId={safeBookingId}
                    roomId={safeRoomId}
                    roomNumber={selectedRoomNumber}
                  />
                </div>
              )}

              {activeTab === "service" && roomServiceAllowed && (
                <div key="service" className={`p-6 ${tabAnimCls}`}>
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