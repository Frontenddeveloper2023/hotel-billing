import React, { useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Clock,
  CheckCircle2,
  CreditCard,
  Users,
  Receipt,
  Info,
  RefreshCw,
} from "lucide-react";
import Payment from "../Payment/Payment";
import { getSettings } from "../../../service/settingsService";

export default function Checkout({ stay, onClose }) {
  const [showPaymentPage, setShowPaymentPage] = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState("");

  // =====================================================
  // LOAD COMPANY SETTINGS
  // GST + CHECKOUT EXTRA-CHARGE POLICY COME FROM API
  // =====================================================
  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        setSettingsLoading(true);
        setSettingsError("");

        const response = await getSettings();

        const apiSettings =
          response?.data ||
          response?.settings ||
          response ||
          {};

        if (mounted) {
          setSettings(apiSettings);
        }
      } catch (error) {
        console.error("Failed to load company settings:", error);

        if (mounted) {
          setSettings({});
          setSettingsError("Unable to load company billing settings.");
        }
      } finally {
        if (mounted) {
          setSettingsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  if (!stay) return null;

  const customer = stay.customer || {};
  const selectedRooms = Array.isArray(stay.selectedRooms)
    ? stay.selectedRooms
    : Array.isArray(stay.rooms)
      ? stay.rooms
      : [];

  const checkoutBookings = Array.isArray(stay.checkoutBookings)
    ? stay.checkoutBookings
    : [];

  const billingSettings = settings || {};

  const gstEnabled = Boolean(billingSettings.gstCalculationEnabled);

  const gstPercentage = Math.max(0, Number(billingSettings.gstRate ?? 0));

  const afterCheckoutPolicyType = String(
    billingSettings.afterCheckoutPolicyType || "full"
  ).toLowerCase();

  const afterCheckoutValue = Math.max(
    0,
    Number(billingSettings.afterCheckoutValue ?? 0)
  );

  const beforeCheckoutPolicyType = String(
    billingSettings.beforeCheckoutPolicyType || "percentage"
  ).toLowerCase();

  const beforeCheckoutValue = Math.max(
    0,
    Number(billingSettings.beforeCheckoutValue ?? 0)
  );

  const money = (value) =>
    `₹${Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (value) => {
    if (!value) return "-";

    const text = String(value).trim();

    const match12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match12) {
      let hours = Number(match12[1]);
      const minutes = Number(match12[2]);
      const period = match12[3].toUpperCase();

      if (period === "AM" && hours === 12) hours = 0;
      if (period === "PM" && hours !== 12) hours += 12;

      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    const match24 = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const d = new Date();
      d.setHours(Number(match24[1]), Number(match24[2]), 0, 0);
      return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    return text;
  };

  const getRate = (room) =>
    Number(
      room?.pricePerNight ??
      room?.roomPricePerNight ??
      room?.perNightRoomPrice ??
      room?.roomPrice ??
      room?.rate ??
      0
    );

  // Preview nights follow the backend billing rule:
  // check-in date -> actual checkout date, minimum 1 night.
  const getNights = (room) => {
    const actual = getActualCheckout(room);
    const fromKey = getDateKey(room?.checkIn);
    const toKey = getDateKey(actual.date || room?.checkOut);

    if (fromKey && toKey) {
      const [fy, fm, fd] = fromKey.split("-").map(Number);
      const [ty, tm, td] = toKey.split("-").map(Number);

      const fromUtc = Date.UTC(fy, fm - 1, fd);
      const toUtc = Date.UTC(ty, tm - 1, td);

      const calendarNights = Math.round((toUtc - fromUtc) / 86400000);

      if (calendarNights > 0) {
        return calendarNights;
      }
    }

    return Math.max(1, Number(room?.bookedNights ?? room?.nights ?? 1));
  };

  const getFoodTotal = (room) => {
    const foods = Array.isArray(room?.foodServices) ? room.foodServices : [];

    return foods
      .filter((food) => String(food?.paymentStatus || "Pending") === "Pending")
      .reduce((sum, food) => {
        const quantity = Number(food?.quantity ?? 1);
        const total =
          food?.total !== undefined
            ? Number(food.total || 0)
            : Number(food?.price || 0) * quantity;

        return sum + total;
      }, 0);
  };

  const getRoomServiceTotal = (room) => {
    const services = Array.isArray(room?.roomServices) ? room.roomServices : [];

    return services
      .filter((service) => String(service?.paymentStatus || "Pending") === "Pending")
      .reduce((sum, service) => {
        const quantity = Number(service?.quantity ?? 1);
        const total =
          service?.total !== undefined
            ? Number(service.total || 0)
            : Number(service?.fees || 0) * quantity;

        return sum + total;
      }, 0);
  };

  // =====================================================
  // CHECKOUT POLICY CALCULATION
  // =====================================================

  const CHECKOUT_CUTOFF_MINUTES = 12 * 60; // 12:00 PM

  const parseTimeToMinutes = (value) => {
    if (!value) return null;

    const text = String(value).trim().toUpperCase();

    const match12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
    if (match12) {
      let hours = Number(match12[1]);
      const minutes = Number(match12[2]);

      if (hours > 12 || minutes > 59) return null;

      if (match12[3] === "AM" && hours === 12) hours = 0;
      if (match12[3] === "PM" && hours !== 12) hours += 12;

      return hours * 60 + minutes;
    }

    const match24 = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hours = Number(match24[1]);
      const minutes = Number(match24[2]);

      if (hours > 23 || minutes > 59) return null;

      return hours * 60 + minutes;
    }

    return null;
  };

  const getDateKey = (value) => {
    if (!value) return null;

    const text = String(value).trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const dateDifferenceInDays = (fromValue, toValue) => {
    const fromKey = getDateKey(fromValue);
    const toKey = getDateKey(toValue);

    if (!fromKey || !toKey) return null;

    const [fy, fm, fd] = fromKey.split("-").map(Number);
    const [ty, tm, td] = toKey.split("-").map(Number);

    const from = Date.UTC(fy, fm - 1, fd);
    const to = Date.UTC(ty, tm - 1, td);

    return Math.round((to - from) / 86400000);
  };

  const getDateTimeParts = (dateValue, timeValue) => {
    const dateKey = getDateKey(dateValue);
    const minutes = parseTimeToMinutes(timeValue);

    if (!dateKey || minutes === null) return null;

    return {
      dateKey,
      minutes,
    };
  };

  const getActualCheckout = (room) => ({
    date:
      room?.actualCheckoutDate ||
      stay?.actualCheckoutDate ||
      stay?.stay?.actualCheckoutDate ||
      "",
    time:
      room?.actualCheckoutTime ||
      stay?.actualCheckoutTime ||
      stay?.stay?.actualCheckoutTime ||
      "",
  });

  const getCheckoutPolicyCharge = ({ rate, policyType, policyValue, units = 1 }) => {
    const safeRate = Math.max(0, Number(rate || 0));
    const safeValue = Math.max(0, Number(policyValue || 0));
    const safeUnits = Math.max(0, Number(units || 0));
    const type = String(policyType || "").toLowerCase();

    if (!safeUnits || (!safeValue && type !== "full")) return 0;

    if (
      type === "none" ||
      type === "disabled" ||
      type === "nocharge" ||
      type === "no_charge"
    ) {
      return 0;
    }

    if (type === "percentage" || type === "percent" || type === "% of room rate") {
      return (safeRate * safeUnits * safeValue) / 100;
    }

    if (type === "fixed" || type === "flat" || type === "amount" || type === "flat amount") {
      return safeValue * safeUnits;
    }

    return safeRate * safeUnits;
  };

  const getPolicyLabel = (type, value) => {
    const normalized = String(type || "").toLowerCase();

    if (normalized === "percentage" || normalized === "percent" || normalized === "% of room rate") {
      return `${value}% of room rate`;
    }

    if (normalized === "fixed" || normalized === "flat" || normalized === "amount" || normalized === "flat amount") {
      return `${money(value)} flat`;
    }

    if (normalized === "none" || normalized === "disabled") {
      return "No charge";
    }

    return "Full day room charge";
  };



 const getExtraStayDetails = (room) => {
  const actual = getActualCheckout(room);

  const actualParts = getDateTimeParts(
    actual.date,
    actual.time
  );

  const expectedCheckoutDateKey = getDateKey(
    room?.checkOut
  );

  if (!actualParts || !expectedCheckoutDateKey) {
    return {
      rule: "No extra stay",
      extraDays: 0,
      extraHours: 0,
      extraMinutes: 0,
      extraMinutesTotal: 0,
      fullDayUnits: 0,
      timeUnits: 0,
      dayCharge: 0,
      timeCharge: 0,
      extraCharge: 0,
      timePolicyType: "",
      timePolicyValue: 0,
      dayPolicyType: afterCheckoutPolicyType,
      dayPolicyValue: afterCheckoutValue,
    };
  }

  // Calculate exact time difference
  const expectedParts = getDateTimeParts(
    expectedCheckoutDateKey,
    room?.checkOutTime || "12:00 PM"
  );
  let exactExtraMinutes = 0;

  if (expectedParts && actualParts) {
    const [ey, em, ed] = expectedParts.dateKey.split("-").map(Number);
    const [ay, am, ad] = actualParts.dateKey.split("-").map(Number);

    const expMs = Date.UTC(ey, em - 1, ed) + expectedParts.minutes * 60000;
    const actMs = Date.UTC(ay, am - 1, ad) + actualParts.minutes * 60000;

    if (actMs > expMs) {
      exactExtraMinutes = Math.floor((actMs - expMs) / 60000);
    }
  }

  const actualIsBeforeNoon = actualParts.minutes < CHECKOUT_CUTOFF_MINUTES;
  const actualIsAfterNoon = actualParts.minutes > CHECKOUT_CUTOFF_MINUTES;
  const actualIsExactlyNoon = actualParts.minutes === CHECKOUT_CUTOFF_MINUTES;

  // 24hr threshold rule:
  // If stay is below 24hr: extraDays = 0, extraHours and minutes = elapsed time
  // If stay is 24hr and above: extraDays = floor(minutes / 1440), extraHours = remainder
  const extraDays = Math.floor(exactExtraMinutes / 1440);
  const remainingExtraMinutes = exactExtraMinutes % 1440;
  const displayExtraHours = Math.floor(remainingExtraMinutes / 60);
  const displayExtraMinutes = remainingExtraMinutes % 60;

  const extraMinutesTotal = exactExtraMinutes;
  const extraHours = displayExtraHours;
  const extraMinutes = displayExtraMinutes;

  let timePolicyType = "";
  let timePolicyValue = 0;
  let timeCharge = 0;

  // IMPORTANT:
  // roomTotal already calculates the room charge
  // from check-in date -> actual checkout date.
  //
  // Therefore DO NOT add extraDays * roomRate again.
  // Only calculate the checkout-day policy charge here.

  if (actualIsBeforeNoon) {
    timePolicyType = beforeCheckoutPolicyType;
    timePolicyValue = beforeCheckoutValue;

    timeCharge = getCheckoutPolicyCharge({
      rate: getRate(room),
      policyType: beforeCheckoutPolicyType,
      policyValue: beforeCheckoutValue,
      units: 1,
    });
  } else if (actualIsAfterNoon) {
    timePolicyType = afterCheckoutPolicyType;
    timePolicyValue = afterCheckoutValue;

    timeCharge = getCheckoutPolicyCharge({
      rate: getRate(room),
      policyType: afterCheckoutPolicyType,
      policyValue: afterCheckoutValue,
      units: 1,
    });
  } else if (actualIsExactlyNoon) {
    timePolicyType = "none";
    timePolicyValue = 0;
    timeCharge = 0;
  }

  let rule = "No extra stay";

  if (extraDays > 0 && actualIsBeforeNoon) {
    rule = `Extra stay: ${extraDays} night${
      extraDays !== 1 ? "s" : ""
    } + before 12 PM`;
  } else if (extraDays > 0 && actualIsAfterNoon) {
    rule = `Extra stay: ${extraDays} night${
      extraDays !== 1 ? "s" : ""
    } + after 12 PM`;
  } else if (extraDays > 0) {
    rule = `Extra stay: ${extraDays} night${
      extraDays !== 1 ? "s" : ""
    }`;
  } else if (actualIsBeforeNoon) {
    rule = "Before 12 PM checkout";
  } else if (actualIsAfterNoon) {
    rule = "After 12 PM checkout";
  } else {
    rule = "12 PM checkout";
  }

  return {
    rule,

    extraDays,
    extraHours,
    extraMinutes,
    extraMinutesTotal,

    // Keep these for UI/details.
    // Do NOT add full-day charge here.
    fullDayUnits: 0,
    timeUnits: timeCharge > 0 ? 1 : 0,

    dayCharge: 0,
    timeCharge,

    extraCharge: Number(timeCharge || 0),

    timePolicyType,
    timePolicyValue,

    dayPolicyType: afterCheckoutPolicyType,
    dayPolicyValue: afterCheckoutValue,
  };
};

 const roomBreakdown = useMemo(
  () =>
    selectedRooms.map((room) => {
      const rate = getRate(room);
      const nights = getNights(room);
      const stayDetails = getExtraStayDetails(room);

      return {
        ...room,
        rate,
        nights,
        roomSubtotal: Number(rate * nights),
        extraCharge: Number(stayDetails.extraCharge || 0),
        extraStay: stayDetails,
        extraNightsStayed: stayDetails.extraDays,
        extraHoursStayed: stayDetails.extraHours,
        extraMinutesStayed: stayDetails.extraMinutes,
        extraDayCharge: Number(stayDetails.dayCharge || 0),
        extraTimeCharge: Number(stayDetails.timeCharge || 0),
        totalExtraCharge: Number(stayDetails.extraCharge || 0),
        foodTotal: getFoodTotal(room),
        roomServiceTotal: getRoomServiceTotal(room),
      };
    }),
  [
    selectedRooms,
    settings,
    stay?.actualCheckoutDate,
    stay?.actualCheckoutTime,
    stay?.stay?.actualCheckoutDate,
    stay?.stay?.actualCheckoutTime,
  ]
);


const roomTotal = roomBreakdown.reduce(
  (sum, room) =>
    sum +
    Number(room.rate || 0) *
      Number(room.nights || 0),
  0
);

const foodTotal = roomBreakdown.reduce(
  (sum, room) =>
    sum + Number(room.foodTotal || 0),
  0
);

const roomServiceTotal = roomBreakdown.reduce(
  (sum, room) =>
    sum + Number(room.roomServiceTotal || 0),
  0
);

const extraChargeTotal = roomBreakdown.reduce(
  (sum, room) =>
    sum + Number(room.extraCharge || 0),
  0
);

const subtotal =
  roomTotal +
  foodTotal +
  roomServiceTotal +
  extraChargeTotal;

const gstAmount = gstEnabled
  ? (subtotal * gstPercentage) / 100
  : 0;

const grandTotal =
  subtotal + gstAmount;

  const advanceByBooking = checkoutBookings.map((booking) => {
    const initialPaidAmount = Number(booking?.initialPaidAmount ?? 0);
    const initialPaidUsedAmount = Number(booking?.initialPaidUsedAmount ?? 0);

    const initialPaidAvailable = Math.max(
      0,
      Number(booking?.initialPaidAvailable ?? initialPaidAmount - initialPaidUsedAmount)
    );

    return {
      ...booking,
      initialPaidAmount,
      initialPaidUsedAmount,
      initialPaidAvailable,
    };
  });

  const totalAdvanceAvailable = advanceByBooking.reduce(
    (sum, booking) => sum + booking.initialPaidAvailable,
    0
  );

  const advanceUsed = Math.min(grandTotal, totalAdvanceAvailable);
  const balanceDue = Math.max(0, grandTotal - advanceUsed);

  const actualCheckoutDate =
    stay.actualCheckoutDate ||
    stay.stay?.actualCheckoutDate ||
    roomBreakdown.find((room) => room.actualCheckoutDate)?.actualCheckoutDate ||
    "";

  const actualCheckoutTime =
    stay.actualCheckoutTime ||
    stay.stay?.actualCheckoutTime ||
    roomBreakdown.find((room) => room.actualCheckoutTime)?.actualCheckoutTime ||
    "";

  const totalBookedNights = roomBreakdown.reduce((sum, room) => sum + Number(room.nights || 0), 0);
  const totalExtraStayMinutes = roomBreakdown.reduce(
    (sum, room) => sum + Number(room.extraStay?.extraMinutesTotal || 0),
    0
  );
  const totalExtraDaysFromTime = Math.floor(totalExtraStayMinutes / 1440);
  const totalExtraRemainderMinutes = totalExtraStayMinutes % 1440;
  const totalExtraHours = Math.floor(totalExtraRemainderMinutes / 60);
  const totalExtraMinutes = totalExtraRemainderMinutes % 60;
  const totalExtraNights = totalExtraDaysFromTime;
  const totalExtraDayUnits = roomBreakdown.reduce(
    (sum, room) => sum + Number(room.extraStay?.fullDayUnits || 0),
    0
  );

  const totalExtraTimeUnits = roomBreakdown.reduce(
    (sum, room) => sum + Number(room.extraStay?.timeUnits || 0),
    0
  );

  const totalExtraDayCharge = roomBreakdown.reduce(
    (sum, room) => sum + Number(room.extraStay?.dayCharge || 0),
    0
  );

  const totalExtraTimeCharge = roomBreakdown.reduce(
    (sum, room) => sum + Number(room.extraStay?.timeCharge || 0),
    0
  );

  const totalExtraChargeUnits =
    totalExtraDayUnits + totalExtraTimeUnits;

  // FIXED: Properly look up fields from both nested customer object and root stay properties
  const customerName = customer.customerName || stay.customerName || customer.name || stay.name || "-";
  const phoneNumber = customer.phoneNumber || stay.phoneNumber || stay.phone || customer.phone || "-";
  const email = customer.email || stay.email || "";
  const address = customer.address || stay.address || "";
  const customerId = stay.customerId || customer._id || customer.customerId || "";

 

  const selectedRoomIds = roomBreakdown.map((room) => room._id || room.roomId).filter(Boolean);
  const selectedRoomNumbers = roomBreakdown.map((room) => room.roomNumber).filter(Boolean);

  const staySummary = {
    bookedNights: totalBookedNights,
    extraNightsStayed: totalExtraNights,
    extraHoursStayed: totalExtraHours,
    extraMinutesStayed: totalExtraMinutes,
    totalExtraStayMinutes,
    totalNightsStayed: totalBookedNights,
    actualCheckOut: `${actualCheckoutDate || ""} ${actualCheckoutTime || ""}`.trim(),
    actualCheckOutDate: actualCheckoutDate,
    actualCheckOutTime: actualCheckoutTime,
    checkoutCutoffTime: "12:00 PM",
    beforeCheckoutPolicyType,
    beforeCheckoutPolicyValue: beforeCheckoutValue,
    afterCheckoutPolicyType,
    afterCheckoutPolicyValue: afterCheckoutValue,
    extraChargeTotal,
    extraDayCharge: totalExtraDayCharge,
    extraTimeCharge: totalExtraTimeCharge,
    extraDayUnits: totalExtraDayUnits,
    extraTimeUnits: totalExtraTimeUnits,
  };

  const paymentDetails = {
    customerId,

    settings: {
      gstCalculationEnabled: gstEnabled,
      gstRate: gstPercentage,
      afterCheckoutPolicyType,
      afterCheckoutValue,
      beforeCheckoutPolicyType,
      beforeCheckoutValue,
    },

    customer: {
      ...customer,
      customerId,
      customerName,
      phoneNumber,
      alternativePhone: customer.alternativePhone || stay.alternativePhone || "",
      email,
      address,
      idProofType: customer.idProofType || stay.idProofType || "",
      idProofNumber: customer.idProofNumber || stay.idProofNumber || "",
    },

    selectedRooms: roomBreakdown,

    room: {
      rooms: roomBreakdown,
      roomIds: selectedRoomIds,
      roomNumbers: selectedRoomNumbers,
    },

    rooms: roomBreakdown,

    checkoutBookings: advanceByBooking,

    actualCheckoutDate,
    actualCheckoutTime,
    staySummary,

    billing: {
      roomTotal,
      roomSubtotal: roomTotal,
      foodTotal,
      roomServiceTotal,
      serviceTotal: roomServiceTotal,
      extraChargeTotal,
      subtotal,
      gstPercentage: gstEnabled ? gstPercentage : 0,
      gstAmount,
      grandTotal,
      advancePaid: advanceUsed,
      balanceDue,
      bookedNights: totalBookedNights,
      extraNightsStayed: totalExtraNights,
      extraHoursStayed: totalExtraHours,
      extraMinutesStayed: totalExtraMinutes,
      extraChargeUnits: totalExtraChargeUnits,
      extraDayUnits: totalExtraDayUnits,
      extraTimeUnits: totalExtraTimeUnits,
      extraDayCharge: totalExtraDayCharge,
      extraTimeCharge: totalExtraTimeCharge,
      beforeCheckoutPolicyType,
      beforeCheckoutPolicyValue: beforeCheckoutValue,
      afterCheckoutPolicyType,
      afterCheckoutPolicyValue: afterCheckoutValue,
      checkoutCutoffTime: "12:00 PM",
      roomCount: roomBreakdown.length,

      rooms: roomBreakdown.map((room) => ({
        bookingId: room.bookingId,
        roomId: room._id || room.roomId,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        bedType: room.bedType,
        pricePerNight: room.rate,
        roomPricePerNight: room.rate,
        checkIn: room.checkIn,
        checkInTime: room.checkInTime,
        checkOut: room.checkOut,
        checkOutTime: room.checkOutTime,
        actualCheckoutDate: room.actualCheckoutDate || actualCheckoutDate,
        actualCheckoutTime: room.actualCheckoutTime || actualCheckoutTime,
        bookedNights: room.nights,
        roomSubtotal: room.roomSubtotal,
        extraNightsStayed: room.extraNightsStayed || 0,
        extraHoursStayed: room.extraHoursStayed || 0,
        extraMinutesStayed: room.extraMinutesStayed || 0,
        extraStay: room.extraStay,
        extraChargeRule: room.extraStay?.rule || "",
        extraChargeUnits:
          Number(room.extraStay?.fullDayUnits || 0) +
          Number(room.extraStay?.timeUnits || 0),
        extraDayUnits: room.extraStay?.fullDayUnits || 0,
        extraTimeUnits: room.extraStay?.timeUnits || 0,
        extraDayCharge: room.extraStay?.dayCharge || 0,
        extraTimeCharge: room.extraStay?.timeCharge || 0,
        extraChargePolicyType:
          room.extraStay?.timePolicyType ||
          room.extraStay?.dayPolicyType ||
          "",
        extraChargePolicyValue:
          room.extraStay?.timePolicyValue ??
          room.extraStay?.dayPolicyValue ??
          0,
        totalExtraCharge: room.extraCharge,
        foodTotal: room.foodTotal,
        roomServiceTotal: room.roomServiceTotal,
      })),
    },

    stay: {
      ...stay,
      customerId,
      customer: {
        ...customer,
        customerId,
        customerName,
        phoneNumber,
        email,
        address,
      },
      selectedRooms: roomBreakdown,
      rooms: roomBreakdown,
      checkoutBookings: advanceByBooking,
      actualCheckoutDate,
      actualCheckoutTime,
    },
  };

  const handleClose = () => {
    if (typeof onClose === "function") {
      onClose();
    }
  };

  const handlePaymentSuccess = (data) => {
    console.log("Checkout/payment completed:", data);
    setShowPaymentPage(false);
    handleClose();
  };

  if (showPaymentPage) {
    return (
      <Payment
        paymentDetails={paymentDetails}
        amount={balanceDue}
        onBack={() => setShowPaymentPage(false)}
        onSuccess={handlePaymentSuccess}
      />
    );
  }

  const beforePolicyLabel = getPolicyLabel(beforeCheckoutPolicyType, beforeCheckoutValue);
  const afterPolicyLabel = getPolicyLabel(afterCheckoutPolicyType, afterCheckoutValue);


  const firstRoom = roomBreakdown[0] || {};
  const firstBooking = checkoutBookings[0] || {};

  const roomRentLabel = roomBreakdown.length === 1
    ? `Room Rent (${firstRoom.roomType || "Room"})`
    : `Room Rent (${roomBreakdown.length} Rooms)`;

  const roomRentDescription = roomBreakdown.length === 1
    ? `${firstRoom.nights || 0} Night${Number(firstRoom.nights || 0) !== 1 ? "s" : ""} × ${money(firstRoom.rate || 0)}`
    : roomBreakdown
        .map((room) => `${room.roomNumber || "Room"}: ${room.nights || 0}N × ${money(room.rate || 0)}`)
        .join(" • ");

  const pendingFoods = roomBreakdown.flatMap((room) =>
    (Array.isArray(room.foodServices) ? room.foodServices : [])
      .filter((item) => String(item?.paymentStatus || "Pending") === "Pending")
      .map((item) => ({
        ...item,
        roomNumber: room.roomNumber,
        quantity: Number(item.quantity ?? 1),
        total: Number(item.total ?? Number(item.price || 0) * Number(item.quantity ?? 1)),
      }))
  );

  const pendingRoomServices = roomBreakdown.flatMap((room) =>
    (Array.isArray(room.roomServices) ? room.roomServices : [])
      .filter((item) => String(item?.paymentStatus || "Pending") === "Pending")
      .map((item) => ({
        ...item,
        roomNumber: room.roomNumber,
        quantity: Number(item.quantity ?? 1),
        total: Number(item.total ?? Number(item.fees || 0) * Number(item.quantity ?? 1)),
      }))
  );

  const foodDescription = pendingFoods.length
    ? pendingFoods
        .map((item) => `${item.name || "Food Item"} × ${item.quantity} (${money(item.price || 0)})`)
        .join(", ")
    : "No pending food services";

  const roomServiceDescription = pendingRoomServices.length
    ? pendingRoomServices
        .map((item) => `${item.name || "Room Service"} (${money(item.total || 0)})`)
        .join(", ")
    : "No pending room services";

  const hasLateCheckout =
    Number(extraChargeTotal || 0) > 0 ||
    Number(totalExtraStayMinutes || 0) > 0;


    //extra stay calculate

const extraStayNightCount = roomBreakdown.reduce(
  (sum, room) =>
    sum + Number(room?.extraStay?.fullDayUnits || 0),
  0
);

const expectedCheckoutDisplay = firstRoom.checkOut
  ? `${formatDate(firstRoom.checkOut)} at ${formatTime(
      firstRoom.checkOutTime || "12:00 PM"
    )}`
  : "—";

const actualCheckoutDisplay = actualCheckoutDate
  ? `${formatDate(actualCheckoutDate)} at ${formatTime(
      actualCheckoutTime
    )}`
  : "—";

const lateCheckoutDescription = hasLateCheckout
  ? `${
      extraStayNightCount > 0
        ? `Extra stay: ${extraStayNightCount} night${
            extraStayNightCount !== 1 ? "s" : ""
          }`
        : "Checkout policy charge"
    } · Expected: ${expectedCheckoutDisplay} · Actual: ${actualCheckoutDisplay} · ${
      beforePolicyLabel || afterPolicyLabel
    } applied`
  : `Expected: ${expectedCheckoutDisplay} · Actual: ${actualCheckoutDisplay} · No extra charge`;

//..............




  const idProofText = customer.idProofType || stay.idProofType
    ? `${customer.idProofType || stay.idProofType} (${customer.idProofNumber || stay.idProofNumber || "—"})`
    : "ID proof not provided";

  const assignedRoomText = roomBreakdown.length > 1
    ? roomBreakdown.map((room) => `Room ${room.roomNumber || "—"}`).join(", ")
    : `Room ${firstRoom.roomNumber || "—"}`;

  const roomCategoryText = roomBreakdown.length > 1
    ? `${roomBreakdown.length} room categories`
    : firstRoom.roomType || "—";

  const expectedCheckoutText = firstRoom.checkOut
    ? `${formatDate(firstRoom.checkOut)}, ${formatTime(firstRoom.checkOutTime || "12:00 PM")}`
    : "—";

  const checkInText = firstRoom.checkIn
    ? `${formatDate(firstRoom.checkIn)}, ${formatTime(firstRoom.checkInTime)}`
    : "—";

  const actualCheckoutText = actualCheckoutDate
    ? `${formatDate(actualCheckoutDate)}, ${formatTime(actualCheckoutTime)}`
    : "—";

  const totalNightsDisplay = totalBookedNights;
  const tariffDisplay = roomBreakdown.length === 1
    ? money(firstRoom.rate || 0)
    : money(roomTotal / Math.max(1, totalBookedNights));

  return (
    <main className="min-h-[calc(100vh-64px)] w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        {/* Breadcrumb + title */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div className="min-w-0">
           

            <div className=" flex items-center gap-3">
              <h1 className="text-[28px] sm:text-[31px] leading-tight font-bold tracking-[-0.8px] text-white">
                Guest Checkout
                {stay?.checkoutNumber || stay?.invoiceNumber || stay?.bookingNumber
                  ? ` #${stay.checkoutNumber || stay.invoiceNumber || stay.bookingNumber}`
                  : ""}
              </h1>
            </div>
          </div>

         
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[400px_minmax(0,1fr)] gap-5 xl:gap-6 items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            {/* CUSTOMER INFORMATION */}
            <section className="rounded-2xl bg-white border border-[#dbe6f5] shadow-[0_1px_3px_rgba(20,25,30,0.03)] overflow-hidden">
              <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 flex items-center justify-center">
                    <Users className="w-[20px] h-[20px] text-[#17191B]" />
                  </div>
                  <h2 className="text-[18px] font-bold tracking-[-0.3px] text-[#0e2a4a]">
                    Customer Information
                  </h2>
                </div>

                <span className="rounded-full bg-[#76E4D7] px-3 py-1 text-[11px] font-semibold text-[#2568e0] whitespace-nowrap">
                  {stay?.vipGuest ? "VIP Guest" : "Guest"}
                </span>
              </div>

              <div className="px-6 pb-6">
                {/* No profile image — intentionally kept text-first like requested */}
                <div className="pb-4">
                  <p className="text-[17px] font-bold text-[#0e2a4a]">
                    {customerName}
                  </p>
                  <p className="mt-1 text-[12.5px] text-[#61666B] break-words">
                    ID Proof: {idProofText}
                  </p>
                </div>

                <div className="border-t border-[#E4E7E9] pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-5">
                  <div>
                    <p className="text-[10px] font-medium tracking-[0.02em] text-[#686D72]">
                      PHONE NUMBER
                    </p>
                    <p className="mt-0.5 text-[13.5px] font-medium text-[#282B2E]">
                      {phoneNumber}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-medium tracking-[0.02em] text-[#686D72]">
                      EMAIL ADDRESS
                    </p>
                    <p className="mt-0.5 text-[13.5px] font-medium text-[#282B2E] break-all">
                      {email || "—"}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-[10px] font-medium tracking-[0.02em] text-[#686D72]">
                      BILLING ADDRESS
                    </p>
                    <p className="mt-0.5 text-[13.5px] font-medium leading-5 text-[#282B2E]">
                      {address || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ACCOMMODATION */}
            <section className="rounded-2xl bg-white border border-[#dbe6f5] shadow-[0_1px_3px_rgba(20,25,30,0.03)] overflow-hidden">
              <div className="px-6 pt-6 pb-4 flex items-center gap-3">
                <BedDouble className="w-[21px] h-[21px] text-[#17191B]" />
                <h2 className="text-[18px] font-bold tracking-[-0.3px] text-[#0e2a4a]">
                  Accommodation &amp; Stay Details
                </h2>
              </div>

              <div className="px-6 pb-6">
                {/* Assigned room banner */}
                <div className="rounded-xl bg-[#f4f8fd] px-4 py-3.5 flex flex-col sm:flex-row sm:justify-between gap-4 border border-[#dbe6f5]">
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-medium tracking-wide text-[#6b7f99]">
                      ASSIGNED ROOM
                    </p>
                    <p className="mt-0.5 text-[20px] leading-6 font-bold text-[#0e2a4a] break-words">
                      {assignedRoomText}
                    </p>
                  </div>

                  <div className="sm:text-right flex-shrink-0">
                    <p className="text-[10px] uppercase font-medium tracking-wide text-[#6b7f99]">
                      ROOM CATEGORY
                    </p>
                    <p className="mt-0.5 text-[14px] font-semibold text-[#0e2a4a] break-words">
                      {roomCategoryText}
                    </p>
                  </div>
                </div>

                {/* Date/time details */}
                <div className="mt-3 border-b border-[#E4E7E9] pb-3.5 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                  <div>
                    <p className="text-[10px] uppercase font-medium tracking-wide text-[#686D72]">
                      CHECK-IN DATE/TIME
                    </p>
                    <p className="mt-0.5 text-[13px] font-medium text-[#272A2D]">
                      {checkInText}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase font-medium tracking-wide text-[#686D72]">
                      EXPECTED CHECKOUT
                    </p>
                    <p className="mt-0.5 text-[13px] font-medium text-[#272A2D]">
                      {expectedCheckoutText}
                    </p>
                  </div>
                </div>

                <div className="border-b border-[#E4E7E9] py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase font-medium tracking-wide text-[#686D72]">
                      ACTUAL CHECKOUT TIME
                    </p>
                    <p className="mt-0.5 text-[13px] font-medium text-[#272A2D]">
                      {actualCheckoutText}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#E6E8EA] px-2 py-1 text-[10.5px] font-medium text-[#565C61] whitespace-nowrap">
                    <Clock className="w-3.5 h-3.5" />
                    System Recorded
                  </span>
                </div>

                <div className="pt-3.5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-medium tracking-wide text-[#686D72]">
                      NIGHTS STAYED
                    </p>
                    <p className="mt-0.5 text-[16px] font-bold text-[#0e2a4a]">
                      {totalNightsDisplay} Night{Number(totalNightsDisplay) !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] uppercase font-medium tracking-wide text-[#686D72]">
                      TARIFF RATE / NIGHT
                    </p>
                    <p className="mt-0.5 text-[16px] font-bold text-[#0e2a4a]">
                      {tariffDisplay}
                    </p>
                  </div>
                </div>

                {roomBreakdown.length > 1 && (
                  <div className="mt-4 space-y-2">
                    {roomBreakdown.map((room, index) => (
                      <div
                        key={room._id || `${room.roomNumber}-${index}`}
                        className="flex items-center justify-between rounded-lg bg-[#f4f8fd] px-3 py-2.5 text-[12px]"
                      >
                        <span className="font-semibold text-[#0e2a4a]">
                          Room {room.roomNumber || "—"}
                        </span>
                        <span className="text-[#6b7f99]">
                          {room.nights} night{Number(room.nights) !== 1 ? "s" : ""} × {money(room.rate)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5 min-w-0">
            {/* BILLING BREAKDOWN */}
            <section className="rounded-2xl bg-white border border-[#dbe6f5] shadow-[0_1px_3px_rgba(20,25,30,0.03)] overflow-hidden">
              <div className="px-6 pt-6 pb-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Receipt className="w-[20px] h-[20px] text-[#0e2a4a]" />
                  <h2 className="text-[18px] font-bold tracking-[-0.3px] text-[#0e2a4a]">
                    Billing Breakdown
                  </h2>
                </div>
                <span className="font-mono text-[10px] text-[#6b7f99]">
                  {stay?.invoiceNo || stay?.invoiceNumber || "INV-PENDING"}
                </span>
              </div>

              <div className="px-6 pb-1">
                {/* Room rent */}
                <div className="py-3.5 border-b border-[#dbe6f5] flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#0e2a4a]">
                      {roomRentLabel}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-4 text-[#6b7f99] break-words">
                      {roomRentDescription}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13.5px] font-bold text-[#0e2a4a]">
                    {money(roomTotal)}
                  </p>
                </div>

                {/* Food */}
                <div className="py-3.5 border-b border-[#dbe6f5]">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#0e2a4a]">
                        Food Services
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-4 text-[#6b7f99] break-words">
                        {foodDescription}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13.5px] font-bold text-[#0e2a4a]">
                      {money(foodTotal)}
                    </p>
                  </div>
                  {foodTotal > 0 && selectedRooms.length > 0 && (
                    <div className="mt-3 space-y-1.5 pl-3 border-l-2 border-[#eaf3ff]">
                      {selectedRooms.map((room, idx) => {
                        const rFoodTotal = getFoodTotal(room);
                        if (rFoodTotal <= 0) return null;
                        return (
                          <div key={idx} className="flex justify-between items-center text-[12px]">
                            <span className="text-[#6b7f99]">Room {room.roomNumber || "—"}</span>
                            <span className="text-[#0e2a4a] font-medium">{money(rFoodTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Room services */}
                <div className="py-3.5 border-b border-[#dbe6f5]">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#0e2a4a]">
                        Room Services
                      </p>
                      <p className="mt-0.5 text-[12.5px] leading-4 text-[#6b7f99] break-words">
                        {roomServiceDescription}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13.5px] font-bold text-[#0e2a4a]">
                      {money(roomServiceTotal)}
                    </p>
                  </div>
                  {roomServiceTotal > 0 && selectedRooms.length > 0 && (
                    <div className="mt-3 space-y-1.5 pl-3 border-l-2 border-[#eaf3ff]">
                      {selectedRooms.map((room, idx) => {
                        const rServiceTotal = getRoomServiceTotal(room);
                        if (rServiceTotal <= 0) return null;
                        return (
                          <div key={idx} className="flex justify-between items-center text-[12px]">
                            <span className="text-[#6b7f99]">Room {room.roomNumber || "—"}</span>
                            <span className="text-[#0e2a4a] font-medium">{money(rServiceTotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Late checkout */}
                <div className="py-3.5 border-b border-[#dbe6f5]">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-medium text-[#0e2a4a]">
                          Late Checkout Charge
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#eaf3ff] px-2 py-0.5 text-[10px] font-semibold text-[#2568e0]">
                          <RefreshCw className="w-3 h-3" />
                          Auto-applied
                        </span>
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-4 text-[#6b7f99]">
                        {lateCheckoutDescription}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13.5px] font-bold text-[#0e2a4a]">
                      {money(extraChargeTotal)}
                    </p>
                  </div>

                  <div className="mt-2 rounded-md bg-[#eaf3ff] px-3 py-1.5 flex items-center gap-2 text-[10.5px] text-[#6b7f99]">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {hasLateCheckout
  ? `Auto-applied via Hotel Policy Settings${
      extraStayNightCount > 0
        ? ` · ${extraStayNightCount} extra night${
            extraStayNightCount !== 1 ? "s" : ""
          }`
        : ""
    }`
  : "No late checkout charge applied"}
                    </span>
                  </div>
                </div>

                {/* Totals */}
                <div className="pt-4">
                  <div className="flex items-center justify-between py-2 text-[13.5px]">
                    <span className="text-[#6b7f99]">Subtotal</span>
                    <span className="font-semibold text-[#0e2a4a]">{money(subtotal)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 text-[13.5px]">
                    <span className="text-[#6b7f99]">
                      GST ({gstEnabled ? gstPercentage : 0}%)
                    </span>
                    <span className="font-semibold text-[#0e2a4a]">{money(gstAmount)}</span>
                  </div>

                  <div className="border-t border-[#dbe6f5] mt-1 pt-3 flex items-center justify-between">
                    <span className="text-[18px] font-bold text-[#0e2a4a]">
                      Grand Total
                    </span>
                    <span className="text-[17px] font-bold text-[#0e2a4a]">
                      {money(grandTotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-[#dbe6f5]">
                    <span className="text-[13.5px] text-[#6b7f99]">Advance Paid</span>
                    <span className="font-medium text-[#0e2a4a]">
                      - {money(advanceUsed)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <span className="text-[22px] font-bold tracking-[-0.4px] text-[#0e2a4a]">
                      Balance Due
                    </span>
                    <span className="text-[22px] font-bold tracking-[-0.4px] text-[#2568e0]">
                      {money(balanceDue)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* PAYMENT METHOD */}
            <section className="rounded-2xl bg-white border border-[#dbe6f5] shadow-[0_1px_3px_rgba(20,25,30,0.03)] overflow-hidden">
              <div className="px-6 pt-6 pb-4 flex items-center gap-3">
                <CreditCard className="w-[21px] h-[21px] text-[#0e2a4a]" />
                <h2 className="text-[18px] font-bold tracking-[-0.3px] text-[#0e2a4a]">
                  Payment Method
                </h2>
              </div>

              <div className="px-6 pb-6">
                

                <button
                  type="button"
                  disabled={roomBreakdown.length === 0 || settingsLoading}
                  onClick={() => setShowPaymentPage(true)}
                  className="
                    group/co
                    mt-6 w-full min-h-[56px] relative overflow-hidden cursor-pointer
                    flex items-center justify-center gap-2
                    rounded-xl
                    bg-gradient-to-r from-orange-500 via-orange-500 to-amber-400
                    hover:from-orange-600 hover:via-orange-500 hover:to-amber-500
                    active:scale-[0.98]
                    text-white text-[15px] font-bold
                    shadow-[0_4px_14px_rgba(249,115,22,0.4)]
                    hover:shadow-[0_6px_20px_rgba(249,115,22,0.55)]
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  <span className="absolute inset-0 translate-x-[-100%] group-hover/co:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                  <CheckCircle2 className="w-[18px] h-[18px] transition-transform duration-200 group-hover/co:translate-x-0.5" />
                  Confirm Payment & Complete Checkout
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 w-full cursor-pointer rounded-xl border border-[#dbe6f5] bg-white hover:bg-[#f4f8fd] text-[#6b7f99] px-5 py-3 text-[13px] font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* Mobile-friendly bottom spacing */}
        <div className="h-4" />
      </main>

  );
}
