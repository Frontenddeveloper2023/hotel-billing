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
    })
      .sort({ endDate: -1, createdAt: -1 })
      .populate("planId", "planName");

    // Deduplicate by hotelId: only evaluate the single latest subscription per hotel
    const latestSubscriptionsByHotel = new Map();
    for (const sub of subscriptions) {
      if (!sub.hotelId) continue;
      const hId = String(sub.hotelId._id || sub.hotelId);
      if (!latestSubscriptionsByHotel.has(hId)) {
        latestSubscriptionsByHotel.set(hId, sub);
      }
    }

    const deduplicatedSubscriptions = Array.from(
      latestSubscriptionsByHotel.values()
    );

    log.info(
      `[SUBSCRIPTION] Subscriptions found: ${subscriptions.length} (Deduplicated active per hotel: ${deduplicatedSubscriptions.length})`
    );

    // ========================================================
    // PROCESS EACH SUBSCRIPTION
    // ========================================================

    for (const subscription of deduplicatedSubscriptions) {
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
const recipientEmail = String(
  ownerUser?.email || hotel.email || ""
)
  .trim()
  .replace(/^['"]+|['"]+$/g, "");

  
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
          if (!subscription.expiryNotificationSentAt) {
            // Atomic Lock: Try to claim this specific email notification
            const lockedSub = await Subscription.findOneAndUpdate(
              {
                _id: subscription._id,
                expiryNotificationSentAt: null,
              },
              {
                $set: {
                  status: "expired",
                  expiryNotificationSentAt: new Date(),
                },
              },
              { new: true }
            );

            // If null, another server instance already claimed and sent it
            if (!lockedSub) continue;

            log.info(
              `[SUBSCRIPTION] ${hotel.hotelName} subscription has expired.`
            );

            try {
              await sendSubscriptionExpiredNotification({
                to: recipientEmail,
                hotelName: hotel.hotelName,
                planName: subscription.planId?.planName || "Current Plan",
                endDate: subscription.endDate,
                hotelId: hotel._id,
              });

              log.info(
                `[SUBSCRIPTION] Expired email sent to ${recipientEmail}`
              );
            } catch (emailError) {
              log.error(
                `[SUBSCRIPTION] Failed to send expired email to ${recipientEmail}: ${emailError.message}`
              );
            }
          } else if (subscription.status !== "expired") {
            // Fallback to just update status if email was already sent
            subscription.status = "expired";
            await subscription.save();
          }

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
          // Atomic Lock
          const lockedSub = await Subscription.findOneAndUpdate(
            {
              _id: subscription._id,
              expiryReminder7DaysSentAt: null,
            },
            {
              $set: {
                status: "expiring_soon",
                expiryReminder7DaysSentAt: new Date(),
              },
            },
            { new: true }
          );

          if (!lockedSub) continue;

          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} has ${daysRemaining} days remaining (7-day window).`
          );

          try {
            await sendSubscriptionExpiryReminder({
              to: recipientEmail,
              hotelName: hotel.hotelName,
              planName: subscription.planId?.planName || "Current Plan",
              endDate: subscription.endDate,
              daysRemaining: daysRemaining,
              hotelId: hotel._id,
            });

            log.info(
              `[SUBSCRIPTION] 7-day reminder sent to ${recipientEmail}`
            );
          } catch (emailError) {
            log.error(
              `[SUBSCRIPTION] Failed to send 7-day reminder to ${recipientEmail}: ${emailError.message}`
            );
          }

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
          // Atomic Lock
          const lockedSub = await Subscription.findOneAndUpdate(
            {
              _id: subscription._id,
              expiryReminder3DaysSentAt: null,
            },
            {
              $set: {
                status: "expiring_soon",
                expiryReminder3DaysSentAt: new Date(),
              },
            },
            { new: true }
          );

          if (!lockedSub) continue;

          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} has ${daysRemaining} days remaining (3-day window).`
          );

          try {
            await sendSubscriptionExpiryReminder({
              to: recipientEmail,
              hotelName: hotel.hotelName,
              planName: subscription.planId?.planName || "Current Plan",
              endDate: subscription.endDate,
              daysRemaining: daysRemaining,
              hotelId: hotel._id,
            });

            log.info(
              `[SUBSCRIPTION] 3-day reminder sent to ${recipientEmail}`
            );
          } catch (emailError) {
            log.error(
              `[SUBSCRIPTION] Failed to send 3-day reminder to ${recipientEmail}: ${emailError.message}`
            );
          }

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
          // Atomic Lock
          const lockedSub = await Subscription.findOneAndUpdate(
            {
              _id: subscription._id,
              expiryReminder1DaySentAt: null,
            },
            {
              $set: {
                status: "expiring_soon",
                expiryReminder1DaySentAt: new Date(),
              },
            },
            { new: true }
          );

          if (!lockedSub) continue;

          log.info(
            `[SUBSCRIPTION] ${hotel.hotelName} has 1 day remaining.`
          );

          try {
            await sendSubscriptionExpiryReminder({
              to: recipientEmail,
              hotelName: hotel.hotelName,
              planName: subscription.planId?.planName || "Current Plan",
              endDate: subscription.endDate,
              daysRemaining: Math.max(1, daysRemaining),
              hotelId: hotel._id,
            });

            log.info(
              `[SUBSCRIPTION] 1-day reminder sent to ${recipientEmail}`
            );
          } catch (emailError) {
            log.error(
              `[SUBSCRIPTION] Failed to send 1-day reminder to ${recipientEmail}: ${emailError.message}`
            );
          }

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