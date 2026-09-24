import cron from "node-cron";

import Subscription from "../models/subscription.js";
import Hotels from "../models/hotels.js";

import {
  sendSubscriptionExpiryReminder,
  sendSubscriptionExpiredNotification,
} from "../util/email.js";

import { log } from "../util/logger.js";

const INDIA_TIME_ZONE = "Asia/Kolkata";


// ============================================================
// GET INDIA DATE
// ============================================================

const getIndiaDate = (dateValue = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateValue);

  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value || "0";

  return {
    year: Number(getPart("year")),
    month: Number(getPart("month")),
    day: Number(getPart("day")),
  };
};


// ============================================================
// CREATE INDIA DATE KEY
// ============================================================

const getDateKey = (dateValue = new Date()) => {
  const date = getIndiaDate(dateValue);

  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(
    date.day
  ).padStart(2, "0")}`;
};


// ============================================================
// GET DATE DIFFERENCE
// ============================================================

const getDaysDifference = (fromDate, toDate) => {
  const fromKey = getDateKey(fromDate);
  const toKey = getDateKey(toDate);

  const from = new Date(`${fromKey}T00:00:00Z`);
  const to = new Date(`${toKey}T00:00:00Z`);

  return Math.round(
    (to.getTime() - from.getTime()) /
      (1000 * 60 * 60 * 24)
  );
};


// ============================================================
// CHECK SUBSCRIPTION EXPIRY
// ============================================================

const checkSubscriptionExpiry = async () => {
  try {
    log.info("==================================================");
    log.info("SUBSCRIPTION EXPIRY CRON STARTED");
    log.info("==================================================");

    const now = new Date();

    log.info(
      `[SUBSCRIPTION] Current India Date: ${getDateKey(now)}`
    );

    // ========================================================
    // GET ACTIVE / EXPIRING SUBSCRIPTIONS
    // ========================================================

    const subscriptions = await Subscription.find({
      status: {
        $in: ["active", "expiring_soon"],
      },
    }).populate(
      "planId",
      "planName"
    );

    log.info(
      `[SUBSCRIPTION] Subscriptions found: ${subscriptions.length}`
    );

    // ========================================================
    // PROCESS EACH SUBSCRIPTION
    // ========================================================

    for (const subscription of subscriptions) {
      try {
        if (!subscription.endDate) {
          continue;
        }

        // ----------------------------------------------------
        // GET HOTEL
        // ----------------------------------------------------

        const hotel = await Hotels.findById(
          subscription.hotelId
        );

        if (!hotel) {
          log.warn(
            `[SUBSCRIPTION] Hotel not found for subscription ${subscription._id}`
          );

          continue;
        }

        if (!hotel.email) {
          log.warn(
            `[SUBSCRIPTION] No email found for hotel ${hotel.hotelName}`
          );

          continue;
        }

        // ----------------------------------------------------
        // CALCULATE DAYS REMAINING
        // ----------------------------------------------------

        const daysRemaining = getDaysDifference(
          now,
          subscription.endDate
        );

        log.info(
          `[SUBSCRIPTION] ${hotel.hotelName} | ` +
          `Expiry: ${getDateKey(subscription.endDate)} | ` +
          `Days Remaining: ${daysRemaining}`
        );

        // ====================================================
        // EXPIRED
        // ====================================================

        if (now >= new Date(subscription.endDate)) {
          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} subscription has expired.`
          );

          subscription.status = "expired";

          // --------------------------------------------------
          // SEND EXPIRED EMAIL ONLY ONCE
          // --------------------------------------------------

          if (!subscription.expiryNotificationSentAt) {
            try {
              await sendSubscriptionExpiredNotification({
                to: hotel.email,
                hotelName: hotel.hotelName,
                planName:
                  subscription.planId?.planName ||
                  "Current Plan",
                endDate: subscription.endDate,
              });

              subscription.expiryNotificationSentAt =
                new Date();

              log.info(
                `[SUBSCRIPTION] Expired email sent to ${hotel.email}`
              );
            } catch (emailError) {
              log.error(
                `[SUBSCRIPTION] Failed to send expired email to ${hotel.email}: ${emailError.message}`
              );
            }
          }

          await subscription.save();

          continue;
        }

        // ====================================================
        // 7 DAYS BEFORE
        // ====================================================

        if (
          daysRemaining === 7 &&
          !subscription.expiryReminder7DaysSentAt
        ) {
          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} has 7 days remaining.`
          );

          subscription.status = "expiring_soon";

          try {
            await sendSubscriptionExpiryReminder({
              to: hotel.email,
              hotelName: hotel.hotelName,
              planName:
                subscription.planId?.planName ||
                "Current Plan",
              endDate: subscription.endDate,
              daysRemaining: 7,
            });

            subscription.expiryReminder7DaysSentAt =
              new Date();

            log.info(
              `[SUBSCRIPTION] 7-day reminder sent to ${hotel.email}`
            );
          } catch (emailError) {
            log.error(
              `[SUBSCRIPTION] Failed to send 7-day reminder to ${hotel.email}: ${emailError.message}`
            );
          }

          await subscription.save();

          continue;
        }

        // ====================================================
        // 1 DAY BEFORE
        // ====================================================

        if (
          daysRemaining === 1 &&
          !subscription.expiryReminder1DaySentAt
        ) {
          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} has 1 day remaining.`
          );

          subscription.status = "expiring_soon";

          try {
            await sendSubscriptionExpiryReminder({
              to: hotel.email,
              hotelName: hotel.hotelName,
              planName:
                subscription.planId?.planName ||
                "Current Plan",
              endDate: subscription.endDate,
              daysRemaining: 1,
            });

            subscription.expiryReminder1DaySentAt =
              new Date();

            log.info(
              `[SUBSCRIPTION] 1-day reminder sent to ${hotel.email}`
            );
          } catch (emailError) {
            log.error(
              `[SUBSCRIPTION] Failed to send 1-day reminder to ${hotel.email}: ${emailError.message}`
            );
          }

          await subscription.save();

          continue;
        }

        // ====================================================
        // STILL ACTIVE
        // ====================================================

        if (
          daysRemaining > 1 &&
          subscription.status !== "active"
        ) {
          subscription.status = "active";

          await subscription.save();
        }
      } catch (subscriptionError) {
        log.error(
          `[SUBSCRIPTION] Error processing subscription ${subscription._id}: ${subscriptionError.message}`
        );
      }
    }

    log.info("==================================================");
    log.info("SUBSCRIPTION EXPIRY CRON COMPLETED");
    log.info("==================================================");
  } catch (error) {
    log.error(
      `[SUBSCRIPTION] CRON ERROR: ${error.message}`
    );

    if (error.stack) {
      log.error(
        `[SUBSCRIPTION] STACK: ${error.stack}`
      );
    }
  }
};


// ============================================================
// RUN EVERY MINUTE
// ============================================================

cron.schedule(
  "* * * * *",
  async () => {
    log.info(
      "[SUBSCRIPTION] Expiry cron triggered"
    );

    await checkSubscriptionExpiry();
  },
  {
    timezone: INDIA_TIME_ZONE,
  }
);


// ============================================================
// RUN ON SERVER START
// ============================================================

log.info(
  "[SUBSCRIPTION] Subscription expiry cron initialized successfully"
);

log.info(
  "[SUBSCRIPTION] Cron schedule: Every minute"
);

log.info(
  `[SUBSCRIPTION] Cron timezone: ${INDIA_TIME_ZONE}`
);

checkSubscriptionExpiry();