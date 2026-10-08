import mongoose from "mongoose";

import CheckoutBill from "../models/checkoutBill.js";
import Booking from "../models/booking.js";
import Settings from "../models/settings.js";

import { log } from "../util/logger.js";

// ============================================================
// CONSTANTS
// ============================================================

const CHECKOUT_CUTOFF_MINUTES = 12 * 60;

// ============================================================
// TENANT VALIDATION
// ============================================================

const getTenantIds = (req, res) => {
  const hotelId = req.user?.hotelId;
  const branchId = req.user?.branchId;

  if (!hotelId || !branchId) {
    log(
      `[Checkout Bill][TENANT][ERROR] ` +
        `Missing hotelId or branchId. ` +
        `userId=${req.user?._id || "unknown"}`
    );

    res.status(403).json({
      success: false,
      message:
        "Your account is not properly connected to a hotel and branch.",
    });

    return null;
  }

  if (
    !mongoose.Types.ObjectId.isValid(hotelId) ||
    !mongoose.Types.ObjectId.isValid(branchId)
  ) {
    log(
      `[Checkout Bill][TENANT][ERROR] ` +
        `Invalid tenant IDs. ` +
        `hotelId=${hotelId}, ` +
        `branchId=${branchId}, ` +
        `userId=${req.user?._id || "unknown"}`
    );

    res.status(400).json({
      success: false,
      message: "Invalid hotel or branch information.",
    });

    return null;
  }

  return {
    hotelId,
    branchId,
  };
};

// ============================================================
// MONEY
// ============================================================

const roundMoney = (value) => {
  return Math.round((Number(value) || 0) * 100) / 100;
};

// ============================================================
// DATE HELPERS
// ============================================================

const parseDateOnly = (value) => {
  if (!value) return null;

  const text = String(value).trim();

  // YYYY-MM-DD
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
};

// ============================================================
// DATE KEY
// ============================================================

const getDateKey = (value) => {
  if (!value) return null;

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// ============================================================
// CALENDAR DAY DIFFERENCE
// ============================================================

const getCalendarDayDifference = (
  fromDate,
  toDate
) => {
  const fromKey = getDateKey(fromDate);
  const toKey = getDateKey(toDate);

  if (!fromKey || !toKey) {
    return null;
  }

  const [fromYear, fromMonth, fromDay] =
    fromKey.split("-").map(Number);

  const [toYear, toMonth, toDay] =
    toKey.split("-").map(Number);

  const fromUtc = Date.UTC(
    fromYear,
    fromMonth - 1,
    fromDay
  );

  const toUtc = Date.UTC(
    toYear,
    toMonth - 1,
    toDay
  );

  return Math.round(
    (toUtc - fromUtc) / 86400000
  );
};

// ============================================================
// TIME PARSER
// ============================================================

const parseTimeToMinutes = (time) => {
  if (!time) return null;

  const text = String(time)
    .trim()
    .toUpperCase();

  // ----------------------------------------------------------
  // 12-hour format
  // ----------------------------------------------------------

  const match12 = text.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
  );

  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const period = match12[3];

    if (
      hours < 1 ||
      hours > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    if (period === "AM") {
      if (hours === 12) {
        hours = 0;
      }
    } else if (hours !== 12) {
      hours += 12;
    }

    return hours * 60 + minutes;
  }

  // ----------------------------------------------------------
  // 24-hour format
  // ----------------------------------------------------------

  const match24 = text.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return null;
    }

    return hours * 60 + minutes;
  }

  return null;
};

// ============================================================
// BUILD CHECKOUT DATETIME
// ============================================================

const buildCheckoutDateTime = (
  checkoutDate,
  checkoutMinutes
) => {
  const date = new Date(checkoutDate);

  date.setHours(
    Math.floor(checkoutMinutes / 60),
    checkoutMinutes % 60,
    0,
    0
  );

  return date;
};

// ============================================================
// POLICY CALCULATION
// ============================================================

const calculatePolicyAmount = ({
  roomRate,
  policyType,
  policyValue,
}) => {
  const rate = Math.max(
    0,
    Number(roomRate) || 0
  );

  const value = Math.max(
    0,
    Number(policyValue) || 0
  );

  const type = String(
    policyType || "full"
  )
    .trim()
    .toLowerCase();

  // No charge
  if (
    type === "none" ||
    type === "disabled" ||
    type === "nocharge" ||
    type === "no_charge"
  ) {
    return 0;
  }

  // Percentage
  if (
    type === "percentage" ||
    type === "percent"
  ) {
    return roundMoney(
      (rate * value) / 100
    );
  }

  // Fixed amount
  if (
    type === "fixed" ||
    type === "flat" ||
    type === "amount" ||
    type === "flat amount"
  ) {
    return roundMoney(value);
  }

  // Full room rate
  return roundMoney(rate);
};

// ============================================================
// ROOM BILLING
// ============================================================

/**
 * BUSINESS RULE
 *
 * Room rate = ₹250
 *
 * Check-in:
 * 20 Sept
 *
 * Expected checkout:
 * 22 Sept
 *
 * Actual checkout:
 * 23 Sept 11 AM
 *
 * Calculation:
 *
 * 20 Sept = ₹250
 * 21 Sept = ₹250
 * 22 Sept = ₹250
 * 23 Sept = ₹125
 *
 * Room total = ₹875
 *
 * Important:
 *
 * bookedNights:
 * 20 -> 22 = 2 nights
 *
 * extraFullDays:
 * 22 -> 23 = 1 extra full day
 *
 * checkoutPolicy:
 * 23 Sept before 12 PM = ₹125
 *
 * The ₹125 checkout policy is already included
 * in roomSubtotal.
 */

const calculateRoomBilling = ({
  room,
  actualCheckoutDate,
  actualCheckoutMinutes,
  settings,
}) => {
  const rate = Math.max(
    0,
    Number(room?.pricePerNight) || 0
  );

  const checkInDate = parseDateOnly(
    room?.checkIn
  );

  if (!checkInDate) {
    throw new Error(
      `Invalid check-in date for room ${
        room?.roomNumber || "Unknown"
      }.`
    );
  }

  const expectedCheckoutDate =
    parseDateOnly(room?.checkOut);

  if (!expectedCheckoutDate) {
    throw new Error(
      `Invalid expected checkout date for room ${
        room?.roomNumber || "Unknown"
      }.`
    );
  }

  const bookedNights =
    getCalendarDayDifference(
      checkInDate,
      expectedCheckoutDate
    );

  if (
    bookedNights === null ||
    bookedNights < 0
  ) {
    throw new Error(
      `Expected checkout date cannot be before check-in date for room ${
        room?.roomNumber || "Unknown"
      }.`
    );
  }

  const normalizedBookedNights = Math.max(
    1,
    bookedNights || 1
  );

  const baseBookedRoomCharge = roundMoney(
    rate * normalizedBookedNights
  );

  // ----------------------------------------------------------
  // EXACT EXTRA MINUTES CALCULATION (Matching Checkout.jsx)
  // ----------------------------------------------------------

  const expectedTimeMinutes = parseTimeToMinutes(room?.checkOutTime || "12:00 PM") ?? 720;
  
  const expYear = expectedCheckoutDate.getFullYear();
  const expMonth = expectedCheckoutDate.getMonth();
  const expDay = expectedCheckoutDate.getDate();

  const actYear = actualCheckoutDate.getFullYear();
  const actMonth = actualCheckoutDate.getMonth();
  const actDay = actualCheckoutDate.getDate();

  const expUtcMs = Date.UTC(expYear, expMonth, expDay) + expectedTimeMinutes * 60000;
  const actUtcMs = Date.UTC(actYear, actMonth, actDay) + (actualCheckoutMinutes ?? 720) * 60000;

  let exactExtraMinutes = 0;
  if (actUtcMs > expUtcMs) {
    exactExtraMinutes = Math.floor((actUtcMs - expUtcMs) / 60000);
  }

  // 24-hr threshold rule:
  // If stay is below 24hr: extraFullDays = 0
  // If stay is 24hr and above: extraFullDays = floor(minutes / 1440)
  const extraFullDays = Math.floor(exactExtraMinutes / 1440);
  const remainingExtraMinutes = exactExtraMinutes % 1440;
  const extraHours = Math.floor(remainingExtraMinutes / 60);
  const extraMinutes = remainingExtraMinutes % 60;

  const extraFullDayCharge = roundMoney(
    rate * extraFullDays
  );

  // ----------------------------------------------------------
  // ACTUAL CHECKOUT DAY POLICY CHARGE
  // ----------------------------------------------------------

  let checkoutDayCharge = 0;
  let checkoutPolicyType = "none";
  let checkoutPolicyValue = 0;
  let checkoutPolicyName = "none";

  if (actualCheckoutMinutes < CHECKOUT_CUTOFF_MINUTES) {
    checkoutPolicyName = "before12PM";
    checkoutPolicyType = settings?.beforeCheckoutPolicyType || "percentage";
    checkoutPolicyValue = Number(settings?.beforeCheckoutValue) || 0;

    checkoutDayCharge = calculatePolicyAmount({
      roomRate: rate,
      policyType: checkoutPolicyType,
      policyValue: checkoutPolicyValue,
    });
  } else if (actualCheckoutMinutes > CHECKOUT_CUTOFF_MINUTES) {
    checkoutPolicyName = "after12PM";
    checkoutPolicyType = settings?.afterCheckoutPolicyType || "full";
    checkoutPolicyValue = Number(settings?.afterCheckoutValue) || 0;

    checkoutDayCharge = calculatePolicyAmount({
      roomRate: rate,
      policyType: checkoutPolicyType,
      policyValue: checkoutPolicyValue,
    });

    if (checkoutPolicyType === "full") {
      checkoutDayCharge = rate;
    }
  } else {
    checkoutPolicyName = "12PM";
    checkoutPolicyType = "none";
    checkoutPolicyValue = 0;
    checkoutDayCharge = 0;
  }

  // ----------------------------------------------------------
  // FINAL ROOM TOTAL
  // ----------------------------------------------------------

  const roomSubtotal = roundMoney(
    baseBookedRoomCharge +
      extraFullDayCharge +
      checkoutDayCharge
  );

  return {
    rate,
    bookedNights: normalizedBookedNights,
    completedFullDays: normalizedBookedNights + extraFullDays,
    extraFullDays,
    extraHours,
    extraMinutes,
    exactExtraMinutes,
    extraFullDayCharge,
    checkoutDayUnits: checkoutDayCharge > 0 ? 1 : 0,
    totalChargeableDays: normalizedBookedNights + extraFullDays,
    fullDayCharge: baseBookedRoomCharge,
    checkoutDayCharge,
    roomSubtotal,
    checkoutPolicy: {
      type: checkoutPolicyName,
      policyType: checkoutPolicyType,
      policyValue: checkoutPolicyValue,
      amount: checkoutDayCharge,
    },
  };
};

// ============================================================
// FOOD TOTAL
// ============================================================

const calculateFoodTotal = (
  rooms
) => {
  let total = 0;

  for (const room of rooms || []) {
    for (
      const food of
        room?.foodServices || []
    ) {
      if (
        String(
          food?.paymentStatus || ""
        ).toLowerCase() !== "pending"
      ) {
        continue;
      }

      const quantity =
        Math.max(
          0,
          Number(
            food?.quantity
          ) || 0
        );

      const price =
        Math.max(
          0,
          Number(
            food?.price
          ) || 0
        );

      const storedTotal =
        Number(food?.total);

      const itemTotal =
        Number.isFinite(
          storedTotal
        ) &&
        storedTotal >= 0
          ? storedTotal
          : price * quantity;

      total += itemTotal;
    }
  }

  return roundMoney(total);
};

// ============================================================
// ROOM SERVICE TOTAL
// ============================================================

const calculateRoomServiceTotal = (
  rooms
) => {
  let total = 0;

  for (const room of rooms || []) {
    for (
      const service of
        room?.roomServices || []
    ) {
      if (
        String(
          service?.paymentStatus || ""
        ).toLowerCase() !== "pending"
      ) {
        continue;
      }

      const quantity =
        Math.max(
          0,
          Number(
            service?.quantity
          ) || 0
        );

      const fees =
        Math.max(
          0,
          Number(
            service?.fees
          ) || 0
        );

      const storedTotal =
        Number(service?.total);

      const itemTotal =
        Number.isFinite(
          storedTotal
        ) &&
        storedTotal >= 0
          ? storedTotal
          : fees * quantity;

      total += itemTotal;
    }
  }

  return roundMoney(total);
};

// ============================================================
// BOOKING ID NORMALIZATION
// ============================================================

const normalizeBookingIds = (
  req,
  res
) => {
  const body = req.body || {};

  const incomingIds =
    Array.isArray(body.bookingIds)
      ? body.bookingIds
      : body.bookingId
        ? [body.bookingId]
        : [];

  const uniqueIds = [
    ...new Set(
      incomingIds
        .filter(Boolean)
        .map((id) =>
          String(id)
        )
    ),
  ];

  if (!uniqueIds.length) {
    res.status(400).json({
      success: false,
      message:
        "At least one booking ID is required.",
    });

    return null;
  }

  const invalidId =
    uniqueIds.find(
      (id) =>
        !mongoose.Types.ObjectId.isValid(
          id
        )
    );

  if (invalidId) {
    res.status(400).json({
      success: false,
      message:
        `Invalid booking ID: ${invalidId}`,
    });

    return null;
  }

  return uniqueIds;
};

// ============================================================
// CREATE CHECKOUT BILL
// ============================================================

export const createCheckoutBill =
  async (req, res) => {
    const requestId =
      `CB-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)
        .toUpperCase()}`;

    try {
      log(
        `[Checkout Bill][${requestId}][START] ` +
          `Checkout bill creation started.`
      );

      // ======================================================
      // TENANT
      // ======================================================

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        log(
          `[Checkout Bill][${requestId}][ERROR] ` +
            `Tenant validation failed.`
        );

        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      log(
        `[Checkout Bill][${requestId}][TENANT] ` +
          `hotelId=${hotelId}, ` +
          `branchId=${branchId}, ` +
          `userId=${req.user?._id || "unknown"}`
      );

      // ======================================================
      // BOOKING IDS
      // ======================================================

      const bookingIds =
        normalizeBookingIds(
          req,
          res
        );

      if (!bookingIds) {
        log(
          `[Checkout Bill][${requestId}][ERROR] ` +
            `Booking ID validation failed.`
        );

        return;
      }

      log(
        `[Checkout Bill][${requestId}][BOOKINGS] ` +
          `Requested bookingIds=${bookingIds.join(", ")}`
      );

      // ======================================================
      // ACTUAL CHECKOUT
      // ======================================================

      const {
        actualCheckoutDate,
        actualCheckoutTime,
        stayStatus = "vacated",
      } = req.body || {};

      if (!actualCheckoutDate) {
        log(
          `[Checkout Bill][${requestId}][ERROR] ` +
            `Actual checkout date is missing.`
        );

        return res.status(400).json({
          success: false,
          message:
            "Actual checkout date is required.",
        });
      }

      if (!actualCheckoutTime) {
        log(
          `[Checkout Bill][${requestId}][ERROR] ` +
            `Actual checkout time is missing.`
        );

        return res.status(400).json({
          success: false,
          message:
            "Actual checkout time is required.",
        });
      }

      const checkoutDate =
        parseDateOnly(
          actualCheckoutDate
        );

      if (!checkoutDate) {
        log(
          `[Checkout Bill][${requestId}][ERROR] ` +
            `Invalid actual checkout date=${actualCheckoutDate}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid actual checkout date.",
        });
      }

      const checkoutMinutes =
        parseTimeToMinutes(
          actualCheckoutTime
        );

      if (
        checkoutMinutes === null
      ) {
        log(
          `[Checkout Bill][${requestId}][ERROR] ` +
            `Invalid checkout time=${actualCheckoutTime}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid checkout time. Use HH:mm or HH:mm AM/PM format.",
        });
      }

      log(
        `[Checkout Bill][${requestId}][CHECKOUT] ` +
          `actualDate=${getDateKey(
            checkoutDate
          )}, ` +
          `actualTime=${actualCheckoutTime}, ` +
          `minutes=${checkoutMinutes}`
      );

      // ======================================================
      // FETCH BOOKINGS
      // ======================================================

      log(
        `[Checkout Bill][${requestId}][DB] ` +
          `Fetching bookings for tenant.`
      );

      const bookings =
        await Booking.find({
          _id: {
            $in: bookingIds,
          },
          hotelId,
          branchId,
        })
          .select(
            [
              "customerId",
              "rooms",
              "initialPaidAmount",
              "initialPaidUsedAmount",
              "bookingStatus",
            ].join(" ")
          )
          .lean();

      if (
        bookings.length !==
        bookingIds.length
      ) {
        const foundIds =
          new Set(
            bookings.map(
              (booking) =>
                String(
                  booking._id
                )
            )
          );

        const missingIds =
          bookingIds.filter(
            (id) =>
              !foundIds.has(id)
          );

        log(
          `[Checkout Bill][${requestId}][ERROR] ` +
            `Unauthorized or missing bookings=` +
            `${missingIds.join(", ")}`
        );

        return res.status(404).json({
          success: false,
          message:
            "One or more bookings were not found or you are not authorized to access them.",
          missingBookingIds:
            missingIds,
        });
      }

      log(
        `[Checkout Bill][${requestId}][DB] ` +
          `Successfully loaded ${bookings.length} booking(s).`
      );

      // ======================================================
      // VALIDATE ROOMS
      // ======================================================

      for (const booking of bookings) {
        if (
          !Array.isArray(
            booking.rooms
          ) ||
          booking.rooms.length === 0
        ) {
          log(
            `[Checkout Bill][${requestId}][ERROR] ` +
              `Booking=${booking._id} has no rooms.`
          );

          return res.status(400).json({
            success: false,
            message:
              `Booking ${booking._id} does not contain any rooms.`,
          });
        }
      }

      // ======================================================
      // SAME CUSTOMER VALIDATION
      // ======================================================

      const customerIds = [
        ...new Set(
          bookings
            .map(
              (booking) =>
                String(
                  booking.customerId ||
                    ""
                )
            )
            .filter(Boolean)
        ),
      ];

      if (
        customerIds.length !== 1
      ) {
        log(
          `[Checkout Bill][${requestId}][ERROR] ` +
            `Multiple customers found. ` +
            `customerIds=${customerIds.join(", ")}`
        );

        return res.status(400).json({
          success: false,
          message:
            "All selected bookings must belong to the same customer.",
        });
      }

      // ======================================================
      // FETCH SETTINGS
      // ======================================================

      log(
        `[Checkout Bill][${requestId}][DB] ` +
          `Fetching billing settings.`
      );

      // Try exact match first, then try legacy (no branchId)
      let settings =
        await Settings.findOne({
          hotelId,
          branchId,
        })
          .select(
            [
              "gstCalculationEnabled",
              "gstRate",
              "beforeCheckoutPolicyType",
              "beforeCheckoutValue",
              "afterCheckoutPolicyType",
              "afterCheckoutValue",
            ].join(" ")
          )
          .lean();

      // Try legacy settings without branchId
      if (!settings) {
        settings = await Settings.findOne({
          hotelId,
          $or: [
            { branchId: { $exists: false } },
            { branchId: null },
          ],
        })
          .select(
            [
              "gstCalculationEnabled",
              "gstRate",
              "beforeCheckoutPolicyType",
              "beforeCheckoutValue",
              "afterCheckoutPolicyType",
              "afterCheckoutValue",
            ].join(" ")
          )
          .lean();
      }

      // If still not found, use safe defaults so checkout is not blocked
      if (!settings) {
        log(
          `[Checkout Bill][${requestId}][WARN] ` +
            `Billing settings not found — using safe defaults (GST off, no late policy).`
        );
        settings = {
          gstCalculationEnabled: false,
          gstRate: 0,
          beforeCheckoutPolicyType: "fixed",
          beforeCheckoutValue: 0,
          afterCheckoutPolicyType: "fixed",
          afterCheckoutValue: 0,
        };
      }

      log(
        `[Checkout Bill][${requestId}][SETTINGS] ` +
          `GST=${settings.gstCalculationEnabled}, ` +
          `gstRate=${settings.gstRate}, ` +
          `beforePolicy=${settings.beforeCheckoutPolicyType}:${settings.beforeCheckoutValue}, ` +
          `afterPolicy=${settings.afterCheckoutPolicyType}:${settings.afterCheckoutValue}`
      );

      // ======================================================
      // BILLING TOTALS
      // ======================================================

      let roomSubtotal = 0;

      let bookedNightsTotal = 0;

      let extraFullDaysTotal = 0;

      let extraFullDayChargeTotal = 0;

      let totalChargeableDays = 0;

      let foodTotal = 0;

      let roomServiceTotal = 0;

      let checkoutPolicyAmount = 0;

      const roomDetails = [];

      const bookingDetails = [];

      let expectedCheckoutDate = null;

      // ======================================================
      // PROCESS EACH BOOKING
      // ======================================================

      for (const booking of bookings) {
        log(
          `[Checkout Bill][${requestId}][CALC] ` +
            `Processing booking=${booking._id}`
        );

        let bookingRoomSubtotal = 0;

        let bookingBookedNights = 0;

        let bookingExtraFullDays = 0;

        let bookingExtraFullDayCharge = 0;

        let bookingCheckoutPolicyAmount = 0;

        // ====================================================
        // PROCESS EACH ROOM
        // ====================================================

        for (
          const room of booking.rooms
        ) {
          const roomBilling =
            calculateRoomBilling({
              room,
              actualCheckoutDate:
                checkoutDate,
              actualCheckoutMinutes:
                checkoutMinutes,
              settings,
            });

          const roomFoodTotal =
            calculateFoodTotal([
              room,
            ]);

          const roomServiceAmount =
            calculateRoomServiceTotal([
              room,
            ]);

          // --------------------------------------------------
          // TOTALS
          // --------------------------------------------------

          bookingRoomSubtotal +=
            roomBilling.roomSubtotal;

          bookingBookedNights +=
            roomBilling.bookedNights;

          bookingExtraFullDays +=
            roomBilling.extraFullDays;

          bookingExtraFullDayCharge +=
            roomBilling.extraFullDayCharge;

          bookingCheckoutPolicyAmount +=
            roomBilling.checkoutDayCharge;

          roomSubtotal +=
            roomBilling.roomSubtotal;

          bookedNightsTotal +=
            roomBilling.bookedNights;

          extraFullDaysTotal +=
            roomBilling.extraFullDays;

          extraFullDayChargeTotal +=
            roomBilling.extraFullDayCharge;

          checkoutPolicyAmount +=
            roomBilling.checkoutDayCharge;

          totalChargeableDays +=
            roomBilling.totalChargeableDays;

          foodTotal +=
            roomFoodTotal;

          roomServiceTotal +=
            roomServiceAmount;

          // --------------------------------------------------
          // EXPECTED CHECKOUT
          // --------------------------------------------------

          if (room.checkOut) {
            const roomExpectedDate =
              new Date(
                room.checkOut
              );

            if (
              !Number.isNaN(
                roomExpectedDate.getTime()
              )
            ) {
              if (
                !expectedCheckoutDate ||
                roomExpectedDate >
                  expectedCheckoutDate
              ) {
                expectedCheckoutDate =
                  roomExpectedDate;
              }
            }
          }

          // --------------------------------------------------
          // ROOM LOG
          // --------------------------------------------------

          log(
            `[Checkout Bill][${requestId}][ROOM] ` +
              `booking=${booking._id}, ` +
              `room=${room.roomNumber || "unknown"}, ` +
              `rate=${roomBilling.rate}, ` +
              `bookedNights=${roomBilling.bookedNights}, ` +
              `completedFullDays=${roomBilling.completedFullDays}, ` +
              `extraFullDays=${roomBilling.extraFullDays}, ` +
              `extraFullDayCharge=${roomBilling.extraFullDayCharge}, ` +
              `checkoutPolicy=${roomBilling.checkoutDayCharge}, ` +
              `roomTotal=${roomBilling.roomSubtotal}`
          );

          // --------------------------------------------------
          // ROOM RESPONSE
          // --------------------------------------------------

          roomDetails.push({
            bookingId:
              booking._id,

            bookingRoomId:
              room._id,

            roomId:
              room.roomId,

            roomNumber:
              room.roomNumber,

            roomType:
              room.roomType,

            bedType:
              room.bedType,

            pricePerNight:
              roomBilling.rate,

            checkIn:
              room.checkIn,

            checkInTime:
              room.checkInTime,

            expectedCheckout:
              room.checkOut,

            expectedCheckoutTime:
              room.checkOutTime,

            actualCheckoutDate:
              getDateKey(
                checkoutDate
              ),

            actualCheckoutTime,

            bookedNights:
              roomBilling.bookedNights,

            completedFullDays:
              roomBilling.completedFullDays,

            extraFullDays:
              roomBilling.extraFullDays,

            extraFullDayCharge:
              roomBilling.extraFullDayCharge,

            checkoutDayUnits:
              roomBilling.checkoutDayUnits,

            totalChargeableDays:
              roomBilling.totalChargeableDays,

            fullDayCharge:
              roomBilling.fullDayCharge,

            checkoutDayCharge:
              roomBilling.checkoutDayCharge,

            roomSubtotal:
              roomBilling.roomSubtotal,

            checkoutPolicy:
              roomBilling.checkoutPolicy,

            foodTotal:
              roomFoodTotal,

            roomServiceTotal:
              roomServiceAmount,

            billingDescription:
              `${roomBilling.bookedNights} booked night(s)` +
              `${
                roomBilling.extraFullDays > 0
                  ? ` + ${roomBilling.extraFullDays} extra full day(s)`
                  : ""
              }` +
              ` + checkout day policy`,
          });
        }

        // ====================================================
        // BOOKING FOOD/SERVICE TOTALS
        // ====================================================

        const bookingFoodTotal =
          calculateFoodTotal(
            booking.rooms
          );

        const bookingRoomServiceTotal =
          calculateRoomServiceTotal(
            booking.rooms
          );

        // ====================================================
        // BOOKING ADVANCE
        // ====================================================

        const initialPaid =
          Math.max(
            0,
            Number(
              booking.initialPaidAmount
            ) || 0
          );

        const initialUsed =
          Math.max(
            0,
            Number(
              booking.initialPaidUsedAmount
            ) || 0
          );

        const availableAdvance =
          Math.max(
            0,
            initialPaid -
              initialUsed
          );

        bookingDetails.push({
          bookingId:
            booking._id,

          customerId:
            booking.customerId,

          roomSubtotal:
            roundMoney(
              bookingRoomSubtotal
            ),

          bookedNights:
            bookingBookedNights,

          extraFullDays:
            bookingExtraFullDays,

          extraFullDayCharge:
            roundMoney(
              bookingExtraFullDayCharge
            ),

          checkoutPolicyAmount:
            roundMoney(
              bookingCheckoutPolicyAmount
            ),

          foodTotal:
            roundMoney(
              bookingFoodTotal
            ),

          roomServiceTotal:
            roundMoney(
              bookingRoomServiceTotal
            ),

          initialPaidAmount:
            initialPaid,

          initialPaidUsedAmount:
            initialUsed,

          availableAdvance,
        });

        log(
          `[Checkout Bill][${requestId}][BOOKING TOTAL] ` +
            `booking=${booking._id}, ` +
            `bookedNights=${bookingBookedNights}, ` +
            `extraFullDays=${bookingExtraFullDays}, ` +
            `extraFullDayCharge=${roundMoney(
              bookingExtraFullDayCharge
            )}, ` +
            `checkoutPolicy=${roundMoney(
              bookingCheckoutPolicyAmount
            )}, ` +
            `roomSubtotal=${roundMoney(
              bookingRoomSubtotal
            )}, ` +
            `food=${roundMoney(
              bookingFoodTotal
            )}, ` +
            `roomService=${roundMoney(
              bookingRoomServiceTotal
            )}, ` +
            `availableAdvance=${availableAdvance}`
        );
      }

      // ======================================================
      // ROUND TOTALS
      // ======================================================

      roomSubtotal =
        roundMoney(
          roomSubtotal
        );

      bookedNightsTotal =
        Math.max(
          0,
          Math.floor(
            bookedNightsTotal
          )
        );

      extraFullDaysTotal =
        Math.max(
          0,
          Math.floor(
            extraFullDaysTotal
          )
        );

      extraFullDayChargeTotal =
        roundMoney(
          extraFullDayChargeTotal
        );

      foodTotal =
        roundMoney(
          foodTotal
        );

      roomServiceTotal =
        roundMoney(
          roomServiceTotal
        );

      checkoutPolicyAmount =
        roundMoney(
          checkoutPolicyAmount
        );

      totalChargeableDays =
        Math.max(
          0,
          Math.floor(
            totalChargeableDays
          )
        );

      // ======================================================
      // SUBTOTAL
      //
      // checkoutPolicyAmount is already inside
      // roomSubtotal.
      //
      // DO NOT add it again.
      // ======================================================

      const subtotal =
        roundMoney(
          roomSubtotal +
            foodTotal +
            roomServiceTotal
        );

      // ======================================================
      // GST
      // ======================================================

      const gstEnabled =
        Boolean(
          settings.gstCalculationEnabled
        );

      const gstRate =
        gstEnabled
          ? Math.max(
              0,
              Number(
                settings.gstRate
              ) || 0
            )
          : 0;

      const gstAmount =
        gstEnabled
          ? roundMoney(
              (subtotal *
                gstRate) /
                100
            )
          : 0;

      // ======================================================
      // GRAND TOTAL
      // ======================================================

      const grandTotal =
        roundMoney(
          subtotal +
            gstAmount
        );

      // ======================================================
      // AVAILABLE ADVANCE
      // ======================================================

      let totalAvailableAdvance = 0;

      for (
        const booking of bookings
      ) {
        const initialPaid =
          Math.max(
            0,
            Number(
              booking.initialPaidAmount
            ) || 0
          );

        const initialUsed =
          Math.max(
            0,
            Number(
              booking.initialPaidUsedAmount
            ) || 0
          );

        const available =
          Math.max(
            0,
            initialPaid -
              initialUsed
          );

        totalAvailableAdvance +=
          available;

        log(
          `[Checkout Bill][${requestId}][ADVANCE] ` +
            `booking=${booking._id}, ` +
            `initialPaid=${initialPaid}, ` +
            `used=${initialUsed}, ` +
            `available=${available}`
        );
      }

      totalAvailableAdvance =
        roundMoney(
          totalAvailableAdvance
        );

      const initialPaidAmount =
        roundMoney(
          Math.min(
            totalAvailableAdvance,
            grandTotal
          )
        );

      const balanceDue =
        roundMoney(
          Math.max(
            0,
            grandTotal -
              initialPaidAmount
          )
        );

      // ======================================================
      // ACTUAL CHECKOUT DATETIME
      // ======================================================

      const actualCheckoutDateTime =
        buildCheckoutDateTime(
          checkoutDate,
          checkoutMinutes
        );

      // ======================================================
      // EXTRA CHARGES DISPLAY
      //
      // IMPORTANT:
      //
      // This array only describes charges.
      //
      // It does NOT get added again to subtotal.
      // ======================================================

      const extraCharges = [];

      // ------------------------------------------------------
      // EXTRA FULL DAY
      // ------------------------------------------------------

      if (
        extraFullDaysTotal > 0 &&
        extraFullDayChargeTotal > 0
      ) {
        extraCharges.push({
          name:
            extraFullDaysTotal === 1
              ? "Extra full day stay"
              : "Extra full day stay",

          fees:
            extraFullDayChargeTotal,
        });
      }

      // ------------------------------------------------------
      // CHECKOUT POLICY
      // ------------------------------------------------------

      if (
        checkoutPolicyAmount > 0
      ) {
        const hasBefore12 =
          checkoutMinutes <
          CHECKOUT_CUTOFF_MINUTES;

        extraCharges.push({
          name: hasBefore12
            ? "Actual checkout day - before 12 PM"
            : "Actual checkout day - full day",

          fees:
            checkoutPolicyAmount,
        });
      }

      // ======================================================
      // BILLING LOG
      // ======================================================

      log(
        `[Checkout Bill][${requestId}][TOTAL] ` +
          `bookedNights=${bookedNightsTotal}, ` +
          `extraFullDays=${extraFullDaysTotal}, ` +
          `extraFullDayCharge=${extraFullDayChargeTotal}, ` +
          `checkoutPolicy=${checkoutPolicyAmount}, ` +
          `roomSubtotal=${roomSubtotal}, ` +
          `foodTotal=${foodTotal}, ` +
          `roomServiceTotal=${roomServiceTotal}, ` +
          `subtotal=${subtotal}, ` +
          `gst=${gstAmount}, ` +
          `grandTotal=${grandTotal}, ` +
          `advance=${initialPaidAmount}, ` +
          `balance=${balanceDue}`
      );

      // ======================================================
      // SAVE CHECKOUT BILL
      // ======================================================

      log(
        `[Checkout Bill][${requestId}][DB] ` +
          `Creating CheckoutBill document.`
      );

      const newBill =
        new CheckoutBill({
          hotelId,
          branchId,

          customer:
            bookings[0].customerId,

          extraCharges,

          roomExtraStay: {
            extraTimeStay: {
              before12PM: {
                type:
                  settings.beforeCheckoutPolicyType ||
                  "percentage",

                amount:
                  Number(
                    settings.beforeCheckoutValue
                  ) || 0,
              },

              after12PM: {
                type:
                  settings.afterCheckoutPolicyType ||
                  "full",

                amount:
                  Number(
                    settings.afterCheckoutValue
                  ) || 0,
              },
            },

            // ------------------------------------------------
            // IMPORTANT FIX
            //
            // This is ONLY the extra full-day stay.
            //
            // It must NOT contain the checkout policy amount.
            // ------------------------------------------------

            extraDayStay: {
              numberOfDays:
                extraFullDaysTotal,

              amount:
                extraFullDayChargeTotal,
            },
          },

          roomBilling: {
            // Original booked nights
            nights:
              bookedNightsTotal,

            // Final room amount
            roomSubtotal,

            checkoutPolicy: {
              type:
                checkoutMinutes <
                CHECKOUT_CUTOFF_MINUTES
                  ? "before12PM"
                  : "after12PM",

              policyType:
                checkoutMinutes <
                CHECKOUT_CUTOFF_MINUTES
                  ? settings.beforeCheckoutPolicyType ||
                    "percentage"
                  : settings.afterCheckoutPolicyType ||
                    "full",

              policyValue:
                checkoutMinutes <
                CHECKOUT_CUTOFF_MINUTES
                  ? Number(
                      settings.beforeCheckoutValue
                    ) || 0
                  : Number(
                      settings.afterCheckoutValue
                    ) || 0,

              amount:
                checkoutPolicyAmount,
            },

            expectedCheckoutDate,

            checkoutDate,

            actualCheckoutDateTime,
          },

          gst:
            gstAmount,

          initialPaidAmount:
            initialPaidAmount,

          foodTotal:
            foodTotal,

          roomServiceTotal:
            roomServiceTotal,

          grandTotal:
            grandTotal,

          balanceDue:
            balanceDue,

          stayStatus,

          checkoutDateTime:
            actualCheckoutDateTime,
        });

      const savedBill =
        await newBill.save();

      log(
        `[Checkout Bill][${requestId}][DB] ` +
          `CheckoutBill saved successfully. ` +
          `billId=${savedBill._id}`
      );

      // ======================================================
      // POPULATE CUSTOMER
      // ======================================================

      await savedBill.populate(
        "customer"
      );

      // ======================================================
      // SUCCESS LOG
      // ======================================================

      log(
        `[Checkout Bill][${requestId}][SUCCESS] ` +
          `Checkout bill created successfully. ` +
          `billId=${savedBill._id}, ` +
          `bookingCount=${bookings.length}, ` +
          `bookedNights=${bookedNightsTotal}, ` +
          `extraFullDays=${extraFullDaysTotal}, ` +
          `checkoutPolicy=${checkoutPolicyAmount}, ` +
          `grandTotal=${grandTotal}`
      );

      // ======================================================
      // RESPONSE
      // ======================================================

      return res.status(201).json({
        success: true,

        message:
          "Checkout bill has been successfully created.",

        data:
          savedBill,

        calculation: {
          bookingIds,

          bookings:
            bookingDetails,

          rooms:
            roomDetails,

          // --------------------------------------------------
          // ROOM BILLING
          // --------------------------------------------------

          roomSubtotal,

          bookedNights:
            bookedNightsTotal,

          extraFullDays:
            extraFullDaysTotal,

          extraFullDayCharge:
            extraFullDayChargeTotal,

          totalChargeableDays,

          // --------------------------------------------------
          // SERVICES
          // --------------------------------------------------

          foodTotal,

          roomServiceTotal,

          // --------------------------------------------------
          // CHECKOUT POLICY
          // --------------------------------------------------

          checkoutPolicy: {
            type:
              checkoutMinutes <
              CHECKOUT_CUTOFF_MINUTES
                ? "before12PM"
                : "after12PM",

            policyType:
              checkoutMinutes <
              CHECKOUT_CUTOFF_MINUTES
                ? settings.beforeCheckoutPolicyType ||
                  "percentage"
                : settings.afterCheckoutPolicyType ||
                  "full",

            policyValue:
              checkoutMinutes <
              CHECKOUT_CUTOFF_MINUTES
                ? Number(
                    settings.beforeCheckoutValue
                  ) || 0
                : Number(
                    settings.afterCheckoutValue
                  ) || 0,

            amount:
              checkoutPolicyAmount,
          },

          // --------------------------------------------------
          // TOTALS
          // --------------------------------------------------

          subtotal,

          gst: {
            enabled:
              gstEnabled,

            rate:
              gstRate,

            amount:
              gstAmount,
          },

          grandTotal,

          // --------------------------------------------------
          // ADVANCE
          // --------------------------------------------------

          totalAvailableAdvance,

          initialPaidAmount,

          balanceDue,

          // --------------------------------------------------
          // CHECKOUT
          // --------------------------------------------------

          actualCheckoutDate:
            getDateKey(
              checkoutDate
            ),

          actualCheckoutTime,

          expectedCheckoutDate,

          // --------------------------------------------------
          // BUSINESS RULE
          // --------------------------------------------------

          billingRule:
            "Each calendar day from check-in through actual checkout is chargeable. Previously completed days are charged at the full room rate. The actual checkout day uses the configured before/after 12 PM policy.",
        },
      });
    } catch (error) {
      log(
        `[Checkout Bill][${requestId}][FATAL ERROR] ` +
          `Failed to create checkout bill. ` +
          `message=${error?.message || "Unknown error"}`
      );

      console.error(
        `[Checkout Bill][${requestId}][STACK]`,
        error?.stack
      );

      return res.status(500).json({
        success: false,
        message:
          "An unexpected error occurred while creating the checkout bill.",
        requestId,
      });
    }
  };

// ============================================================
// GET ALL CHECKOUT BILLS
// ============================================================

export const getAllCheckoutBills =
  async (req, res) => {
    const requestId =
      `CB-LIST-${Date.now()}`;

    try {
      log(
        `[Checkout Bill][${requestId}][LIST] ` +
          `Fetching checkout bills.`
      );

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      const bills =
        await CheckoutBill.find({
          hotelId,
          branchId,
        })
          .populate("customer")
          .sort({
            createdAt: -1,
          })
          .lean();

      log(
        `[Checkout Bill][${requestId}][LIST] ` +
          `Successfully fetched ${bills.length} bill(s).`
      );

      return res.status(200).json({
        success: true,
        count: bills.length,
        message:
          "Checkout bills retrieved successfully.",
        data: bills,
      });
    } catch (error) {
      log(
        `[Checkout Bill][${requestId}][LIST][ERROR] ` +
          `${error?.message || "Unknown error"}`
      );

      console.error(
        `[Checkout Bill][${requestId}][LIST][STACK]`,
        error?.stack
      );

      return res.status(500).json({
        success: false,
        message:
          "An internal server error occurred while retrieving checkout bills.",
        requestId,
      });
    }
  };

// ============================================================
// GET CHECKOUT BILL BY ID
// ============================================================

export const getCheckoutBillById =
  async (req, res) => {
    const requestId =
      `CB-GET-${Date.now()}`;

    try {
      log(
        `[Checkout Bill][${requestId}][GET] ` +
          `Fetching checkout bill.`
      );

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        log(
          `[Checkout Bill][${requestId}][GET][ERROR] ` +
            `Invalid bill ID=${id}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid bill ID.",
        });
      }

      const bill =
        await CheckoutBill.findOne({
          _id: id,
          hotelId,
          branchId,
        })
          .populate("customer")
          .lean();

      if (!bill) {
        log(
          `[Checkout Bill][${requestId}][GET][ERROR] ` +
            `Bill not found. billId=${id}`
        );

        return res.status(404).json({
          success: false,
          message:
            "The requested checkout bill could not be found.",
        });
      }

      log(
        `[Checkout Bill][${requestId}][GET] ` +
          `Bill loaded successfully. billId=${id}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Checkout bill retrieved successfully.",
        data: bill,
      });
    } catch (error) {
      log(
        `[Checkout Bill][${requestId}][GET][ERROR] ` +
          `${error?.message || "Unknown error"}`
      );

      console.error(
        `[Checkout Bill][${requestId}][GET][STACK]`,
        error?.stack
      );

      return res.status(500).json({
        success: false,
        message:
          "An internal server error occurred while loading the checkout bill.",
        requestId,
      });
    }
  };

// ============================================================
// UPDATE CHECKOUT BILL
// ============================================================

export const updateCheckoutBill =
  async (req, res) => {
    const requestId =
      `CB-UPD-${Date.now()}`;

    try {
      log(
        `[Checkout Bill][${requestId}][UPDATE] ` +
          `Updating checkout bill.`
      );

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        log(
          `[Checkout Bill][${requestId}][UPDATE][ERROR] ` +
            `Invalid bill ID=${id}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid bill ID.",
        });
      }

      // ------------------------------------------------------
      // Only allow safe status updates.
      // Financial values must not be edited manually.
      // ------------------------------------------------------

      const updateData = {};

      if (
        req.body?.stayStatus !==
        undefined
      ) {
        updateData.stayStatus =
          req.body.stayStatus;
      }

      const updatedBill =
        await CheckoutBill.findOneAndUpdate(
          {
            _id: id,
            hotelId,
            branchId,
          },
          {
            $set: updateData,
          },
          {
            new: true,
            runValidators: true,
          }
        ).populate("customer");

      if (!updatedBill) {
        log(
          `[Checkout Bill][${requestId}][UPDATE][ERROR] ` +
            `Bill not found. billId=${id}`
        );

        return res.status(404).json({
          success: false,
          message:
            "The checkout bill you are trying to update does not exist.",
        });
      }

      log(
        `[Checkout Bill][${requestId}][UPDATE] ` +
          `Bill updated successfully. billId=${id}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Checkout bill has been updated successfully.",
        data: updatedBill,
      });
    } catch (error) {
      log(
        `[Checkout Bill][${requestId}][UPDATE][ERROR] ` +
          `${error?.message || "Unknown error"}`
      );

      console.error(
        `[Checkout Bill][${requestId}][UPDATE][STACK]`,
        error?.stack
      );

      return res.status(500).json({
        success: false,
        message:
          "An unexpected error occurred while updating the checkout bill.",
        requestId,
      });
    }
  };

// ============================================================
// DELETE CHECKOUT BILL
// ============================================================

export const deleteCheckoutBill =
  async (req, res) => {
    const requestId =
      `CB-DEL-${Date.now()}`;

    try {
      log(
        `[Checkout Bill][${requestId}][DELETE] ` +
          `Deleting checkout bill.`
      );

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        log(
          `[Checkout Bill][${requestId}][DELETE][ERROR] ` +
            `Invalid bill ID=${id}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Invalid bill ID.",
        });
      }

      const deletedBill =
        await CheckoutBill.findOneAndDelete({
          _id: id,
          hotelId,
          branchId,
        });

      if (!deletedBill) {
        log(
          `[Checkout Bill][${requestId}][DELETE][ERROR] ` +
            `Bill not found. billId=${id}`
        );

        return res.status(404).json({
          success: false,
          message:
            "The checkout bill you are trying to delete could not be found.",
        });
      }

      log(
        `[Checkout Bill][${requestId}][DELETE] ` +
          `Bill deleted successfully. billId=${id}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Checkout bill has been deleted successfully.",
      });
    } catch (error) {
      log(
        `[Checkout Bill][${requestId}][DELETE][ERROR] ` +
          `${error?.message || "Unknown error"}`
      );

      console.error(
        `[Checkout Bill][${requestId}][DELETE][STACK]`,
        error?.stack
      );

      return res.status(500).json({
        success: false,
        message:
          "An internal server error occurred while deleting the checkout bill.",
        requestId,
      });
    }
  };