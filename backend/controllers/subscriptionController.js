import mongoose from "mongoose";

import Subscription from "../models/Subscription.js";
import Hotels from "../models/Hotels.js";
import Plans from "../models/Plans.js";

import { log } from "../util/logger.js";

// ============================================================
// CREATE SUBSCRIPTION
// ============================================================
export const createSubscription = async (req, res) => {
  try {
    const {
      hotelId,
      planId,
      billingCycle,
      startDate,
      endDate,
      status,
      paymentStatus,
      autoRenewal,
      trialStatus,
      customDurationDays,
      limits,
      features,
      amount,
      discount,
      tax,
      finalAmount,
      paymentTransactionId,
      invoiceId,
    } = req.body;

    // --------------------------------------------------------
    // 1. Validate hotel ID
    // --------------------------------------------------------
    if (!hotelId) {
      return res.status(400).json({
        success: false,
        message:
          "Hotel ID is required to create a subscription.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid hotel ID. Please provide a valid hotel ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Check hotel exists
    // --------------------------------------------------------
    const hotel = await Hotels.findById(hotelId);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel not found. Please select a valid hotel before creating the subscription.",
      });
    }

    // --------------------------------------------------------
    // 3. Validate plan ID
    // --------------------------------------------------------
    if (!planId) {
      return res.status(400).json({
        success: false,
        message:
          "Plan ID is required to create a subscription.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(planId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid plan ID. Please provide a valid plan ID.",
      });
    }

    // --------------------------------------------------------
    // 4. Check plan exists
    // --------------------------------------------------------
    const plan = await Plans.findById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription plan not found. Please select a valid plan.",
      });
    }

    // --------------------------------------------------------
    // 5. Check plan is active
    // --------------------------------------------------------
    if (!plan.isActive) {
      return res.status(400).json({
        success: false,
        message:
          "This subscription plan is currently inactive and cannot be purchased.",
      });
    }

    // --------------------------------------------------------
    // 6. Validate billing cycle
    // --------------------------------------------------------
    const allowedBillingCycles = [
      "monthly",
      "quarterly",
      "halfYearly",
      "yearly",
      "custom",
    ];

    if (!billingCycle) {
      return res.status(400).json({
        success: false,
        message:
          "Billing cycle is required. Please select a billing cycle.",
      });
    }

    if (!allowedBillingCycles.includes(billingCycle)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid billing cycle. Please select monthly, quarterly, half-yearly, yearly, or custom.",
      });
    }

    // --------------------------------------------------------
    // 7. Validate custom duration
    // --------------------------------------------------------
    if (billingCycle === "custom") {
      if (
        !customDurationDays ||
        !Number.isInteger(customDurationDays) ||
        customDurationDays < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Custom subscription duration must be at least 1 day.",
        });
      }
    }

    // --------------------------------------------------------
    // 8. Validate start date
    // --------------------------------------------------------
    if (!startDate) {
      return res.status(400).json({
        success: false,
        message:
          "Subscription start date is required.",
      });
    }

    const parsedStartDate = new Date(startDate);

    if (Number.isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription start date. Please provide a valid date.",
      });
    }

    // --------------------------------------------------------
    // 9. Validate end date
    // --------------------------------------------------------
    if (!endDate) {
      return res.status(400).json({
        success: false,
        message:
          "Subscription end date is required.",
      });
    }

    const parsedEndDate = new Date(endDate);

    if (Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription end date. Please provide a valid date.",
      });
    }

    if (parsedEndDate <= parsedStartDate) {
      return res.status(400).json({
        success: false,
        message:
          "Subscription end date must be later than the start date.",
      });
    }

    // --------------------------------------------------------
    // 10. Check existing active subscription
    // --------------------------------------------------------
    const existingSubscription =
      await Subscription.findOne({
        hotelId,
        status: {
          $in: [
            "trial",
            "active",
            "expiring_soon",
            "grace_period",
          ],
        },
      });

    if (existingSubscription) {
      return res.status(409).json({
        success: false,
        message:
          "This hotel already has an active subscription. Please renew or upgrade the existing subscription instead of creating a new one.",
      });
    }

    // --------------------------------------------------------
    // 11. Validate status
    // --------------------------------------------------------
    const allowedStatuses = [
      "trial",
      "active",
      "expiring_soon",
      "expired",
      "suspended",
      "cancelled",
      "payment_failed",
      "grace_period",
    ];

    if (
      status !== undefined &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription status. Please provide a valid subscription status.",
      });
    }

    // --------------------------------------------------------
    // 12. Validate payment status
    // --------------------------------------------------------
    const allowedPaymentStatuses = [
      "pending",
      "paid",
      "failed",
      "refunded",
      "partially_paid",
    ];

    if (
      paymentStatus !== undefined &&
      !allowedPaymentStatuses.includes(paymentStatus)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment status. Please provide a valid payment status.",
      });
    }

    // --------------------------------------------------------
    // 13. Validate trial status
    // --------------------------------------------------------
    const allowedTrialStatuses = [
      "not_started",
      "active",
      "completed",
      "cancelled",
    ];

    if (
      trialStatus !== undefined &&
      !allowedTrialStatuses.includes(trialStatus)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid trial status. Please provide a valid trial status.",
      });
    }

    // --------------------------------------------------------
    // 14. Validate amount fields
    // --------------------------------------------------------
    const moneyFields = [
      { name: "amount", value: amount },
      { name: "discount", value: discount },
      { name: "tax", value: tax },
      { name: "finalAmount", value: finalAmount },
    ];

    for (const field of moneyFields) {
      if (
        field.value !== undefined &&
        (typeof field.value !== "number" ||
          field.value < 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${field.name} must be a valid amount greater than or equal to 0.`,
        });
      }
    }

    // --------------------------------------------------------
    // 15. Validate limits
    // --------------------------------------------------------
    const limitFields = [
      "rooms",
      "branches",
      "receptionists",
    ];

    if (limits !== undefined) {
      for (const field of limitFields) {
        if (
          limits[field] !== undefined &&
          (!Number.isInteger(limits[field]) ||
            limits[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} limit must be a whole number and cannot be negative.`,
          });
        }
      }
    }

    // --------------------------------------------------------
    // 16. Validate features
    // --------------------------------------------------------
    const featureFields = [
      "foodService",
      "roomService",
    ];

    if (features !== undefined) {
      for (const field of featureFields) {
        if (
          features[field] !== undefined &&
          typeof features[field] !== "boolean"
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} feature must be either enabled or disabled.`,
          });
        }
      }
    }

    // --------------------------------------------------------
    // 17. Create subscription
    // --------------------------------------------------------
    const subscription = await Subscription.create({
      hotelId,
      planId,

      billingCycle,

      startDate: parsedStartDate,
      endDate: parsedEndDate,

      status: status || "active",

      paymentStatus:
        paymentStatus || "pending",

      autoRenewal:
        typeof autoRenewal === "boolean"
          ? autoRenewal
          : false,

      trialStatus:
        trialStatus || "not_started",

      customDurationDays:
        billingCycle === "custom"
          ? customDurationDays
          : null,

      // Save purchased plan limits
      limits: {
        rooms:
          limits?.rooms ??
          plan.limits.rooms,

        branches:
          limits?.branches ??
          plan.limits.branches,

        receptionists:
          limits?.receptionists ??
          plan.limits.receptionists,
      },

      // Save purchased plan features
      features: {
        foodService:
          features?.foodService ??
          plan.features.foodService,

        roomService:
          features?.roomService ??
          plan.features.roomService,
      },

      amount: amount ?? 0,

      discount: discount ?? 0,

      tax: tax ?? 0,

      finalAmount: finalAmount ?? 0,

      paymentTransactionId:
        paymentTransactionId?.trim() || "",

      invoiceId:
        invoiceId &&
        mongoose.Types.ObjectId.isValid(invoiceId)
          ? invoiceId
          : null,
    });

    log.info(
      `Subscription created successfully: ${subscription._id} for hotel: ${hotelId}`
    );

    return res.status(201).json({
      success: true,
      message:
        "Subscription created successfully.",
      data: subscription,
    });
  } catch (error) {
    log.error(
      `Error creating subscription: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to create the subscription right now. Please try again later.",
    });
  }
};

// ============================================================
// GET ALL SUBSCRIPTIONS
// ============================================================
export const getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions =
      await Subscription.find()
        .populate("hotelId", "hotelName ownerName email phone")
        .populate("planId", "planName pricing")
        .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message:
        "Subscriptions retrieved successfully.",
      count: subscriptions.length,
      data: subscriptions,
    });
  } catch (error) {
    log.error(
      `Error fetching subscriptions: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load subscriptions right now. Please try again later.",
    });
  }
};

// ============================================================
// GET SUBSCRIPTION BY ID
// ============================================================
export const getSubscriptionById = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // 1. Validate ID
    // --------------------------------------------------------
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription ID. Please provide a valid subscription ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Find subscription
    // --------------------------------------------------------
    const subscription =
      await Subscription.findById(id)
        .populate(
          "hotelId",
          "hotelName ownerName email phone"
        )
        .populate(
          "planId",
          "planName pricing limits features"
        );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription not found. It may have been deleted or the ID may be incorrect.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Subscription details retrieved successfully.",
      data: subscription,
    });
  } catch (error) {
    log.error(
      `Error fetching subscription: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve subscription details right now. Please try again later.",
    });
  }
};

// ============================================================
// GET CURRENT SUBSCRIPTION BY HOTEL
// ============================================================
export const getHotelSubscription = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // --------------------------------------------------------
    // 1. Validate hotel ID
    // --------------------------------------------------------
    if (!hotelId || !mongoose.Types.ObjectId.isValid(hotelId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid hotel ID. Please provide a valid hotel ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Check hotel exists
    // --------------------------------------------------------
    const hotel = await Hotels.findById(hotelId);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message:
          "Hotel not found. Please provide a valid hotel ID.",
      });
    }

    // --------------------------------------------------------
    // 3. Find current subscription
    // --------------------------------------------------------
    const subscription =
      await Subscription.findOne({
        hotelId,
        status: {
          $in: [
            "trial",
            "active",
            "expiring_soon",
            "grace_period",
          ],
        },
      })
        .populate(
          "hotelId",
          "hotelName ownerName email phone"
        )
        .populate(
          "planId",
          "planName description pricing limits features"
        )
        .sort({ createdAt: -1 });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message:
          "This hotel does not currently have an active subscription.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Current hotel subscription retrieved successfully.",
      data: subscription,
    });
  } catch (error) {
    log.error(
      `Error fetching hotel subscription: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve the hotel's subscription right now. Please try again later.",
    });
  }
};


// ============================================================
// GET MY CURRENT HOTEL SUBSCRIPTION
// ============================================================
//
// Used by logged-in hotel users.
//
// IMPORTANT:
// We NEVER trust hotelId from frontend.
// hotelId comes from req.user.hotelId.
//
// ============================================================

export const getMySubscription = async (req, res) => {
    try {
        const hotelId = req.user?.hotelId;

        // --------------------------------------------------------
        // 1. Check logged-in user has a hotel
        // --------------------------------------------------------

        if (!hotelId) {
            return res.status(403).json({
                success: false,
                message:
                    "Your account is not connected to a hotel.",
            });
        }

        // --------------------------------------------------------
        // 2. Check hotel exists
        // --------------------------------------------------------

        const hotel = await Hotels.findById(hotelId)
            .select("_id hotelName status")
            .lean();

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message:
                    "Your hotel account was not found.",
            });
        }

        // --------------------------------------------------------
        // 3. Check hotel is active
        // --------------------------------------------------------

        if (hotel.status !== "active") {
            return res.status(403).json({
                success: false,
                message:
                    "Your hotel account is not active. Please contact the administrator.",
            });
        }

        // --------------------------------------------------------
        // 4. Get current subscription
        // --------------------------------------------------------

        const subscription =
            await Subscription.findOne({
                hotelId,
                status: {
                    $in: [
                        "trial",
                        "active",
                        "expiring_soon",
                        "grace_period",
                    ],
                },
            })
                .populate(
                    "planId",
                    "planName description pricing trialDays setupFee limits features validityDays autoRenewalAllowed isActive"
                )
                .sort({
                    endDate: -1,
                })
                .lean();

        // --------------------------------------------------------
        // 5. Subscription not found
        // --------------------------------------------------------

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message:
                    "Your hotel does not currently have an active subscription.",
            });
        }

        // --------------------------------------------------------
        // 6. Check subscription expiry
        // --------------------------------------------------------

        const now = new Date();

        if (
            subscription.endDate &&
            new Date(subscription.endDate) <= now
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Your subscription has expired. Please renew your plan.",
            });
        }

        // --------------------------------------------------------
        // 7. Return subscription + plan
        // --------------------------------------------------------

        log.info(
            `[getMySubscription] Loaded subscription ${subscription._id} | Hotel ID: ${hotelId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Your current subscription retrieved successfully.",
            data: subscription,
        });
    } catch (error) {
        log.error(
            `[getMySubscription] Error: ${error.message}`
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to retrieve your subscription right now. Please try again later.",
        });
    }
};

// ============================================================
// UPDATE SUBSCRIPTION
// ============================================================
export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      billingCycle,
      startDate,
      endDate,
      status,
      paymentStatus,
      autoRenewal,
      trialStatus,
      customDurationDays,
      limits,
      features,
      amount,
      discount,
      tax,
      finalAmount,
      paymentTransactionId,
      invoiceId,
    } = req.body;

    // --------------------------------------------------------
    // 1. Validate subscription ID
    // --------------------------------------------------------
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription ID. Please provide a valid subscription ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Find subscription
    // --------------------------------------------------------
    const subscription =
      await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription not found. It may have been deleted or the ID may be incorrect.",
      });
    }

    // --------------------------------------------------------
    // 3. Validate billing cycle
    // --------------------------------------------------------
    if (billingCycle !== undefined) {
      const allowedBillingCycles = [
        "monthly",
        "quarterly",
        "halfYearly",
        "yearly",
        "custom",
      ];

      if (
        !allowedBillingCycles.includes(
          billingCycle
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid billing cycle. Please select monthly, quarterly, half-yearly, yearly, or custom.",
        });
      }

      subscription.billingCycle =
        billingCycle;
    }

    // --------------------------------------------------------
    // 4. Validate custom duration
    // --------------------------------------------------------
    if (customDurationDays !== undefined) {
      if (
        customDurationDays !== null &&
        (!Number.isInteger(customDurationDays) ||
          customDurationDays < 1)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Custom subscription duration must be at least 1 day.",
        });
      }

      subscription.customDurationDays =
        customDurationDays;
    }

    // --------------------------------------------------------
    // 5. Validate dates
    // --------------------------------------------------------
    let newStartDate =
      subscription.startDate;

    let newEndDate =
      subscription.endDate;

    if (startDate !== undefined) {
      newStartDate = new Date(startDate);

      if (Number.isNaN(newStartDate.getTime())) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subscription start date.",
        });
      }
    }

    if (endDate !== undefined) {
      newEndDate = new Date(endDate);

      if (Number.isNaN(newEndDate.getTime())) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subscription end date.",
        });
      }
    }

    if (newEndDate <= newStartDate) {
      return res.status(400).json({
        success: false,
        message:
          "Subscription end date must be later than the start date.",
      });
    }

    subscription.startDate =
      newStartDate;

    subscription.endDate =
      newEndDate;

    // --------------------------------------------------------
    // 6. Validate status
    // --------------------------------------------------------
    if (status !== undefined) {
      const allowedStatuses = [
        "trial",
        "active",
        "expiring_soon",
        "expired",
        "suspended",
        "cancelled",
        "payment_failed",
        "grace_period",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid subscription status.",
        });
      }

      subscription.status = status;
    }

    // --------------------------------------------------------
    // 7. Validate payment status
    // --------------------------------------------------------
    if (paymentStatus !== undefined) {
      const allowedPaymentStatuses = [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_paid",
      ];

      if (
        !allowedPaymentStatuses.includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status.",
        });
      }

      subscription.paymentStatus =
        paymentStatus;
    }

    // --------------------------------------------------------
    // 8. Validate trial status
    // --------------------------------------------------------
    if (trialStatus !== undefined) {
      const allowedTrialStatuses = [
        "not_started",
        "active",
        "completed",
        "cancelled",
      ];

      if (
        !allowedTrialStatuses.includes(
          trialStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid trial status.",
        });
      }

      subscription.trialStatus =
        trialStatus;
    }

    // --------------------------------------------------------
    // 9. Update auto renewal
    // --------------------------------------------------------
    if (autoRenewal !== undefined) {
      if (typeof autoRenewal !== "boolean") {
        return res.status(400).json({
          success: false,
          message:
            "Auto-renewal must be either enabled or disabled.",
        });
      }

      subscription.autoRenewal =
        autoRenewal;
    }

    // --------------------------------------------------------
    // 10. Update limits
    // --------------------------------------------------------
    if (limits !== undefined) {
      const limitFields = [
        "rooms",
        "branches",
        "receptionists",
      ];

      for (const field of limitFields) {
        if (
          limits[field] !== undefined &&
          (!Number.isInteger(limits[field]) ||
            limits[field] < 0)
        ) {
          return res.status(400).json({
            success: false,
            message:
              `${field} limit must be a whole number and cannot be negative.`,
          });
        }
      }

      if (limits.rooms !== undefined) {
        subscription.limits.rooms =
          limits.rooms;
      }

      if (limits.branches !== undefined) {
        subscription.limits.branches =
          limits.branches;
      }

      if (limits.receptionists !== undefined) {
        subscription.limits.receptionists =
          limits.receptionists;
      }
    }

    // --------------------------------------------------------
    // 11. Update features
    // --------------------------------------------------------
    if (features !== undefined) {
      if (
        features.foodService !== undefined &&
        typeof features.foodService !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Food Service feature must be either enabled or disabled.",
        });
      }

      if (
        features.roomService !== undefined &&
        typeof features.roomService !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Room Service feature must be either enabled or disabled.",
        });
      }

      if (features.foodService !== undefined) {
        subscription.features.foodService =
          features.foodService;
      }

      if (features.roomService !== undefined) {
        subscription.features.roomService =
          features.roomService;
      }
    }

    // --------------------------------------------------------
    // 12. Update payment amounts
    // --------------------------------------------------------
    const moneyFields = [
      {
        name: "amount",
        value: amount,
      },
      {
        name: "discount",
        value: discount,
      },
      {
        name: "tax",
        value: tax,
      },
      {
        name: "finalAmount",
        value: finalAmount,
      },
    ];

    for (const field of moneyFields) {
      if (
        field.value !== undefined &&
        (typeof field.value !== "number" ||
          field.value < 0)
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${field.name} must be a valid amount greater than or equal to 0.`,
        });
      }
    }

    if (amount !== undefined) {
      subscription.amount = amount;
    }

    if (discount !== undefined) {
      subscription.discount = discount;
    }

    if (tax !== undefined) {
      subscription.tax = tax;
    }

    if (finalAmount !== undefined) {
      subscription.finalAmount =
        finalAmount;
    }

    // --------------------------------------------------------
    // 13. Update payment transaction
    // --------------------------------------------------------
    if (paymentTransactionId !== undefined) {
      subscription.paymentTransactionId =
        paymentTransactionId.trim();
    }

    // --------------------------------------------------------
    // 14. Update invoice ID
    // --------------------------------------------------------
    if (invoiceId !== undefined) {
      if (
        invoiceId !== null &&
        !mongoose.Types.ObjectId.isValid(
          invoiceId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid invoice ID.",
        });
      }

      subscription.invoiceId =
        invoiceId || null;
    }

    // --------------------------------------------------------
    // 15. Save changes
    // --------------------------------------------------------
    const updatedSubscription =
      await subscription.save();

    log.info(
      `Subscription updated successfully: ${updatedSubscription._id}`
    );

    return res.status(200).json({
      success: true,
      message:
        "Subscription updated successfully.",
      data: updatedSubscription,
    });
  } catch (error) {
    log.error(
      `Error updating subscription: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update the subscription right now. Please try again later.",
    });
  }
};

// ============================================================
// CANCEL SUBSCRIPTION
// ============================================================
export const cancelSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // 1. Validate subscription ID
    // --------------------------------------------------------
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid subscription ID. Please provide a valid subscription ID.",
      });
    }

    // --------------------------------------------------------
    // 2. Find subscription
    // --------------------------------------------------------
    const subscription =
      await Subscription.findById(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message:
          "Subscription not found. It may have already been removed.",
      });
    }

    // --------------------------------------------------------
    // 3. Check already cancelled
    // --------------------------------------------------------
    if (subscription.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message:
          "This subscription has already been cancelled.",
      });
    }

    // --------------------------------------------------------
    // 4. Cancel subscription
    // --------------------------------------------------------
    subscription.status = "cancelled";
    subscription.autoRenewal = false;

    await subscription.save();

    log.info(
      `Subscription cancelled successfully: ${id}`
    );

    return res.status(200).json({
      success: true,
      message:
        "Subscription cancelled successfully.",
      data: subscription,
    });
  } catch (error) {
    log.error(
      `Error cancelling subscription: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to cancel the subscription right now. Please try again later.",
    });
  }
};