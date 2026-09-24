import cron from "node-cron";
import Customer from "../models/customers.js";
import { log } from "../util/logger.js";

const INDIA_TIME_ZONE = "Asia/Kolkata";

// ============================================================
// GET CURRENT INDIA DATE + TIME
// ============================================================

const getIndiaNow = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value || "0";

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
    second: Number(getPart("second")),
  };
};


// ============================================================
// GET DATE PARTS
// ============================================================

const getDateParts = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};


// ============================================================
// PARSE TIME
// Supports:
// 13:53
// 11:53
// 01:53 PM
// 11:53 AM
// ============================================================

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue) {
    return 0;
  }

  const value = String(timeValue)
    .trim()
    .toUpperCase();

  // 12-hour format
  const amPmMatch = value.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/
  );

  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const period = amPmMatch[3];

    if (
      hours < 1 ||
      hours > 12 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return 0;
    }

    if (period === "AM" && hours === 12) {
      hours = 0;
    }

    if (period === "PM" && hours !== 12) {
      hours += 12;
    }

    return hours * 60 + minutes;
  }

  // 24-hour format
  const twentyFourHourMatch = value.match(
    /^(\d{1,2}):(\d{2})$/
  );

  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);

    if (
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      return 0;
    }

    return hours * 60 + minutes;
  }

  return 0;
};


// ============================================================
// CREATE COMPARISON TIMESTAMP
// ============================================================

const createComparisonTime = (
  year,
  month,
  day,
  hours,
  minutes,
  seconds = 0
) => {
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds)
  );
};


// ============================================================
// MAIN OVERSTAY CHECK
// ============================================================

const checkOverstays = async () => {
  try {
    log.info("==================================================");
    log.info("OVERSTAY CRON STARTED");
    log.info("==================================================");

    // ----------------------------------------------------------
    // CURRENT INDIA TIME
    // ----------------------------------------------------------

    const now = getIndiaNow();

    const currentTimestamp = createComparisonTime(
      now.year,
      now.month,
      now.day,
      now.hour,
      now.minute,
      now.second
    );

    const currentIndiaDateTime =
      `${String(now.day).padStart(2, "0")}/` +
      `${String(now.month).padStart(2, "0")}/` +
      `${now.year} ` +
      `${String(now.hour).padStart(2, "0")}:` +
      `${String(now.minute).padStart(2, "0")}:` +
      `${String(now.second).padStart(2, "0")}`;

    log.info(
      `[OVERSTAY] Current India Date/Time: ${currentIndiaDateTime}`
    );

    log.info(
      `[OVERSTAY] Timezone: ${INDIA_TIME_ZONE}`
    );

    // ----------------------------------------------------------
    // GET STAYING CUSTOMERS
    // ----------------------------------------------------------

    const activeCustomers = await Customer.find({
      checkoutStatus: "Staying",
    });

    log.info(
      `[OVERSTAY] Staying customers found: ${activeCustomers.length}`
    );

    // ----------------------------------------------------------
    // PROCESS EACH CUSTOMER
    // ----------------------------------------------------------

    for (const customer of activeCustomers) {
      try {
        log.info("----------------------------------------------");

        log.info(
          `[OVERSTAY] Checking customer: ${customer.customerName}`
        );

        log.info(
          `[OVERSTAY] Customer ID: ${customer._id}`
        );

        log.info(
          `[OVERSTAY] Room Number: ${customer.roomNumber}`
        );

        log.info(
          `[OVERSTAY] Current Status: ${customer.checkoutStatus}`
        );

        // ------------------------------------------------------
        // CHECKOUT DATE
        // ------------------------------------------------------

        if (!customer.checkOut) {
          log.warn(
            `[OVERSTAY] ${customer.customerName} has NO checkout date`
          );

          continue;
        }

        const checkoutDateParts = getDateParts(
          customer.checkOut
        );

        if (!checkoutDateParts) {
          log.error(
            `[OVERSTAY] Invalid checkout date for ${customer.customerName}`
          );

          continue;
        }

        const checkoutDateString =
          `${String(checkoutDateParts.day).padStart(2, "0")}/` +
          `${String(checkoutDateParts.month).padStart(2, "0")}/` +
          `${checkoutDateParts.year}`;

        log.info(
          `[OVERSTAY] Checkout Date: ${checkoutDateString}`
        );

        // ------------------------------------------------------
        // CHECKOUT TIME
        // ------------------------------------------------------

        const checkoutTime = customer.checkOutTime || "00:00";

        log.info(
          `[OVERSTAY] Checkout Time from DB: ${checkoutTime}`
        );

        const checkoutMinutes =
          parseTimeToMinutes(checkoutTime);

        const checkoutHours = Math.floor(
          checkoutMinutes / 60
        );

        const checkoutRemainingMinutes =
          checkoutMinutes % 60;

        log.info(
          `[OVERSTAY] Parsed Checkout Time: ` +
          `${String(checkoutHours).padStart(2, "0")}:` +
          `${String(checkoutRemainingMinutes).padStart(2, "0")}`
        );

        // ------------------------------------------------------
        // CREATE CHECKOUT TIMESTAMP
        // ------------------------------------------------------

        const checkoutTimestamp = createComparisonTime(
          checkoutDateParts.year,
          checkoutDateParts.month,
          checkoutDateParts.day,
          checkoutHours,
          checkoutRemainingMinutes,
          0
        );

        log.info(
          `[OVERSTAY] Current Timestamp: ${currentTimestamp}`
        );

        log.info(
          `[OVERSTAY] Checkout Timestamp: ${checkoutTimestamp}`
        );

        // ------------------------------------------------------
        // COMPARE
        // ------------------------------------------------------

        if (currentTimestamp >= checkoutTimestamp) {
          log.info(
            `[OVERSTAY] ${customer.customerName} ` +
            `(Room ${customer.roomNumber}) ` +
            `HAS OVERSTAYED.`
          );

          log.info(
            `[OVERSTAY] Updating checkoutStatus: Staying -> Overstayed`
          );

          customer.checkoutStatus = "Overstayed";

          await customer.save();

          log.info(
            `[OVERSTAY] SUCCESS: ${customer.customerName} ` +
            `updated to Overstayed`
          );
        } else {
          log.info(
            `[OVERSTAY] ${customer.customerName} ` +
            `(Room ${customer.roomNumber}) ` +
            `is STILL STAYING.`
          );
        }
      } catch (customerError) {
        log.error(
          `[OVERSTAY] Error processing customer ${customer._id}: ` +
          `${customerError.message}`
        );
      }
    }

    log.info("==================================================");
    log.info("OVERSTAY CRON COMPLETED");
    log.info("==================================================");
  } catch (error) {
    log.error(
      `[OVERSTAY] CRON ERROR: ${error.message}`
    );

    if (error.stack) {
      log.error(
        `[OVERSTAY] STACK: ${error.stack}`
      );
    }
  }
};


// ============================================================
// RUN EVERY MINUTE
// ============================================================
//
// Every minute is better for accurate status.
// timezone is explicitly India.
// ============================================================

cron.schedule(
  "* * * * *",
  async () => {
    log.info("[OVERSTAY] Cron triggered");
    await checkOverstays();
  },
  {
    timezone: "Asia/Kolkata",
  }
);


// ============================================================
// RUN ONCE WHEN SERVER STARTS
// ============================================================

log.info(
  "[OVERSTAY] Overstay cron initialized successfully"
);

log.info(
  "[OVERSTAY] Cron schedule: Every minute"
);

log.info(
  "[OVERSTAY] Cron timezone: Asia/Kolkata"
);

checkOverstays();