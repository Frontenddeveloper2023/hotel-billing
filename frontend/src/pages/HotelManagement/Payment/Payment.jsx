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

  const [pdfBlob, setPdfBlob] = useState(null);

  const receiptRef = useRef(null);


  const successCallbackSentRef = useRef(false);

  const pdfGenerationStartedRef = useRef(false);


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

      return {
        ...room,

        roomId:
          getEmbeddedBookingRoomId(room),

        physicalRoomId:
          getPhysicalRoomId(room),

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

        extraFullDays: Number(
          serverRoom?.extraFullDays ?? 0
        ),

        extraFullDayCharge: money(
          serverRoom?.extraFullDayCharge ?? 0
        ),

        checkoutPolicyCharge: money(
          serverRoom?.checkoutDayCharge ??
            serverRoom?.checkoutPolicy?.amount ??
            0
        ),
      };
    });

  // =========================================================
  // SERVICES
  // =========================================================

  const foodServices =
    selectedRooms.flatMap((room) =>
      Array.isArray(room?.foodServices)
        ? room.foodServices
        : []
    );

  const roomServices =
    selectedRooms.flatMap((room) =>
      Array.isArray(room?.roomServices)
        ? room.roomServices
        : []
    );

  // =========================================================
  // BILLING DISPLAY VALUES
  // =========================================================

  const billing =
    serverBilling?.calculation ||
    paymentDetails?.billing ||
    {};

  const serverRoomRent = money(
    billing.roomSubtotal
  );

  const serverFoodTotal = money(
    billing.foodTotal
  );

  const serverRoomServiceTotal = money(
    billing.roomServiceTotal
  );

  const serverExtraFullDayCharge =
    money(
      billing.extraFullDayCharge ??
        billing.extraFullDayChargeTotal
    );

  const serverCheckoutPolicyCharge =
    money(
      billing.checkoutPolicy?.amount ??
        billing.checkoutPolicyAmount ??
        billing.checkoutPolicyCharge
    );

  /*
   * Extra charges are two separate things:
   *
   * 1. Extra full day charge
   * 2. Checkout-time policy charge
   */

  const serverExtraChargeTotal =
    serverExtraFullDayCharge +
    serverCheckoutPolicyCharge;

  const serverGstAmount = money(
    billing.gst?.amount ??
      billing.gstAmount
  );

  const serverGstPercentage = money(
    billing.gst?.rate ??
      billing.gstPercentage
  );

  const serverGrandTotal = money(
    billing.grandTotal
  );

  const serverAdvancePaid = money(
    billing.initialPaidAmount ??
      billing.advancePaid
  );

  const serverBalanceDue = money(
    billing.balanceDue
  );

  // =========================================================
  // PREVIEW ADVANCE
  // =========================================================

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

  // =========================================================
  // PREVIEW ROOM RENT
  // =========================================================

  const roomRent = serverBilling
    ? serverRoomRent
    : roomBreakdown.reduce(
        (sum, room) => {
          const bookedNights =
            Number(
              room.bookedNights || 0
            );

          const roomRate = money(
            room.pricePerNight
          );

          return (
            sum +
            bookedNights * roomRate
          );
        },
        0
      );

  // =========================================================
  // FOOD
  // =========================================================

  const foodTotal = serverBilling
    ? serverFoodTotal
    : foodServices.reduce(
        (sum, item) =>
          sum + money(item.total),
        0
      );

  // =========================================================
  // ROOM SERVICE
  // =========================================================

  const roomServiceTotal = serverBilling
    ? serverRoomServiceTotal
    : roomServices.reduce(
        (sum, item) =>
          sum + money(item.total),
        0
      );

  // =========================================================
  // EXTRA CHARGES
  // =========================================================

  const extraChargeTotal = serverBilling
    ? serverExtraChargeTotal
    : roomBreakdown.reduce(
        (sum, room) =>
          sum +
          money(
            room.extraFullDayCharge
          ) +
          money(
            room.checkoutPolicyCharge
          ),
        0
      );

  // =========================================================
  // ADVANCE
  // =========================================================

  const advancePaid = serverBilling
    ? serverAdvancePaid
    : previewAdvancePaid;

  // =========================================================
  // GST
  // =========================================================

  const gstPercentage = serverBilling
    ? serverGstPercentage
    : Math.max(
        0,
        Number(
          paymentDetails?.billing
            ?.gstPercentage ?? 0
        )
      );

  const gstAmount = serverBilling
    ? serverGstAmount
    : Math.max(
        0,
        money(
          paymentDetails?.billing
            ?.gstAmount
        )
      );

  // =========================================================
  // PREVIEW TOTAL
  // =========================================================

  const previewGrandTotal =
    roomRent +
    foodTotal +
    roomServiceTotal +
    extraChargeTotal +
    gstAmount;

  const previewBalanceDue =
    Math.max(
      0,
      previewGrandTotal -
        advancePaid
    );

  // =========================================================
  // FINAL DISPLAY TOTAL
  // =========================================================

  const grandTotal = serverBilling
    ? serverGrandTotal
    : money(
        paymentDetails?.billing
          ?.grandTotal
      ) || previewGrandTotal;

  const currentPayment = serverBilling
    ? serverBalanceDue
    : Math.max(
        0,
        money(
          paymentDetails?.billing
            ?.balanceDue ??
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
                room?.pricePerNight
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
                0
            ),

          extraFullDayCharge:
            money(
              serverRoom?.extraFullDayCharge ??
                0
            ),

          checkoutPolicyCharge:
            money(
              serverRoom?.checkoutDayCharge ??
                serverRoom
                  ?.checkoutPolicy
                  ?.amount ??
                0
            ),

          checkIn:
            room?.checkIn || "",

          checkInTime:
            room?.checkInTime || "",

          checkOut:
            room?.checkOut || "",

          checkOutTime:
            room?.checkOutTime || "",
        };
      });

    // -------------------------------------------------------
    // FINAL SERVER VALUES
    // -------------------------------------------------------

    const finalRoomSubtotal =
      money(
        calculation?.roomSubtotal
      );

    const finalFoodTotal =
      money(
        calculation?.foodTotal
      );

    const finalRoomServiceTotal =
      money(
        calculation?.roomServiceTotal
      );

    const finalExtraFullDayCharge =
      money(
        calculation?.extraFullDayChargeTotal ??
          calculation?.extraFullDayCharge
      );

    const finalCheckoutPolicyCharge =
      money(
        calculation?.checkoutPolicy
          ?.amount ??
          calculation?.checkoutPolicyAmount ??
          calculation?.checkoutPolicyCharge
      );

    const finalExtraCharge =
      finalExtraFullDayCharge +
      finalCheckoutPolicyCharge;

    const finalGstAmount =
      money(
        calculation?.gst?.amount ??
          calculation?.gstAmount
      );

    const finalGstRate =
      money(
        calculation?.gst?.rate ??
          calculation?.gstPercentage
      );

    const finalGrandTotal =
      money(
        calculation?.grandTotal
      );

    const finalAdvancePaid =
      money(
        calculation?.initialPaidAmount ??
          calculation?.advancePaid
      );

    const finalBalanceDue =
      money(
        calculation?.balanceDue
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
                  `Extra Full Day - ${room.roomNumber}`,

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
            // CHECKOUT POLICY
            // -----------------------------------------------

            if (
              checkoutPolicyCharge > 0
            ) {
              items.push({
                description:
                  `Checkout Policy Charge - ${room.roomNumber}`,

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
            description:
              `${item.name || "Food Item"} - Room ${
                item.roomNumber || "-"
              }`,

            roomNumber:
              item.roomNumber || "-",

            unitPrice:
              money(item.price),

            quantity:
              Number(
                item.quantity || 1
              ),

            total:
              money(item.total),
          })
        ),

        // ---------------------------------------------------
        // ROOM SERVICES
        // ---------------------------------------------------

        ...invoiceRoomServices.map(
          (item) => ({
            description:
              `${item.name || "Room Service"} - Room ${
                item.roomNumber || "-"
              }`,

            roomNumber:
              item.roomNumber || "-",

            unitPrice:
              money(item.fees),

            quantity:
              Number(
                item.quantity || 1
              ),

            total:
              money(item.total),
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
      // BACKEND CALCULATES COMPLETE BILL
      // =====================================================

      const billResponse =
        await createCheckoutBill({
          bookingIds:
            uniqueBookingIds,

          actualCheckoutDate,

          actualCheckoutTime,

          stayStatus:
            "vacated",
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

      if (!calculation) {
        throw new Error(
          "Backend did not return checkout calculation."
        );
      }

      // Backend MUST provide these values.
      if (
        calculation.grandTotal ===
          undefined ||
        calculation.balanceDue ===
          undefined
      ) {
        throw new Error(
          "Invalid billing response from server."
        );
      }

      // =====================================================
      // SAVE SERVER BILLING
      // =====================================================

      setServerBilling({
        ...billResponse,
        calculation,
      });

      const serverGrandTotal =
        Math.max(
          0,
          money(
            calculation.grandTotal
          )
        );

      const serverBalanceDue =
        Math.max(
          0,
          money(
            calculation.balanceDue
          )
        );

      const serverAdvancePaid =
        Math.max(
          0,
          money(
            calculation
              .initialPaidAmount ??
              calculation.advancePaid
          )
        );

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

console.info(
  "[Payment] Creating invoice from CheckoutBill and Booking data.",
  {
    checkoutBillId,
    bookingIds: uniqueBookingIds,
    paymentMode,
  }
);

const invoiceResponse =
  await createInvoice({
    checkoutBillId,
    bookingIds: uniqueBookingIds,
    paymentMode,
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

        pdf.save(
          `Invoice_${savedInvoice.invoiceNo}.pdf`
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
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#040e24]/35 p-3 backdrop-blur-[2px] sm:p-4">
      <div className="flex min-h-full w-full items-center justify-center">
        <div className="flex w-full max-w-[720px] flex-col overflow-hidden rounded-[18px] bg-[#f4f8fd] shadow-[0_25px_70px_rgba(0,0,0,0.20)]">

          {/* =================================================
              HEADER
          ================================================= */}

          <div className="flex items-center justify-between border-b border-[#dbe6f5] bg-white px-5 py-4 sm:px-6">

            <div className="flex min-w-0 items-center gap-3">

              <button
                type="button"
                onClick={onBack}
                disabled={
                  isProcessing
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#dbe6f5] bg-white text-[#3d5473] transition hover:bg-[#f4f8fd] disabled:opacity-50"
                aria-label="Back to checkout"
              >
                <ArrowLeft
                  className="h-[17px] w-[17px]"
                />
              </button>

              <div className="min-w-0">

                <h1 className="text-[18px] font-bold tracking-[-0.02em] text-[#0e2a4a] sm:text-[19px]">
                  Payment
                </h1>

                <p className="mt-0.5 text-[10px] text-[#6b7f99] sm:text-[11px]">
                  Complete checkout payment
                </p>

              </div>

            </div>

            <div className="text-right">

              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#9aabc0]">
                Amount Due
              </p>

              <p className="mt-0.5 text-[18px] font-extrabold tabular-nums text-[#00796B]">
                ₹
                {currentPayment.toFixed(
                  2
                )}
              </p>

            </div>

          </div>

          {/* =================================================
              CONTENT
          ================================================= */}

          <div className="max-h-[calc(100vh-90px)] overflow-y-auto">

            <div className="p-4 sm:p-5">

              {/* =============================================
                  PAYMENT DETAILS
              ============================================= */}

              <section className="overflow-hidden rounded-[15px] border border-[#dbe6f5] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]">

                <div className="border-b border-[#e7eff8] px-5 py-4 sm:px-6">

                  <div className="flex items-center gap-2.5">

                    <Receipt
                      className="h-[18px] w-[18px] text-black"
                    />

                    <h2 className="text-[16px] font-bold text-[#0e2a4a]">
                      Payment Details
                    </h2>

                  </div>

                </div>

                <div className="p-4 sm:p-5">

                  {/* Customer + Room */}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                    {/* CUSTOMER */}

                    <div className="rounded-xl bg-[#F1F3F5] px-4 py-3.5">

                      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#0e2a4a]">
                        Customer
                      </p>

                      <p className="mt-1.5 text-[15px] font-bold leading-5 text-[#0e2a4a]">
                        {customer.customerName ||
                          "Guest"}
                      </p>

                      <p className="mt-1 text-[12px] font-medium text-[#0e2a4a]">
                        {customer.phoneNumber ||
                          "Mobile number unavailable"}
                      </p>

                    </div>

                    {/* ROOM */}

                    <div className="rounded-xl bg-[#F1F3F5] px-4 py-3.5">

                      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#0e2a4a]">
                        Room
                      </p>

                      <p className="mt-1.5 text-[15px] font-bold leading-5 text-[#0e2a4a]">
                        {displayRoomNumbers}
                      </p>

                      <p className="mt-1 text-[12px] font-medium text-[#0e2a4a]">
                        {firstRoom.roomType ||
                          "Room"}
                      </p>

                    </div>

                  </div>

                  {/* =========================================
                      AMOUNT SUMMARY
                  ========================================= */}

                  <div className="mt-3 overflow-hidden rounded-xl border border-[#dbe6f5]">

                    {/* TOTAL */}

                    <div className="flex items-center justify-between gap-4 border-b border-[#e7eff8] px-4 py-3.5">

                      <span className="text-[15px] font-medium text-[#0e2a4a]">
                        Total Amount
                      </span>

                      <span className="text-[16px] font-bold tabular-nums text-[#0e2a4a]">
                        ₹
                        {grandTotal.toFixed(
                          2
                        )}
                      </span>

                    </div>

                    {/* ADVANCE */}

                    <div className="flex items-center justify-between gap-4 border-b border-[#e7eff8] px-4 py-3.5">

                      <span className="text-[15px] font-medium text-green-700">
                        Advance Paid
                      </span>

                      <span className="text-[15px] font-semibold tabular-nums text-green-600">
                        - ₹
                        {advancePaid.toFixed(
                          2
                        )}
                      </span>

                    </div>

                    {/* BALANCE */}

                    <div className="flex items-center justify-between gap-4 bg-[#EAF8F5] px-4 py-4">

                      <div>

                        <p className="text-[14px] font-bold uppercase tracking-[0.1em] text-green-800">
                          Balance Due
                        </p>

                        <p className="mt-0.5 text-[12px] font-medium text-[#0e2a4a]">
                          Amount to collect
                        </p>

                      </div>

                      <p className="text-[21px] font-extrabold tabular-nums text-[#00796B] sm:text-[23px]">
                        ₹
                        {currentPayment.toFixed(
                          2
                        )}
                      </p>

                    </div>

                  </div>

                </div>

              </section>

              {/* =============================================
                  ERROR
              ============================================= */}

              {errorMessage && (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">

                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />

                  <p className="text-[11px] leading-5 text-rose-700">
                    {errorMessage}
                  </p>

                </div>
              )}

              {/* =============================================
                  PAYMENT METHOD
              ============================================= */}

              <section className="mt-3 overflow-hidden rounded-[15px] border border-[#dbe6f5] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.035)]">

                <div className="px-5 pb-2 pt-5 sm:px-6">

                  <div className="flex items-center gap-2.5">

                    <CreditCard
                      className="h-[19px] w-[19px] text-black"
                    />

                    <h2 className="text-[17px] font-bold tracking-[-0.01em] text-[#0e2a4a]">
                      Payment Method
                    </h2>

                  </div>

                </div>

                <div className="p-4 sm:px-5 sm:pb-5">

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

                    {[
                      [
                        "cash",
                        <Banknote className="h-[21px] w-[21px]" />,
                        "Cash",
                      ],

                      [
                        "upi",
                        <QrCode className="h-[21px] w-[21px]" />,
                        "UPI",
                      ],

                      [
                        "card",
                        <CreditCard className="h-[21px] w-[21px]" />,
                        "Card",
                      ],

                      [
                        "bank",
                        <Landmark className="h-[21px] w-[21px]" />,
                        "Bank Transfer",
                      ],
                    ].map(
                      ([
                        key,
                        icon,
                        label,
                      ]) => (
                        <button
                          key={key}
                          type="button"
                          disabled={
                            isProcessing
                          }
                          onClick={() => {
                            setPaymentMethod(
                              key
                            );

                            setErrorMessage(
                              ""
                            );
                          }}
                          className={`flex h-[72px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border text-[11px] font-semibold transition-all duration-200 ${
                            paymentMethod ===
                            key
                              ? "border-black bg-[#2568e0] text-white shadow-[0_7px_16px_rgba(0,0,0,0.14)]"
                              : "border-[#dbe6f5] bg-[#F6F7F8] text-[#0e2a4a] hover:border-[#c7d8f0] hover:bg-[#f4f8fd]"
                          } disabled:cursor-not-allowed disabled:opacity-60`}
                        >

                          <span
                            className={
                              paymentMethod ===
                              key
                                ? "text-white"
                                : "text-slate-950"
                            }
                          >
                            {icon}
                          </span>

                          <span className="whitespace-nowrap">
                            {label}
                          </span>

                        </button>
                      )
                    )}

                  </div>

                  {/* =========================================
                      CONFIRM PAYMENT
                  ========================================= */}

                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="
                      group/co
                      mt-4 flex h-[54px] w-full cursor-pointer relative overflow-hidden
                      items-center justify-center gap-2 rounded-xl
                      bg-gradient-to-r from-orange-500 via-orange-500 to-amber-400
                      hover:from-orange-600 hover:via-orange-500 hover:to-amber-500
                      active:scale-[0.98]
                      text-[15px] font-bold text-white
                      shadow-[0_4px_14px_rgba(249,115,22,0.4)]
                      hover:shadow-[0_6px_20px_rgba(249,115,22,0.55)]
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    <span className="absolute inset-0 translate-x-[-100%] group-hover/co:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />

                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-[17px] w-[17px]" />

                        Confirm Payment &amp; Complete Checkout
                      </>
                    )}

                  </button>

                </div>

              </section>

            </div>

          </div>

        </div>

      </div>

     
    </div>
  );
}