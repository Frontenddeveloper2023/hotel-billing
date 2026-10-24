import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  QrCode,
  Banknote,
  AlertCircle,
  Landmark,
  Receipt,
  Printer,
} from "lucide-react";

import { createInvoice } from "../../../service/invoiceApi.js";

import {
  checkoutRooms,
  markFoodServicesPaid,
  markRoomServicesPaid,
} from "../../../service/bookingApi.js";

import { createCheckoutBill } from "../../../service/checkoutBill.js";
import { getSettings } from "../../../service/settingsService.js";

import InvoiceTemplate from "../../InvoiceTemplate/InvoiceTemplate.jsx";

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function Payment({
  paymentDetails,
  amount = 0,
  onBack,
  onSuccess,
}) {
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [serverBilling, setServerBilling] = useState(null);
  const [settings, setSettings] = useState(null);

  const [pdfBlob, setPdfBlob] = useState(null);

  const receiptRef = useRef(null);

  const successCallbackSentRef = useRef(false);

  const pdfGenerationStartedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const res = await getSettings();
        if (isMounted && res?.success && res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.warn("[Payment] Failed to load settings:", err);
      }
    };
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);


  const money = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };

  // =========================================================
  // ROOM ID HELPERS
  // =========================================================

  /*
   * Booking.rooms has two different IDs:
   *
   * room._id
   * -> embedded booking-room ID
   *
   * room.roomId
   * -> physical Room collection ID
   *
   * Service-paid APIs require the embedded booking-room ID.
   */

  const getEmbeddedBookingRoomId = (room) => {
    const value =
      room?._id ??
      room?.bookingRoomId ??
      room?.id ??
      "";

    if (value && typeof value === "object") {
      return String(
        value?._id ??
          value?.id ??
          ""
      );
    }

    return value ? String(value) : "";
  };

  const getPhysicalRoomId = (room) => {
    const value = room?.roomId ?? "";

    if (value && typeof value === "object") {
      return String(
        value?._id ??
          value?.id ??
          ""
      );
    }

    return value ? String(value) : "";
  };

  // =========================================================
  // BASIC DATA
  // =========================================================

  const customer =
    paymentDetails?.customer || {};

  const selectedRooms = Array.isArray(
    paymentDetails?.selectedRooms
  )
    ? paymentDetails.selectedRooms
    : Array.isArray(paymentDetails?.rooms)
    ? paymentDetails.rooms
    : [];

  const checkoutBookings = Array.isArray(
    paymentDetails?.checkoutBookings
  )
    ? paymentDetails.checkoutBookings
    : [];

  const actualCheckoutDate =
    paymentDetails?.actualCheckoutDate || "";

  const actualCheckoutTime =
    paymentDetails?.actualCheckoutTime || "";

  // =========================================================
  // SERVER BILLING
  // Backend checkout calculation is the source of truth.
  // =========================================================

  const serverRooms = Array.isArray(
    serverBilling?.calculation?.rooms
  )
    ? serverBilling.calculation.rooms
    : [];

  const getServerRoom = (room) => {
    const bookingId =
      typeof room?.bookingId === "object"
        ? String(
            room.bookingId?._id ??
              room.bookingId?.id ??
              ""
          )
        : String(
            room?.bookingId || ""
          );

    const bookingRoomId =
      getEmbeddedBookingRoomId(room);

    return (
      serverRooms.find(
        (item) =>
          String(
            item?.bookingId || ""
          ) === bookingId &&
          String(
            item?.bookingRoomId || ""
          ) === bookingRoomId
      ) || null
    );
  };

  // =========================================================
  // ROOM BREAKDOWN
  // =========================================================

  const roomBreakdown =
    selectedRooms.map((room) => {
      const serverRoom =
        getServerRoom(room);

      const roomRate = money(
        serverRoom?.pricePerNight ??
          room?.pricePerNight ??
          room?.rate ??
          0
      );

      const extraFullDays = Number(
        serverRoom?.extraFullDays ??
          room?.extraNightsStayed ??
          room?.extraStay?.extraDays ??
          0
      );

      const extraFullDayCharge = money(
        serverRoom?.extraFullDayCharge ??
          room?.extraDayCharge ??
          (extraFullDays * roomRate)
      );

      const checkoutPolicyCharge = money(
        serverRoom?.checkoutDayCharge ??
          serverRoom?.checkoutPolicy?.amount ??
          room?.extraTimeCharge ??
          room?.extraStay?.timeCharge ??
          0
      );

      return {
        ...room,

        roomId:
          getEmbeddedBookingRoomId(room),

        physicalRoomId:
          getPhysicalRoomId(room),

        rate: roomRate,
        pricePerNight: roomRate,

        bookedNights: Number(
          serverRoom?.bookedNights ??
            serverRoom?.nights ??
            room?.bookedNights ??
            room?.nights ??
            0
        ),

        roomSubtotal: money(
          serverRoom?.roomSubtotal ??
            serverRoom?.amount ??
            room?.roomSubtotal ??
            room?.totalBeforeAdvance ??
            0
        ),

        extraFullDays,
        extraFullDayCharge,
        checkoutPolicyCharge,
      };
    });

  // =========================================================
  // SERVICES
  // =========================================================

  const foodServices =
    selectedRooms.flatMap((room) =>
      Array.isArray(room?.foodServices)
        ? room.foodServices.map((f) => ({
            ...f,
            roomNumber: f?.roomNumber || room?.roomNumber || "",
          }))
        : []
    );

  const roomServices =
    selectedRooms.flatMap((room) =>
      Array.isArray(room?.roomServices)
        ? room.roomServices.map((r) => ({
            ...r,
            roomNumber: r?.roomNumber || room?.roomNumber || "",
          }))
        : []
    );

  // =========================================================
  // =========================================================
  // BILLING DISPLAY VALUES (Always stable from Checkout)
  // =========================================================

  const billing = paymentDetails?.billing || {};

  const previewAdvancePaid =
    checkoutBookings.reduce(
      (sum, booking) =>
        sum +
        money(
          booking.initialPaidAvailable ??
            booking.availableAdvance
        ),
      0
    );

  const roomRent = money(
    billing.roomTotal ??
    billing.roomSubtotal ??
    roomBreakdown.reduce(
      (sum, room) => {
        const bookedNights =
          Number(
            room.bookedNights || room.nights || 0
          );

        const roomRate = money(
          room.pricePerNight || room.rate
        );

        return (
          sum +
          bookedNights * roomRate
        );
      },
      0
    )
  );

  const foodTotal = money(
    billing.foodTotal ??
    foodServices.reduce(
      (sum, item) =>
        sum + money(item.total),
      0
    )
  );

  const roomServiceTotal = money(
    billing.roomServiceTotal ??
    billing.serviceTotal ??
    roomServices.reduce(
      (sum, item) =>
        sum + money(item.total),
      0
    )
  );

  const extraFullDayCharge = money(
    billing.extraDayCharge ??
    billing.extraFullDayCharge ??
    billing.extraFullDayChargeTotal ??
    0
  );

  const checkoutPolicyCharge = money(
    billing.extraTimeCharge ??
    billing.checkoutPolicy?.amount ??
    billing.checkoutPolicyAmount ??
    billing.checkoutPolicyCharge ??
    0
  );

  const extraChargeTotal = money(
    billing.extraChargeTotal ??
    (extraFullDayCharge + checkoutPolicyCharge)
  );

  const advancePaid = money(
    billing.advancePaid ?? previewAdvancePaid
  );

  const gstPercentage = Math.max(
    0,
    Number(
      billing.gstPercentage ?? 0
    )
  );

  const gstAmount = Math.max(
    0,
    money(
      billing.gstAmount
    )
  );

  const previewGrandTotal =
    roomRent +
    foodTotal +
    roomServiceTotal +
    extraChargeTotal +
    gstAmount;

  const grandTotal = money(
    billing.grandTotal ?? previewGrandTotal
  );

  const currentPayment = Math.max(
    0,
    money(
      billing.balanceDue ??
        (grandTotal - advancePaid) ??
        amount
    )
  );

  const balanceDue = currentPayment;

  // =========================================================
  // PAYMENT MODE
  // =========================================================

  const paymentMode =
    paymentMethod === "upi"
      ? "UPI / QR"
      : paymentMethod === "card"
      ? "Card"
      : paymentMethod === "bank"
      ? "Bank Transfer"
      : "Cash";

  // =========================================================
  // DATE FORMAT
  // =========================================================

  const formatDate = (value) => {
    if (!value) return "-";

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) {
      return String(value);
    }

    return d.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  // =========================================================
  // TIME FORMAT
  // =========================================================

  const formatTime = (value) => {
    if (!value) return "";

    const text =
      String(value).trim();

    if (/AM|PM/i.test(text)) {
      return text;
    }

    const match =
      text.match(
        /^(\d{1,2}):(\d{2})$/
      );

    if (!match) {
      return text;
    }

    let hour =
      Number(match[1]);

    const period =
      hour >= 12 ? "PM" : "AM";

    hour =
      hour % 12 || 12;

    return `${String(
      hour
    ).padStart(2, "0")}:${match[2]} ${period}`;
  };

  // =========================================================
  // BUILD INVOICE PAYLOAD
  // =========================================================

  const buildInvoicePayload = (
    calculation = billing
  ) => {
    const calculationRooms =
      Array.isArray(
        calculation?.rooms
      )
        ? calculation.rooms
        : [];

    // -------------------------------------------------------
    // INVOICE ROOMS
    // -------------------------------------------------------

    const invoiceRooms =
      selectedRooms.map((room) => {
        const bookingId =
          typeof room?.bookingId ===
          "object"
            ? String(
                room.bookingId?._id ??
                  room.bookingId?.id ??
                  ""
              )
            : String(
                room?.bookingId || ""
              );

        const bookingRoomId =
          getEmbeddedBookingRoomId(
            room
          );

        const serverRoom =
          calculationRooms.find(
            (item) =>
              String(
                item?.bookingId || ""
              ) === bookingId &&
              String(
                item?.bookingRoomId || ""
              ) === bookingRoomId
          ) || {};

        return {
          roomId:
            bookingRoomId,

          physicalRoomId:
            getPhysicalRoomId(room),

          bookingId,

          roomNumber:
            room?.roomNumber || "-",

          roomType:
            room?.roomType || "-",

          bedType:
            room?.bedType || "-",

          perNightRoomPrice:
            money(
              serverRoom?.pricePerNight ??
                room?.pricePerNight ??
                room?.perNightRoomPrice ??
                room?.rate ??
                0
            ),

          adults:
            Number(room?.adults || 0),

          children:
            Number(
              room?.children || 0
            ),

          bookedNights:
            Number(
              serverRoom?.bookedNights ??
                serverRoom?.nights ??
                room?.bookedNights ??
                room?.nights ??
                0
            ),

          roomSubtotal:
            money(
              serverRoom?.roomSubtotal ??
                serverRoom?.amount ??
                room?.roomSubtotal ??
                room?.totalBeforeAdvance ??
                0
            ),

          extraFullDays:
            Number(
              serverRoom?.extraFullDays ??
                room?.extraNightsStayed ??
                room?.extraStay?.extraDays ??
                0
            ),

          extraFullDayCharge:
            money(
              serverRoom?.extraFullDayCharge ??
                room?.extraDayCharge ??
                (Number(room?.extraNightsStayed ?? room?.extraStay?.extraDays ?? 0) * money(room?.pricePerNight ?? room?.rate ?? 0))
            ),

          checkoutPolicyCharge:
            money(
              serverRoom?.checkoutDayCharge ??
                serverRoom
                  ?.checkoutPolicy
                  ?.amount ??
                room?.extraTimeCharge ??
                room?.extraStay?.timeCharge ??
                0
            ),

          checkIn:
            room?.checkIn || serverRoom?.checkIn || room?.stay?.checkIn || "",

          checkInTime:
            room?.checkInTime || serverRoom?.checkInTime || room?.stay?.checkInTime || "",

          checkOut:
            room?.checkOut || serverRoom?.checkOut || room?.stay?.checkOut || "",

          checkOutTime:
            room?.checkOutTime || serverRoom?.checkOutTime || room?.stay?.checkOutTime || "",

          actualCheckoutDate:
            room?.actualCheckoutDate || serverRoom?.actualCheckoutDate || actualCheckoutDate || "",

          actualCheckoutTime:
            room?.actualCheckoutTime || serverRoom?.actualCheckoutTime || actualCheckoutTime || "",
        };
      });

    // -------------------------------------------------------
    // FINAL AUTHORITATIVE VALUES
    // -------------------------------------------------------

    const finalRoomSubtotal =
      money(
        calculation?.roomTotal ??
        calculation?.roomSubtotal ??
        roomRent
      );

    const finalFoodTotal =
      money(
        calculation?.foodTotal ?? foodTotal
      );

    const finalRoomServiceTotal =
      money(
        calculation?.roomServiceTotal ??
        calculation?.serviceTotal ??
        roomServiceTotal
      );

    const finalExtraFullDayCharge =
      money(
        calculation?.extraDayCharge ??
        calculation?.extraFullDayChargeTotal ??
        calculation?.extraFullDayCharge ??
        extraFullDayCharge
      );

    const finalCheckoutPolicyCharge =
      money(
        calculation?.extraTimeCharge ??
        calculation?.checkoutPolicy?.amount ??
        calculation?.checkoutPolicyAmount ??
        calculation?.checkoutPolicyCharge ??
        checkoutPolicyCharge
      );

    const finalExtraCharge =
      money(
        calculation?.extraChargeTotal ??
        (finalExtraFullDayCharge + finalCheckoutPolicyCharge)
      );

    const finalGstAmount =
      money(
        calculation?.gstAmount ??
        calculation?.gst?.amount ??
        gstAmount
      );

    const finalGstRate =
      money(
        calculation?.gstPercentage ??
        calculation?.gst?.rate ??
        gstPercentage
      );

    const finalGrandTotal =
      money(
        calculation?.grandTotal ?? grandTotal
      );

    const finalAdvancePaid =
      money(
        calculation?.advancePaid ??
        calculation?.initialPaidAmount ??
        advancePaid
      );

    const finalBalanceDue =
      money(
        calculation?.balanceDue ?? balanceDue
      );

    // -------------------------------------------------------
    // NIGHT COUNTS
    // -------------------------------------------------------

    const bookedNights =
      invoiceRooms.reduce(
        (sum, room) =>
          sum +
          Number(
            room.bookedNights || 0
          ),
        0
      );

    const extraFullDaysTotal =
      invoiceRooms.reduce(
        (sum, room) =>
          sum +
          Number(
            room.extraFullDays || 0
          ),
        0
      );

    // Base booked room rent only.
    // Extra full-day and checkout policy
    // are stored separately.
    const baseRoomRent =
      invoiceRooms.reduce(
        (sum, room) =>
          sum +
          Number(
            room.bookedNights || 0
          ) *
            money(
              room.perNightRoomPrice
            ),
        0
      );

    // -------------------------------------------------------
    // FOOD DETAILS
    // -------------------------------------------------------

    const invoiceFoodServices =
      Array.isArray(
        calculation?.foodDetails
      )
        ? calculation.foodDetails
        : foodServices;

    // -------------------------------------------------------
    // ROOM SERVICE DETAILS
    // -------------------------------------------------------

    const invoiceRoomServices =
      Array.isArray(
        calculation?.roomServiceDetails
      )
        ? calculation.roomServiceDetails
        : roomServices;

    const firstRoom =
      invoiceRooms[0] || {};

    // =======================================================
    // RETURN INVOICE PAYLOAD
    // =======================================================

    return {
      invoiceDate:
        new Date().toLocaleDateString(
          "en-GB",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        ),

      // =====================================================
      // CUSTOMER
      // =====================================================

      customer: {
        customerId:
          paymentDetails?.customerId ||
          customer?._id ||
          "",

        customerName:
          customer?.customerName ||
          "Guest",

        phoneNumber:
          customer?.phoneNumber || "",

        alternativePhone:
          customer?.alternativePhone ||
          "",

        email:
          customer?.email || "",

        address:
          customer?.address || "",

        idProofType:
          customer?.idProofType || "",

        idProofNumber:
          customer?.idProofNumber || "",

        roomNumber:
          invoiceRooms
            .map(
              (room) =>
                room.roomNumber
            )
            .join(", "),

        roomType:
          invoiceRooms
            .map(
              (room) =>
                room.roomType
            )
            .join(", "),

        bedType:
          invoiceRooms
            .map(
              (room) =>
                room.bedType
            )
            .join(", "),
      },

      // =====================================================
      // ROOM
      // =====================================================

      room: {
        rooms: invoiceRooms,

        roomNumber:
          invoiceRooms
            .map(
              (room) =>
                room.roomNumber
            )
            .join(", "),

        roomType:
          invoiceRooms
            .map(
              (room) =>
                room.roomType
            )
            .join(", "),

        bedType:
          invoiceRooms
            .map(
              (room) =>
                room.bedType
            )
            .join(", "),

        perNightRoomPrice:
          firstRoom
            .perNightRoomPrice ||
          0,
      },

      rooms: invoiceRooms,

      // =====================================================
      // STAY SUMMARY
      // =====================================================

      staySummary: {
        bookedCheckIn:
          firstRoom.checkIn || "",

        bookedCheckInTime:
          firstRoom.checkInTime ||
          "",

        bookedCheckOut:
          firstRoom.checkOut || "",

        bookedCheckOutTime:
          firstRoom.checkOutTime ||
          "",

        actualCheckOut:
          actualCheckoutDate &&
          actualCheckoutTime
            ? `${actualCheckoutDate} ${actualCheckoutTime}`
            : "",

        actualCheckOutDate:
          actualCheckoutDate,

        actualCheckOutTime:
          actualCheckoutTime,

        bookedNights,

        extraNights:
          extraFullDaysTotal,

        extraHours: paymentDetails?.staySummary?.extraHoursStayed || 0,

        extraMinutes: paymentDetails?.staySummary?.extraMinutesStayed || 0,

        extraTime: `${paymentDetails?.staySummary?.extraHoursStayed || 0}h ${paymentDetails?.staySummary?.extraMinutesStayed || 0}m`,

        totalExtraStayMinutes: paymentDetails?.staySummary?.totalExtraStayMinutes || 0,

        totalNightsStayed:
          bookedNights +
          extraFullDaysTotal,
      },

      // =====================================================
      // INVOICE ITEMS
      // =====================================================

      items: [
        // ---------------------------------------------------
        // ROOM ITEMS
        // ---------------------------------------------------

        ...invoiceRooms.flatMap(
          (room) => {
            const items = [];

            const roomBookedNights =
              Number(
                room.bookedNights || 0
              );

            const roomRate =
              money(
                room.perNightRoomPrice
              );

            const extraFullDays =
              Number(
                room.extraFullDays || 0
              );

            const extraFullDayCharge =
              money(
                room.extraFullDayCharge
              );

            const checkoutPolicyCharge =
              money(
                room.checkoutPolicyCharge
              );

            // -----------------------------------------------
            // NORMAL ROOM RENT
            // -----------------------------------------------

            if (
              roomBookedNights > 0
            ) {
              items.push({
                description:
                  `Room Rent - ${room.roomNumber} ` +
                  `(${room.roomType} - ` +
                  `${roomBookedNights} Night${
                    roomBookedNights !==
                    1
                      ? "s"
                      : ""
                  })`,

                roomNumber:
                  room.roomNumber,

                unitPrice:
                  roomRate,

                quantity:
                  roomBookedNights,

                total:
                  money(
                    roomBookedNights *
                      roomRate
                  ),
              });
            }

            // -----------------------------------------------
            // EXTRA FULL DAY
            // -----------------------------------------------

            if (
              extraFullDays > 0 &&
              extraFullDayCharge > 0
            ) {
              items.push({
                description:
                  `Extra Night Stay - Room ${room.roomNumber} (${extraFullDays} Night${
                    extraFullDays !== 1 ? "s" : ""
                  })`,

                roomNumber:
                  room.roomNumber,

                unitPrice:
                  roomRate,

                quantity:
                  extraFullDays,

                total:
                  extraFullDayCharge,
              });
            }

            // -----------------------------------------------
            // EXTRA TIME STAY CHARGE (LATE CHECKOUT)
            // -----------------------------------------------

            if (
              checkoutPolicyCharge > 0
            ) {
              items.push({
                description:
                  `Extra Time Stay Charge - Room ${room.roomNumber}`,

                roomNumber:
                  room.roomNumber,

                unitPrice:
                  checkoutPolicyCharge,

                quantity: 1,

                total:
                  checkoutPolicyCharge,
              });
            }

            return items;
          }
        ),

        // ---------------------------------------------------
        // FOOD
        // ---------------------------------------------------

        ...invoiceFoodServices.map(
          (item) => ({
            description: item.name || item.foodName || item.description || "Food Item",

            roomNumber:
              item.roomNumber || "",

            unitPrice:
              money(item.price ?? item.unitPrice),

            quantity:
              Number(
                item.quantity || 1
              ),

            total:
              money(item.total ?? (money(item.price ?? item.unitPrice) * Number(item.quantity || 1))),
          })
        ),

        // ---------------------------------------------------
        // ROOM SERVICES
        // ---------------------------------------------------

        ...invoiceRoomServices.map(
          (item) => ({
            description: item.name || item.serviceName || item.description || "Room Service",

            roomNumber:
              item.roomNumber || "",

            unitPrice:
              money(item.fees ?? item.price ?? item.unitPrice),

            quantity:
              Number(
                item.quantity || 1
              ),

            total:
              money(item.total ?? (money(item.fees ?? item.price ?? item.unitPrice) * Number(item.quantity || 1))),
          })
        ),
      ],

      // =====================================================
      // SERVICE DETAILS
      // =====================================================

      foodServicesDetails:
        invoiceFoodServices,

      roomServicesDetails:
        invoiceRoomServices,

      // =====================================================
      // EXTRA CHARGES
      // =====================================================

      extraCharges: {
        total:
          finalExtraCharge,

        extraNightsStayed:
          Number(
            calculation?.extraFullDaysTotal ??
              calculation?.extraFullDays ??
              extraFullDaysTotal
          ),

        extraHoursStayed: paymentDetails?.billing?.extraHoursStayed || 0,

        extraMinutesStayed: paymentDetails?.billing?.extraMinutesStayed || 0,

        extraNightCharge:
          finalExtraFullDayCharge,

        extraTimeCharge: paymentDetails?.billing?.extraTimeCharge || 0,

        extraNightUnits:
          Number(
            calculation?.extraFullDaysTotal ??
              calculation?.extraFullDays ??
              extraFullDaysTotal
          ),

        extraTimeUnits: paymentDetails?.billing?.extraTimeUnits || 0,

        extraTime:
          `${paymentDetails?.billing?.extraHoursStayed || 0}h ${paymentDetails?.billing?.extraMinutesStayed || 0}m`,

        extraNightPolicyType:
          calculation?.checkoutPolicy
            ?.policyType || "",

        extraNightPolicyValue:
          money(
            calculation?.checkoutPolicy
              ?.policyValue
          ),

        checkoutPolicyCharge:
          finalCheckoutPolicyCharge,

        checkoutPolicyType:
          calculation?.checkoutPolicy
            ?.type || "",

        checkoutPolicyValue:
          money(
            calculation?.checkoutPolicy
              ?.policyValue ?? 0
          ),

        extraTimePolicyType:
          "",

        extraTimePolicyValue:
          0,
      },

      // =====================================================
      // FINANCIALS
      // =====================================================

      financials: {
        /*
         * Base room rent only.
         *
         * Example:
         * 2 nights × ₹250 = ₹500
         *
         * Extra full day and checkout policy
         * are stored separately below.
         */

        roomRent:
          money(baseRoomRent),

        /*
         * Full backend room subtotal.
         *
         * Example:
         * ₹500 room rent
         * + ₹250 extra full day
         * + ₹125 checkout policy
         * = ₹875
         */

        roomSubtotal:
          finalRoomSubtotal,

        foodServices:
          finalFoodTotal,

        roomServices:
          finalRoomServiceTotal,

        extraNightCharge:
          finalExtraFullDayCharge,

        extraTimeCharge: paymentDetails?.billing?.extraTimeCharge || 0,

        totalExtraStayCharges:
          finalExtraCharge,

        subTotal:
          money(
            calculation?.subtotal ??
              finalGrandTotal -
                finalGstAmount
          ),

        gstPercentage:
          finalGstRate,

        gstAmount:
          finalGstAmount,

        grandTotal:
          finalGrandTotal,

        advancePaid:
          finalAdvancePaid,

        currentPayment:
          finalBalanceDue,

        totalPaid:
          finalAdvancePaid +
          finalBalanceDue,

        balanceDue:
          finalBalanceDue,
      },

      // =====================================================
      // PAYMENT INFO
      // =====================================================

      paymentInfo: {
        paymentMode,

        paymentStatus:
          "PAID",

        paidAt:
          actualCheckoutDate &&
          actualCheckoutTime
            ? `${actualCheckoutDate} ${actualCheckoutTime}`
            : "",

        transactionId:
          "",
      },
    };
  };

  // =========================================================
  // HANDLE PAYMENT
  // =========================================================

  const handlePayment = async (e) => {
    e.preventDefault();

    if (isProcessing) {
      return;
    }

    // =======================================================
    // BASIC VALIDATION
    // =======================================================

    if (!selectedRooms.length) {
      setErrorMessage(
        "No rooms were selected for checkout."
      );
      return;
    }

    if (!checkoutBookings.length) {
      setErrorMessage(
        "No booking was selected for checkout."
      );
      return;
    }

    if (
      !actualCheckoutDate ||
      !actualCheckoutTime
    ) {
      setErrorMessage(
        "Actual checkout date and time are required."
      );
      return;
    }

    // =======================================================
    // GET BOOKING IDS
    // =======================================================

    const bookingIds =
      checkoutBookings
        .map((booking) => {
          const value =
            booking?.bookingId;

          if (
            value &&
            typeof value ===
              "object"
          ) {
            return String(
              value?._id ??
                value?.id ??
                ""
            );
          }

          return value
            ? String(value)
            : "";
        })
        .filter(Boolean);

    if (!bookingIds.length) {
      setErrorMessage(
        "No valid booking IDs were found."
      );
      return;
    }

    // Remove duplicate IDs.
    const uniqueBookingIds = [
      ...new Set(bookingIds),
    ];

    setIsProcessing(true);
    setErrorMessage("");

    try {
      console.info(
        "[Payment] Starting checkout payment.",
        {
          bookingIds:
            uniqueBookingIds,

          actualCheckoutDate,

          actualCheckoutTime,

          paymentMethod,
        }
      );

      // =====================================================
      // STEP 1
      // BACKEND CREATES CHECKOUT BILL
      // =====================================================

      const billResponse =
        await createCheckoutBill({
          bookingIds:
            uniqueBookingIds,

          actualCheckoutDate,

          actualCheckoutTime,

          stayStatus:
            "vacated",

          billing:
            paymentDetails?.billing,
        });

      if (
        !billResponse?.success
      ) {
        throw new Error(
          billResponse?.message ||
            "Unable to calculate the checkout bill."
        );
      }

      const calculation =
        billResponse?.calculation ||
        billResponse?.data
          ?.calculation ||
        null;

      const serverGrandTotal = grandTotal;
      const serverBalanceDue = balanceDue;
      const serverAdvancePaid = advancePaid;

      console.info(
        "[Payment] Backend billing confirmed.",
        {
          roomSubtotal:
            money(
              calculation.roomSubtotal
            ),

          extraFullDayCharge:
            money(
              calculation.extraFullDayChargeTotal ??
                calculation.extraFullDayCharge
            ),

          checkoutPolicy:
            money(
              calculation
                .checkoutPolicy
                ?.amount
            ),

          foodTotal:
            money(
              calculation.foodTotal
            ),

          roomServiceTotal:
            money(
              calculation.roomServiceTotal
            ),

          subtotal:
            money(
              calculation.subtotal
            ),

          gst:
            money(
              calculation.gst
                ?.amount ??
                calculation.gstAmount
            ),

          grandTotal:
            serverGrandTotal,

          advancePaid:
            serverAdvancePaid,

          balanceDue:
            serverBalanceDue,
        }
      );

      // =====================================================
      // STEP 2
      // GET SERVER BOOKING BREAKDOWN
      // =====================================================

      const serverBookings =
        Array.isArray(
          calculation.bookings
        )
          ? calculation.bookings
          : [];

      if (
        serverBookings.length !==
        uniqueBookingIds.length
      ) {
        throw new Error(
          "Server billing response does not contain all selected bookings."
        );
      }

      // =====================================================
      // STEP 3
      // ALLOCATE FINAL PAYMENT
      //
      // IMPORTANT:
      // We DO NOT calculate room charges here.
      //
      // Backend already calculated:
      //
      // 20 Sep = full
      // 21 Sep = full
      // 22 Sep = full
      // 23 Sep 11 AM = configured policy
      //
      // Payment.jsx only distributes the final
      // balance between bookings.
      // =====================================================

      const bookingItems =
        uniqueBookingIds.map(
          (bookingId) => {
            const serverBooking =
              serverBookings.find(
                (item) =>
                  String(
                    item?.bookingId || ""
                  ) ===
                  String(
                    bookingId
                  )
              );

            if (!serverBooking) {
              throw new Error(
                `Billing details not found for booking ${bookingId}.`
              );
            }

            /*
             * Use backend booking subtotal
             * as proportional allocation key.
             *
             * GST is already included in
             * final server balance.
             */

            const share =
              money(
                serverBooking.roomSubtotal
              ) +
              money(
                serverBooking.foodTotal
              ) +
              money(
                serverBooking.roomServiceTotal
              );

            return {
              bookingId,

              serverBooking,

              share:
                Math.max(
                  0,
                  share
                ),
            };
          }
        );

      const totalShare =
        bookingItems.reduce(
          (sum, item) =>
            sum + item.share,
          0
        );

      let allocatedPayment = 0;

      // =====================================================
      // STEP 4
      // COMPLETE BOOKINGS
      // =====================================================

      for (
        let index = 0;
        index <
        bookingItems.length;
        index += 1
      ) {
        const item =
          bookingItems[index];

        const booking =
          checkoutBookings.find(
            (bookingItem) => {
              const id =
                typeof bookingItem?.bookingId ===
                "object"
                  ? String(
                      bookingItem
                        .bookingId?._id ??
                        bookingItem
                          .bookingId?.id ??
                        ""
                    )
                  : String(
                      bookingItem?.bookingId ||
                        ""
                    );

              return (
                id ===
                String(
                  item.bookingId
                )
              );
            }
          );

        if (!booking) {
          throw new Error(
            `Booking ${item.bookingId} was not found in checkout data.`
          );
        }

        const bookingRooms =
          Array.isArray(
            booking.rooms
          )
            ? booking.rooms
            : [];

        if (!bookingRooms.length) {
          throw new Error(
            `Booking ${item.bookingId} has no rooms selected.`
          );
        }

        // ---------------------------------------------------
        // PAYMENT ALLOCATION
        // ---------------------------------------------------

        let bookingPayment = 0;

        if (
          serverBalanceDue > 0
        ) {
          const isLastBooking =
            index ===
            bookingItems.length -
              1;

          if (isLastBooking) {
            /*
             * Last booking absorbs
             * rounding difference.
             */

            bookingPayment =
              serverBalanceDue -
              allocatedPayment;
          } else if (
            totalShare > 0
          ) {
            bookingPayment =
              (
                serverBalanceDue *
                item.share
              ) /
              totalShare;
          } else {
            bookingPayment =
              serverBalanceDue /
              bookingItems.length;
          }
        }

        bookingPayment =
          Number(
            Math.max(
              0,
              bookingPayment
            ).toFixed(2)
          );

        allocatedPayment +=
          bookingPayment;

        console.info(
          "[Payment] Completing booking.",
          {
            bookingId:
              item.bookingId,

            paymentAmount:
              bookingPayment,

            actualCheckoutDate,

            actualCheckoutTime,
          }
        );

        // ---------------------------------------------------
        // EMBEDDED BOOKING ROOM IDS
        // ---------------------------------------------------

        const roomIds =
          bookingRooms
            .map((room) =>
              getEmbeddedBookingRoomId(
                room
              )
            )
            .filter(Boolean);

        if (!roomIds.length) {
          throw new Error(
            `No valid room IDs found for booking ${item.bookingId}.`
          );
        }

        const roomNumbers =
          bookingRooms
            .map(
              (room) =>
                room?.roomNumber
            )
            .filter(Boolean);

        // ---------------------------------------------------
        // COMPLETE CHECKOUT
        // ---------------------------------------------------

        const checkoutResponse =
          await checkoutRooms(
            item.bookingId,
            {
              roomIds,

              roomNumbers,

              actualCheckoutDate,

              actualCheckoutTime,

              checkoutPaymentAmount:
                bookingPayment,

              paymentVia:
                paymentMethod ===
                "upi"
                  ? "UPI"
                  : paymentMethod ===
                    "card"
                  ? "Card"
                  : paymentMethod ===
                    "bank"
                  ? "Bank Transfer"
                  : "Cash",
            }
          );

        if (
          checkoutResponse &&
          checkoutResponse.success ===
            false
        ) {
          throw new Error(
            checkoutResponse.message ||
              `Failed to complete checkout for booking ${item.bookingId}.`
          );
        }

        console.info(
          "[Payment] Booking checkout completed.",
          {
            bookingId:
              item.bookingId,

            payment:
              bookingPayment,
          }
        );
      }

      // =====================================================
      // STEP 5
      // MARK FOOD + ROOM SERVICES AS PAID
      // =====================================================

      for (
        const room of selectedRooms
      ) {
        const bookingId =
          typeof room?.bookingId ===
          "object"
            ? String(
                room.bookingId?._id ??
                  room.bookingId?.id ??
                  ""
              )
            : String(
                room?.bookingId || ""
              );

        const bookingRoomId =
          getEmbeddedBookingRoomId(
            room
          );

        if (
          !bookingId ||
          !bookingRoomId
        ) {
          console.warn(
            "[Payment] Skipping invalid booking-room pair.",
            {
              bookingId,
              bookingRoomId,
            }
          );

          continue;
        }

        // ---------------------------------------------------
        // PENDING FOOD
        // ---------------------------------------------------

        const pendingFood =
          Array.isArray(
            room?.foodServices
          )
            ? room.foodServices.filter(
                (item) =>
                  String(
                    item?.paymentStatus ||
                      "Pending"
                  ).toLowerCase() ===
                  "pending"
              )
            : [];

        // ---------------------------------------------------
        // PENDING ROOM SERVICES
        // ---------------------------------------------------

        const pendingRoomServices =
          Array.isArray(
            room?.roomServices
          )
            ? room.roomServices.filter(
                (item) =>
                  String(
                    item?.paymentStatus ||
                      "Pending"
                  ).toLowerCase() ===
                  "pending"
              )
            : [];

        // ---------------------------------------------------
        // FOOD
        // ---------------------------------------------------

        if (
          pendingFood.length
        ) {
          console.info(
            "[Payment] Marking food services paid.",
            {
              bookingId,

              bookingRoomId,

              count:
                pendingFood.length,
            }
          );

          await markFoodServicesPaid(
            bookingId,
            bookingRoomId
          );
        }

        // ---------------------------------------------------
        // ROOM SERVICE
        // ---------------------------------------------------

        if (
          pendingRoomServices.length
        ) {
          console.info(
            "[Payment] Marking room services paid.",
            {
              bookingId,

              bookingRoomId,

              count:
                pendingRoomServices.length,
            }
          );

          await markRoomServicesPaid(
            bookingId,
            bookingRoomId
          );
        }
      }

// =====================================================
// STEP 6
// CREATE INVOICE FROM BACKEND DATABASE DATA
// =====================================================

const checkoutBillId =
  billResponse?.data?._id ||
  billResponse?.data?.id ||
  "";

if (!checkoutBillId) {
  throw new Error(
    "Checkout bill was created, but checkout bill ID was not returned."
  );
}

const invoicePayload = buildInvoicePayload(paymentDetails?.billing);

console.info(
  "[Payment] Creating invoice from CheckoutBill and Booking data.",
  {
    checkoutBillId,
    bookingIds: uniqueBookingIds,
    paymentMode,
    grandTotal: invoicePayload.financials?.grandTotal,
    balanceDue: invoicePayload.financials?.balanceDue,
  }
);

const invoiceResponse =
  await createInvoice({
    checkoutBillId,
    bookingIds: uniqueBookingIds,
    paymentMode,
    financials: invoicePayload.financials,
    extraCharges: invoicePayload.extraCharges,
    staySummary: invoicePayload.staySummary,
    items: invoicePayload.items,
    rooms: invoicePayload.rooms,
    selectedRooms: invoicePayload.rooms,
    billing: paymentDetails?.billing,
    uiExtraDetails: {
      extraHours: paymentDetails?.staySummary?.extraHoursStayed || 0,
      extraMinutes: paymentDetails?.staySummary?.extraMinutesStayed || 0,
      totalExtraStayMinutes: paymentDetails?.staySummary?.totalExtraStayMinutes || 0,
      extraTimeCharge: paymentDetails?.staySummary?.extraTimeCharge || 0,
      extraTimeUnits: paymentDetails?.staySummary?.extraTimeUnits || 0,
    }
  });





if (!invoiceResponse?.success) {
  throw new Error(
    invoiceResponse?.message ||
      "Checkout completed, but invoice creation failed."
  );
}

const savedInvoiceData =
  invoiceResponse?.data ||
  invoiceResponse?.invoice ||
  null;

if (!savedInvoiceData) {
  throw new Error(
    "Invoice was created, but invoice data was not returned."
  );
}

console.info(
  "[Payment] Invoice created successfully.",
  {
    checkoutBillId,
    bookingIds: uniqueBookingIds,
    invoiceId:
      savedInvoiceData?._id ||
      savedInvoiceData?.invoiceNo ||
      null,
  }
);

setSavedInvoice(savedInvoiceData);

     

      // =====================================================
      // SUCCESS
      // =====================================================

      setPaymentSuccess(true);

      console.info(
        "[Payment][SUCCESS] Checkout completed successfully.",
        {
          bookingIds:
            uniqueBookingIds,

          grandTotal:
            serverGrandTotal,

          advancePaid:
            serverAdvancePaid,

          balanceDue:
            serverBalanceDue,

          invoiceId:
            savedInvoiceData?._id ||
            savedInvoiceData?.invoiceNo ||
            null,
        }
      );

       

        // Call onSuccess immediately with full data — parent (HotelManagement) shows the popup
        if (typeof onSuccess === "function") {
          onSuccess({
            success: true,
            invoice: savedInvoiceData,
            customer: customer,
            paymentMethod,
            grandTotal: serverGrandTotal,
            advancePaid: serverAdvancePaid,
            balanceDue: serverBalanceDue,
            bookingIds: uniqueBookingIds,
          });
        }
    } catch (error) {
      console.error(
        "[Payment][ERROR] Checkout/payment failed:",
        error
      );

      const message =
        error?.response?.data
          ?.message ||
        error?.message ||
        "Payment could not be completed. Please try again.";

      setErrorMessage(
        message
      );
    } finally {
      setIsProcessing(false);

      console.info(
        "[Payment] Payment processing finished."
      );
    }
  };


  // =========================================================
// GENERATE PDF AFTER INVOICE TEMPLATE HAS BEEN RENDERED
// =========================================================

useEffect(() => {
  if (
    !paymentSuccess ||
    !savedInvoice ||
    pdfBlob ||
    successCallbackSentRef.current ||
    pdfGenerationStartedRef.current
  ) {
    return;
  }

  // InvoiceTemplate must already be mounted.
  if (!receiptRef.current) {
    return;
  }

  pdfGenerationStartedRef.current = true;

  let cancelled = false;

  const generateInvoicePdf = async () => {
    try {
      console.info(
        "[Payment] Generating invoice PDF..."
      );

      const canvas = await html2canvas(
        receiptRef.current,
        {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        }
      );

      if (cancelled) {
        return;
      }

      const imgData =
        canvas.toDataURL("image/png");

      const pdfWidth = 80;

      const pdfHeight =
        (canvas.height * pdfWidth) /
        canvas.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [
          pdfWidth,
          pdfHeight,
        ],
      });

      pdf.addImage(
        imgData,
        "PNG",
        0,
        0,
        pdfWidth,
        pdfHeight
      );

      const generatedBlob =
        pdf.output("blob");

      if (cancelled) {
        return;
      }

      if (
        !generatedBlob ||
        generatedBlob.size === 0
      ) {
        throw new Error(
          "Generated invoice PDF is empty."
        );
      }

      console.info(
        "[Payment] Invoice PDF generated successfully.",
        {
          invoiceNo:
            savedInvoice?.invoiceNo,
          size:
            generatedBlob.size,
        }
      );

      // Store the exact generated PDF.
      setPdfBlob(generatedBlob);

      // Send success data ONLY after PDF is ready.
      if (
        !successCallbackSentRef.current &&
        typeof onSuccess === "function"
      ) {
        successCallbackSentRef.current = true;

        onSuccess({
          success: true,

          invoice:
            savedInvoice,

          customer,

          paymentMethod,

          grandTotal:
            serverGrandTotal,

          advancePaid:
            serverAdvancePaid,

          balanceDue:
            serverBalanceDue,

          bookingIds:
            selectedRooms
              .map((room) =>
                typeof room?.bookingId === "object"
                  ? String(
                      room.bookingId?._id ??
                      room.bookingId?.id ??
                      ""
                    )
                  : String(
                      room?.bookingId || ""
                    )
              )
              .filter(Boolean),




            
          // SAME PDF
          pdfBlob:
            generatedBlob,
        });
      }

    } catch (error) {
      console.error(
        "[Payment] Invoice PDF generation failed:",
        error
      );

      pdfGenerationStartedRef.current = false;

      setErrorMessage(
        "Invoice was created, but PDF generation failed."
      );
    }
  };

  

  generateInvoicePdf();

  return () => {
    cancelled = true;
  };

}, [
  paymentSuccess,
  savedInvoice,
  pdfBlob,
]);


  // =========================================================
  // DOWNLOAD PDF
  // =========================================================

  const handleDownloadPDF =
    async () => {
      if (
        !savedInvoice ||
        !receiptRef.current
      ) {
        return;
      }

      setIsDownloading(true);

      try {
        const canvas =
          await html2canvas(
            receiptRef.current,
            {
              scale: 2,

              useCORS: true,

              backgroundColor:
                "#ffffff",
            }
          );

        const imgData =
          canvas.toDataURL(
            "image/png"
          );

        const pdfWidth = 80;

        const pdfHeight =
          (canvas.height *
            pdfWidth) /
          canvas.width;

        const pdf =
          new jsPDF({
            orientation:
              "portrait",

            unit: "mm",

            format: [
              pdfWidth,
              pdfHeight,
            ],
          });

        pdf.addImage(
          imgData,
          "PNG",
          0,
          0,
          pdfWidth,
          pdfHeight
        );

        const safeHotelName = (settings?.companyName || "Hotel").replace(/[^a-zA-Z0-9_-]/g, "_");
        pdf.save(
          `${safeHotelName}_Invoice_${savedInvoice.invoiceNo}.pdf`
        );

        setTimeout(
          () =>
            navigate(
              "/invoice-management"
            ),
          700
        );
      } catch (error) {
        console.error(
          "[Payment] PDF generation failed:",
          error
        );

        setErrorMessage(
          "Invoice saved, but PDF generation failed."
        );
      } finally {
        setIsDownloading(false);
      }
    };

  // =========================================================
  // COMPLETE
  // =========================================================

 const handleComplete = () => {
  setPaymentSuccess(false);
  onBack?.();
};



  // =========================================================
  // INVOICE TEMPLATE DATA
  // =========================================================

  const invoiceForTemplate =
    savedInvoice ||
    buildInvoicePayload();

  // =========================================================
  // FULL INVOICE VIEW
  // =========================================================

  if (showInvoice) {
    return (
      <InvoiceTemplate
        activeInvoice={
          invoiceForTemplate
        }

        pdfInvoice={
          savedInvoice ||
          invoiceForTemplate
        }

        receiptRef={
          receiptRef
        }

        handleDownloadPDF={
          handleDownloadPDF
        }

        setActiveInvoice={() =>
          setShowInvoice(false)
        }

        formatDate={
          formatDate
        }

        formatTime={
          formatTime
        }

        hotelSettings={
          settings
        }
      />
    );
  }

  // =========================================================
  // DISPLAY ROOM DATA
  // =========================================================

  const displayRoomNumbers =
    selectedRooms
      .map(
        (room) =>
          room.roomNumber
      )
      .filter(Boolean)
      .join(", ") || "—";

  const firstRoom =
    roomBreakdown[0] || {};

  const bookedNights =
    roomBreakdown.reduce(
      (sum, room) =>
        sum +
        Number(
          room.bookedNights || 0
        ),
      0
    );

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-[calc(100vh-64px)] w-full px-4 sm:px-6 lg:px-8 ">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            disabled={isProcessing}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/20 hover:bg-black/30 text-white backdrop-blur-sm transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm"
            aria-label="Back to checkout"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-white drop-shadow-sm truncate">
              Payment & Settlement
            </h1>
          </div>
        </div>

       
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start pb-20">
        
        {/* Left Column: Guest & Stay Summary (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Guest & Room Details Card */}
          <section className="rounded-xl border border-[#dbe6f5] bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f0f4f9] flex items-center justify-between bg-[#f8fbfe]">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-[#0e2a4a]" />
                <h2 className="text-[14px] font-bold text-[#0e2a4a] tracking-tight">Stay Summary</h2>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {roomBreakdown.length} {roomBreakdown.length === 1 ? "Room" : "Rooms"}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Guest Box */}
                <div className="p-3 rounded-lg bg-[#f8fafc] border border-[#e8eef5]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7f99]">Guest Name</p>
                  <p className="text-[14px] font-bold text-[#0e2a4a] truncate mt-0.5">
                    {customer.customerName || "Guest"}
                  </p>
                  <p className="text-[12px] text-[#6b7f99] truncate mt-0.5">
                    {customer.phoneNumber || "No phone provided"}
                  </p>
                </div>

                {/* Room Numbers Box */}
                <div className="p-3 rounded-lg bg-[#f8fafc] border border-[#e8eef5]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7f99]">Assigned Room(s)</p>
                  <p className="text-[14px] font-bold text-[#0e2a4a] truncate mt-0.5">
                    {displayRoomNumbers}
                  </p>
                  <p className="text-[12px] text-[#6b7f99] truncate mt-0.5">
                    {firstRoom.roomType || "Standard Room"}
                  </p>
                </div>
              </div>

              {/* Billing Itemized Rows */}
              <div className="rounded-lg border border-[#e8eef5] overflow-hidden text-[13px]">
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#f0f4f9] bg-white">
                  <span className="text-[#51637b] font-medium">Grand Subtotal</span>
                  <span className="font-semibold text-[#0e2a4a] tabular-nums">₹{grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#f0f4f9] bg-white">
                  <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Advance Received
                  </span>
                  <span className="font-semibold text-emerald-600 tabular-nums">- ₹{advancePaid.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-3.5 py-3 bg-[#eefaf6]">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Balance Due</p>
                    <p className="text-[11px] text-emerald-700/80 font-medium">To be collected right now</p>
                  </div>
                  <p className="text-lg font-extrabold text-[#00796b] tabular-nums">
                    ₹{currentPayment.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </section>

       
        </div>

        {/* Right Column: Payment Method Selection & Actions (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Payment Method Card */}
          <section className="rounded-xl border border-[#dbe6f5] bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f0f4f9] flex items-center gap-2.5 bg-[#f8fbfe]">
              <CreditCard className="w-4 h-4 text-[#0e2a4a]" />
              <h2 className="text-[14px] font-bold text-[#0e2a4a] tracking-tight">Select Payment Method</h2>
            </div>

            <div className="p-4 sm:p-5">
              {/* Payment Methods Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  ["cash", <Banknote className="h-5 w-5" />, "Cash"],
                  ["upi", <QrCode className="h-5 w-5" />, "UPI / QR"],
                  ["card", <CreditCard className="h-5 w-5" />, "Credit / Debit"],
                  ["bank", <Landmark className="h-5 w-5" />, "Bank Transfer"],
                ].map(([key, icon, label]) => {
                  const isSelected = paymentMethod === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => {
                        setPaymentMethod(key);
                        setErrorMessage("");
                      }}
                      className={`relative flex h-[68px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border transition-all duration-200 select-none ${
                        isSelected
                          ? "border-[#1e5ec8] bg-gradient-to-b from-[#2568e0] to-[#1a55c2] text-white shadow-md shadow-blue-500/25 scale-[1.01]"
                          : "border-[#dbe6f5] bg-[#f8fafc] text-[#2c3e55] hover:border-[#b8d1f2] hover:bg-white"
                      } disabled:cursor-not-allowed disabled:opacity-60 active:scale-95`}
                    >
                      <span className={isSelected ? "text-white" : "text-[#1e3a5f]"}>
                        {icon}
                      </span>
                      <span className="text-[12px] font-semibold tracking-tight whitespace-nowrap">
                        {label}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-300" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Error Message if any */}
              {errorMessage && (
                <div className="mt-3.5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <p className="text-[12px] font-medium leading-5 text-rose-700">
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* Action Buttons: Confirm & Cancel */}
              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="
                    group/pay
                    relative overflow-hidden w-full h-[46px] min-h-[46px] cursor-pointer
                    flex items-center justify-center gap-2 rounded-lg
                    bg-gradient-to-r from-orange-500 via-orange-500 to-amber-400
                    hover:from-orange-600 hover:via-orange-500 hover:to-amber-500
                    active:scale-[0.99]
                    text-[14px] font-semibold text-white
                    shadow-[0_2px_10px_rgba(249,115,22,0.35)]
                    hover:shadow-[0_4px_16px_rgba(249,115,22,0.5)]
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  <span className="absolute inset-0 translate-x-[-100%] group-hover/pay:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Processing Payment & Finalizing...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Payment (₹{currentPayment.toFixed(2)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onBack}
                  disabled={isProcessing}
                  className="w-full h-[40px] cursor-pointer rounded-lg border border-[#dbe6f5] bg-white hover:bg-[#f4f8fd] text-[#556982] hover:text-[#0e2a4a] text-[13px] font-medium transition flex items-center justify-center active:scale-[0.99] disabled:opacity-50"
                >
                  Back to Checkout Details
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}