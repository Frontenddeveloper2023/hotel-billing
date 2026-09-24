import React, { useEffect, useState } from "react";
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

export default function AddServiceModal({
  customer,
  room,
  roomNumber,
  bookingId,
  onClose,
}) {
  // ============================================================
  // TAB
  // ============================================================

  const [activeTab, setActiveTab] = useState(null);

  // ============================================================
  // SUBSCRIPTION ACCESS
  // ============================================================

  const [subscriptionLoading, setSubscriptionLoading] =
    useState(true);

  const [foodAllowed, setFoodAllowed] =
    useState(false);

  const [roomServiceAllowed, setRoomServiceAllowed] =
    useState(false);

  const [accessMessage, setAccessMessage] =
    useState("");

  // ============================================================
  // SUPPORT DIFFERENT CUSTOMER DATA STRUCTURES
  // ============================================================

  const actualCustomer =
    customer?.customer &&
    !customer?.customerName
      ? customer.customer
      : customer;

  // ============================================================
  // SUPPORT DIFFERENT ROOM DATA STRUCTURES
  // ============================================================

  const actualRoom =
    room ||
    customer?.room ||
    null;

  // ============================================================
  // CUSTOMER ID
  // ============================================================

  const customerId =
    actualCustomer?._id ||
    actualCustomer?.id ||
    actualCustomer?.customerId ||
    "";

  // ============================================================
  // BOOKING ID
  // ============================================================

  const resolvedBookingId =
    bookingId ||
    actualRoom?.bookingId ||
    actualRoom?.booking?._id ||
    actualRoom?.booking?.id ||
    actualRoom?.bookingId?._id ||
    "";

  // ============================================================
  // BOOKING ROOM ID
  //
  // IMPORTANT:
  //
  // Booking.rooms[] is an embedded array.
  //
  // We need the embedded booking room _id,
  // NOT the physical Room collection ID.
  // ============================================================

  const resolvedRoomId =
    actualRoom?._id ||
    actualRoom?.id ||
    actualRoom?.bookingRoomId ||
    "";

  // ============================================================
  // SAFETY: BOOKING ID
  // ============================================================

  const safeBookingId =
    typeof resolvedBookingId === "object"
      ? resolvedBookingId?._id ||
        resolvedBookingId?.id ||
        ""
      : resolvedBookingId;

  // ============================================================
  // SAFETY: ROOM ID
  // ============================================================

  const safeRoomId =
    typeof resolvedRoomId === "object"
      ? resolvedRoomId?._id ||
        resolvedRoomId?.id ||
        ""
      : resolvedRoomId;

  // ============================================================
  // ROOM NUMBER
  // ============================================================

  const selectedRoomNumber =
    roomNumber ||
    actualRoom?.roomNumber ||
    actualRoom?.roomNo ||
    "";

  // ============================================================
  // CUSTOMER NAME
  // ============================================================

  const customerName =
    actualCustomer?.customerName ||
    actualCustomer?.name ||
    "-";

  // ============================================================
  // PHONE
  // ============================================================

  const phoneNumber =
    actualCustomer?.phoneNumber ||
    actualCustomer?.phone ||
    "-";

  // ============================================================
  // CHECK SUBSCRIPTION FEATURES
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const checkAccess = async () => {
      try {
        setSubscriptionLoading(true);
        setAccessMessage("");

        // --------------------------------------------------------
        // CHECK BOTH FEATURES
        // --------------------------------------------------------

        const [foodResult, roomResult] =
          await Promise.all([
            checkFoodServiceAccess(),
            checkRoomServiceAccess(),
          ]);

        if (!mounted) return;

        const food =
          foodResult?.featureAllowed === true;

        const roomService =
          roomResult?.featureAllowed === true;

        setFoodAllowed(food);
        setRoomServiceAllowed(roomService);

        // --------------------------------------------------------
        // IF SUBSCRIPTION ITSELF IS NOT AVAILABLE
        // --------------------------------------------------------

        if (
          foodResult?.allowed === false &&
          roomResult?.allowed === false
        ) {
          setAccessMessage(
            foodResult?.message ||
              roomResult?.message ||
              "Your subscription is not active. Please renew your subscription to use service features."
          );

          setActiveTab(null);
          return;
        }

        // --------------------------------------------------------
        // SELECT FIRST AVAILABLE TAB
        // --------------------------------------------------------

        if (food) {
          setActiveTab("food");
        } else if (roomService) {
          setActiveTab("service");
        } else {
          setActiveTab(null);

          setAccessMessage(
            foodResult?.message ||
              roomResult?.message ||
              "Food Service and Room Service are not included in your current subscription plan."
          );
        }
      } catch (error) {
        console.error(
          "Failed to check service subscription access:",
          error
        );

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
        if (mounted) {
          setSubscriptionLoading(false);
        }
      }
    };

    checkAccess();

    return () => {
      mounted = false;
    };
  }, []);

  // ============================================================
  // DEBUG
  // ============================================================

  console.log(
    "========== ADD SERVICE MODAL =========="
  );

  console.log(
    "Customer ID:",
    customerId
  );

  console.log(
    "Booking ID:",
    safeBookingId
  );

  console.log(
    "Booking Room ID:",
    safeRoomId
  );

  console.log(
    "Room Number:",
    selectedRoomNumber
  );

  console.log(
    "Food Service Allowed:",
    foodAllowed
  );

  console.log(
    "Room Service Allowed:",
    roomServiceAllowed
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">

          <div className="flex flex-wrap items-center gap-4 text-xs">

            {/* CUSTOMER */}

            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">

              <User className="w-4 h-4 text-teal-600" />

              {customerName}

            </div>

            {/* ROOM */}

            <div className="flex items-center gap-1 text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">

              <BedDouble className="w-3.5 h-3.5 text-teal-600" />

              <span>
                Room:
              </span>

              <strong className="text-teal-700">
                {selectedRoomNumber || "-"}
              </strong>

            </div>

            {/* PHONE */}

            <div className="flex items-center gap-1 text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">

              <Phone className="w-3.5 h-3.5 text-teal-600" />

              {phoneNumber}

            </div>

          </div>

          {/* CLOSE */}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition"
          >
            <X className="w-4 h-4" />
          </button>

        </div>

        {/* ======================================================
            SELECTED ROOM
        ====================================================== */}

        <div className="px-6 pt-4">

          <div className="flex items-center justify-center">

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-50 border border-teal-100">

              <BedDouble className="w-4 h-4 text-teal-600" />

              <span className="text-xs font-semibold text-slate-600">
                Adding services for
              </span>

              <span className="text-xs font-extrabold text-teal-700">
                Room {selectedRoomNumber || "-"}
              </span>

            </div>

          </div>

        </div>

        {/* ======================================================
            SUBSCRIPTION CHECKING
        ====================================================== */}

        {subscriptionLoading ? (

          <div className="flex-1 flex items-center justify-center min-h-[350px]">

            <div className="text-center">

              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">

                <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />

              </div>

              <h3 className="text-sm font-bold text-slate-900">
                Checking Service Access
              </h3>

              <p className="text-xs text-slate-400 mt-1">
                Verifying your subscription and plan features...
              </p>

            </div>

          </div>

        ) : !foodAllowed && !roomServiceAllowed ? (

          /* ======================================================
             NO FEATURE AVAILABLE
          ====================================================== */

          <div className="flex-1 flex items-center justify-center min-h-[350px] px-6">

            <div className="text-center max-w-md">

              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">

                <ShieldAlert className="w-8 h-8 text-amber-600" />

              </div>

              <h3 className="text-base font-bold text-slate-900">
                Service Features Not Available
              </h3>

              <p className="text-xs text-slate-500 mt-2 leading-5">
                {accessMessage ||
                  "Food Service and Room Service are not included in your current subscription plan."}
              </p>

            </div>

          </div>

        ) : (

          <>
            {/* ==================================================
                TAB BUTTONS
            ================================================== */}

            <div className="flex justify-center border-b border-slate-200 bg-white py-3">

              <div className="inline-flex bg-slate-100 p-1 rounded-xl">

                {/* FOOD TAB */}

                {foodAllowed && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("food")
                    }
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      activeTab === "food"
                        ? "bg-white text-teal-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />

                    Food Order
                  </button>
                )}

                {/* ROOM SERVICE TAB */}

                {roomServiceAllowed && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("service")
                    }
                    className={`px-6 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      activeTab === "service"
                        ? "bg-white text-teal-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />

                    Room Service
                  </button>
                )}

              </div>

            </div>

            {/* ==================================================
                TAB CONTENT
            ================================================== */}

            <div className="p-6 overflow-y-auto flex-1 bg-white">

              {activeTab === "food" &&
                foodAllowed && (
                  <FoodOrderTab
                    customerId={customerId}
                    bookingId={safeBookingId}
                    roomId={safeRoomId}
                    roomNumber={selectedRoomNumber}
                  />
                )}

              {activeTab === "service" &&
                roomServiceAllowed && (
                  <ServiceTab
                    customerId={customerId}
                    bookingId={safeBookingId}
                    roomId={safeRoomId}
                    roomNumber={selectedRoomNumber}
                  />
                )}

            </div>
          </>
        )}

      </div>
    </div>
  );
}