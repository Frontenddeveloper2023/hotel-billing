import cron from "node-cron";

import Subscription from "../models/subscription.js";
import Hotels from "../models/hotels.js";
import Users from "../models/users.js";

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
    // GET ACTIVE / EXPIRING / EXPIRED SUBSCRIPTIONS
    // Include subscriptions already marked 'expired' if the
    // expiry notification hasn't been sent yet.
    // ========================================================

    const subscriptions = await Subscription.find({
      $or: [
        {
          status: {
            $in: ["active", "expiring_soon"],
          },
        },
        {
          status: "expired",
          expiryNotificationSentAt: null,
        },
      ],
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
        // GET HOTEL & OWNER USER
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

        // Look up active hotel owner user for this hotel
        const ownerUser = await Users.findOne({
          hotelId: subscription.hotelId,
          role: "hotelOwner",
        });

        // Determine recipient email: prioritize hotelOwner user email, fallback to hotel.email
        const recipientEmail = ownerUser?.email || hotel.email;

        if (!recipientEmail) {
          log.warn(
            `[SUBSCRIPTION] No email found for hotel ${hotel.hotelName} (hotelId: ${hotel._id})`
          );

          continue;
        }

        // Keep hotel.email in sync if owner email is updated
        if (ownerUser?.email && hotel.email !== ownerUser.email) {
          hotel.email = ownerUser.email;
          await hotel.save();
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
          `Recipient: ${recipientEmail} | ` +
          `Expiry: ${getDateKey(subscription.endDate)} | ` +
          `Days Remaining: ${daysRemaining}`
        );

        // ====================================================
        // EXPIRED
        // ====================================================

        if (now >= new Date(subscription.endDate) || daysRemaining <= 0) {
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
                to: recipientEmail,
                hotelName: hotel.hotelName,
                planName:
                  subscription.planId?.planName ||
                  "Current Plan",
                endDate: subscription.endDate,
                hotelId: hotel._id,
              });

              subscription.expiryNotificationSentAt =
                new Date();

              log.info(
                `[SUBSCRIPTION] Expired email sent to ${recipientEmail}`
              );
            } catch (emailError) {
              log.error(
                `[SUBSCRIPTION] Failed to send expired email to ${recipientEmail}: ${emailError.message}`
              );
            }
          }

          await subscription.save();

          continue;
        }

        // ====================================================
        // 7 DAYS BEFORE (1 WEEK)
        // ====================================================

        if (
          daysRemaining <= 7 &&
          daysRemaining > 3 &&
          !subscription.expiryReminder7DaysSentAt
        ) {
          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} has ${daysRemaining} days remaining (7-day window).`
          );

          subscription.status = "expiring_soon";

          try {
            await sendSubscriptionExpiryReminder({
              to: recipientEmail,
              hotelName: hotel.hotelName,
              planName:
                subscription.planId?.planName ||
                "Current Plan",
              endDate: subscription.endDate,
              daysRemaining: daysRemaining,
              hotelId: hotel._id,
            });

            subscription.expiryReminder7DaysSentAt =
              new Date();

            log.info(
              `[SUBSCRIPTION] 7-day reminder sent to ${recipientEmail}`
            );
          } catch (emailError) {
            log.error(
              `[SUBSCRIPTION] Failed to send 7-day reminder to ${recipientEmail}: ${emailError.message}`
            );
          }

          await subscription.save();

          continue;
        }

        // ====================================================
        // 3 DAYS BEFORE
        // ====================================================

        if (
          daysRemaining <= 3 &&
          daysRemaining > 1 &&
          !subscription.expiryReminder3DaysSentAt
        ) {
          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} has ${daysRemaining} days remaining (3-day window).`
          );

          subscription.status = "expiring_soon";

          try {
            await sendSubscriptionExpiryReminder({
              to: recipientEmail,
              hotelName: hotel.hotelName,
              planName:
                subscription.planId?.planName ||
                "Current Plan",
              endDate: subscription.endDate,
              daysRemaining: daysRemaining,
              hotelId: hotel._id,
            });

            subscription.expiryReminder3DaysSentAt =
              new Date();

            log.info(
              `[SUBSCRIPTION] 3-day reminder sent to ${recipientEmail}`
            );
          } catch (emailError) {
            log.error(
              `[SUBSCRIPTION] Failed to send 3-day reminder to ${recipientEmail}: ${emailError.message}`
            );
          }

          await subscription.save();

          continue;
        }

        // ====================================================
        // 1 DAY BEFORE (TOMORROW)
        // ====================================================

        if (
          daysRemaining <= 1 &&
          daysRemaining > 0 &&
          !subscription.expiryReminder1DaySentAt
        ) {
          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} has 1 day remaining.`
          );

          subscription.status = "expiring_soon";

          try {
            await sendSubscriptionExpiryReminder({
              to: recipientEmail,
              hotelName: hotel.hotelName,
              planName:
                subscription.planId?.planName ||
                "Current Plan",
              endDate: subscription.endDate,
              daysRemaining: Math.max(1, daysRemaining),
              hotelId: hotel._id,
            });

            subscription.expiryReminder1DaySentAt =
              new Date();

            log.info(
              `[SUBSCRIPTION] 1-day reminder sent to ${recipientEmail}`
            );
          } catch (emailError) {
            log.error(
              `[SUBSCRIPTION] Failed to send 1-day reminder to ${recipientEmail}: ${emailError.message}`
            );
          }

          await subscription.save();

          continue;
        }

        // ====================================================
        // STILL ACTIVE (> 7 DAYS)
        // ====================================================

        if (
          daysRemaining > 7 &&
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