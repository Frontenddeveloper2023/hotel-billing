import crypto from "crypto";
import mongoose from "mongoose";
import SaasHotelRegistration from "../models/saasHotelRegistration.js";
import Plans from "../models/plans.js";
import Hotels from "../models/hotels.js";
import Subscription from "../models/subscription.js";
import SaasNotification from "../models/saasNotification.js";
import User from "../models/users.js";
import {
  createCashfreeOrder,
  fetchCashfreeOrder,
  fetchCashfreeOrderPayments,
  createCashfreePaymentLink,
  fetchCashfreePaymentLink,
  verifyCashfreeWebhook,
  getCashfreeConfig,
} from "../util/cashfree.js";
import { verifyRenewalToken } from "../util/renewalToken.js";
import { log } from "../util/logger.js";

// Helper: Calculate end date for subscription cycle
export const calculateEndDate = (startDate, billingCycle, customDays) => {
  const date = new Date(startDate);
  // If explicitly custom billing cycle or trial with custom days
  if ((billingCycle === "custom" || billingCycle === "trial") && customDays && Number(customDays) > 0) {
    date.setDate(date.getDate() + Number(customDays));
    return date;
  }
  let days = 30;
  switch (billingCycle) {
    case "quarterly":
      days = 90;
      break;
    case "halfYearly":
      days = 180;
      break;
    case "yearly":
      days = 365;
      break;
    case "monthly":
      days = 30;
      break;
    default:
      days = (customDays && Number(customDays) > 0) ? Number(customDays) : 30;
      break;
  }
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Prorated Upgrade Calculation Helper:
 * If customer has an existing subscription and wants to upgrade to a new subscription:
 * 1. Current plan daily price = Current plan price / Current plan total validity days
 * 2. Unused plan credit = Current plan daily price * Remaining unused days
 * 3. Final upgrade amount = New plan price - Unused plan credit (minimum 0)
 *
 * Rules:
 * - Uses the actual current plan price and original validity duration
 * - Uses integer paise for currency arithmetic to avoid floating-point errors
 * - Rounds unused credit to 2 decimal places (standard half-up rounding)
 * - Rounds payable amount to 2 decimal places
 * - Handles expired subscriptions and 0 remaining days with 0 credit
 * - Does not produce negative payable amounts or negative remaining days
 * - Caps credit at newPlanPrice to prevent negative payable amount
 */
export const calculateUpgradeProration = ({
  currentSub,
  newPlanPrice = 0,
  currentPlanPrice: explicitCurrentPrice,
  totalDays: explicitTotalDays,
  remainingDays: explicitRemainingDays,
  asOfDate,
}) => {
  const price = Math.max(0, Number(newPlanPrice) || 0);
  const newPricePaise = Math.round(price * 100);

  // If no subscription and no explicit current price, no credit
  if (!currentSub && explicitCurrentPrice === undefined) {
    return {
      unusedCredit: 0,
      rawCredit: 0,
      excessCredit: 0,
      payableAmount: Number((newPricePaise / 100).toFixed(2)),
      remainingDays: 0,
      totalDays: 30,
      perDayCost: 0,
      currentPlanName: null,
      currentPlanPrice: 0,
    };
  }

  // 1. Determine actual Current Plan Price (from planId pricing, subscription base amount, or explicit)
  let currentPlanPrice = 0;
  if (explicitCurrentPrice !== undefined) {
    currentPlanPrice = Math.max(0, Number(explicitCurrentPrice) || 0);
  } else if (currentSub) {
    const cycle = currentSub.billingCycle || "monthly";
    if (currentSub.planId && typeof currentSub.planId === "object" && currentSub.planId.pricing) {
      currentPlanPrice = Number(currentSub.planId.pricing[cycle] ?? currentSub.planId.price ?? 0);
    }
    if (!currentPlanPrice && currentSub.amount !== undefined && currentSub.amount !== null) {
      currentPlanPrice = Number(currentSub.amount || 0);
    }
    if (!currentPlanPrice && currentSub.finalAmount !== undefined && currentSub.finalAmount !== null) {
      currentPlanPrice = Number(currentSub.finalAmount || 0);
    }
  }
  currentPlanPrice = Math.max(0, currentPlanPrice);
  const currentPricePaise = Math.round(currentPlanPrice * 100);

  // 2. Determine original Plan Validity Days
  let totalDays = 30;
  if (explicitTotalDays !== undefined) {
    totalDays = Math.max(1, Math.round(Number(explicitTotalDays) || 30));
  } else if (currentSub?.customDurationDays) {
    totalDays = Math.max(1, Math.round(Number(currentSub.customDurationDays)));
  } else if (currentSub?.billingCycle === "quarterly") {
    totalDays = 90;
  } else if (currentSub?.billingCycle === "halfYearly") {
    totalDays = 180;
  } else if (currentSub?.billingCycle === "yearly") {
    totalDays = 365;
  } else if (currentSub?.planId?.validityDays) {
    totalDays = Math.max(1, Math.round(Number(currentSub.planId.validityDays)));
  } else if (currentSub?.startDate && currentSub?.endDate) {
    const start = new Date(currentSub.startDate);
    const end = new Date(currentSub.endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
      totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    } else {
      totalDays = 30;
    }
  } else {
    totalDays = 30;
  }

  // 3. Determine Remaining Unused Days
  let remainingDays = 0;
  if (explicitRemainingDays !== undefined) {
    remainingDays = Math.max(0, Math.min(totalDays, Math.round(Number(explicitRemainingDays) || 0)));
  } else if (currentSub) {
    const isInactiveStatus =
      currentSub.status === "expired" ||
      currentSub.status === "cancelled" ||
      currentSub.status === "suspended";

    if (isInactiveStatus || !currentSub.endDate) {
      remainingDays = 0;
    } else {
      const now = asOfDate ? new Date(asOfDate) : new Date();
      const endDate = new Date(currentSub.endDate);

      if (isNaN(endDate.getTime())) {
        remainingDays = 0;
      } else {
        const remainingMs = endDate.getTime() - now.getTime();
        if (remainingMs <= 0) {
          remainingDays = 0;
        } else {
          const calcDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
          remainingDays = Math.max(0, Math.min(totalDays, calcDays));
        }
      }
    }
  }

  const currentPlanName =
    (typeof currentSub?.planId === "object" ? currentSub?.planId?.planName : null) ||
    currentSub?.planName ||
    "Current Plan";

  // Per day cost in paise and rounded for display
  const perDayPaise = totalDays > 0 ? currentPricePaise / totalDays : 0;
  const perDayCost = Number((perDayPaise / 100).toFixed(2));

  // If expired or 0 remaining days or 0 plan price -> no credit
  if (remainingDays <= 0 || currentPricePaise <= 0) {
    return {
      unusedCredit: 0,
      rawCredit: 0,
      excessCredit: 0,
      payableAmount: Number((newPricePaise / 100).toFixed(2)),
      remainingDays: 0,
      totalDays,
      perDayCost,
      currentPlanName,
      currentPlanPrice: Number((currentPricePaise / 100).toFixed(2)),
    };
  }

  // Raw credit in paise with high precision integer division: (currentPricePaise * remainingDays) / totalDays
  const rawCreditPaise = Math.round((currentPricePaise * remainingDays) / totalDays);
  const rawCredit = Number((rawCreditPaise / 100).toFixed(2));

  // Credit applied to this upgrade is capped at the new plan's price
  const appliedCreditPaise = Math.min(newPricePaise, rawCreditPaise);
  const unusedCredit = Number((appliedCreditPaise / 100).toFixed(2));

  // Excess credit if credit > new plan price
  const excessCreditPaise = Math.max(0, rawCreditPaise - newPricePaise);
  const excessCredit = Number((excessCreditPaise / 100).toFixed(2));

  // Final amount to pay = New plan price - unused credit (minimum 0)
  const payablePaise = Math.max(0, newPricePaise - appliedCreditPaise);
  const payableAmount = Number((payablePaise / 100).toFixed(2));

  return {
    unusedCredit,
    rawCredit,
    excessCredit,
    payableAmount,
    remainingDays,
    totalDays,
    perDayCost,
    currentPlanName,
    currentPlanPrice: Number((currentPricePaise / 100).toFixed(2)),
  };
};

// ============================================================
// 1. REGISTRATION CHECKOUT: CREATE CASHFREE ORDER
// ============================================================
// Public / Hotel Register Flow
// POST /payments/registration/create-order
// ============================================================
export const createRegistrationOrder = async (req, res) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId || !mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.status(400).json({
        success: false,
        message: "Valid registration ID is required.",
      });
    }

    const registration = await SaasHotelRegistration.findById(registrationId).populate("planId");

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Hotel registration record not found.",
      });
    }

    if (registration.paymentStatus === "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment for this hotel registration has already been completed.",
      });
    }

    const plan = registration.planId;
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Selected plan details could not be found.",
      });
    }

    const cycle = registration.billingCycle || "monthly";
    const basePrice = plan.pricing?.[cycle] ?? plan.price ?? 0;

    // Apply 18% GST only if tax is enabled
    const taxRate = registration.taxEnabled ? 0.18 : 0;
    const taxAmount = Number((basePrice * taxRate).toFixed(2));
    const finalAmount = Number((basePrice + taxAmount).toFixed(2));

    if (finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan price amount for online payment.",
      });
    }

    // Unique order ID (prefix REG_)
    const orderId = `REG_${registration._id.toString().slice(-6)}_${Date.now()}`;

    const clientOrigin =
      req.get("origin") ||
      (req.get("referer") ? new URL(req.get("referer")).origin : null) ||
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      process.env.BACKEND_URL ||
      "";

    let checkoutBase = getFrontendUrl() || clientOrigin;
    if (checkoutBase.endsWith("/hotel-billing-system")) {
      checkoutBase = checkoutBase.replace(/\/+$/, "");
    } else if (checkoutBase) {
      checkoutBase = `${checkoutBase.replace(/\/+$/, "")}/hotel-billing-system`;
    }

    const returnUrl =
      process.env.CASHFREE_RETURN_URL ||
      (checkoutBase ? `${checkoutBase}/saas-user/checkout?order_id={order_id}` : undefined);

    const cashfreeOrder = await createCashfreeOrder({
      orderId,
      orderAmount: finalAmount,
      customerDetails: {
        customer_id: String(registration._id),
        customer_name: registration.ownerName || registration.hotelName,
        customer_email: registration.email,
        customer_phone: registration.phone,
      },
      returnUrl,
      orderNote: `StayLio - ${plan.planName} (${cycle}) for ${registration.hotelName}`,
    });

    // Save order ID to registration record
    registration.paymentOrderId = orderId;
    await registration.save();

    const { env } = getCashfreeConfig();

    return res.status(200).json({
      success: true,
      data: {
        orderId,
        paymentSessionId: cashfreeOrder.paymentSessionId,
        cfOrderId: cashfreeOrder.cfOrderId,
        amount: finalAmount,
        currency: "INR",
        env,
      },
    });
  } catch (error) {
    log.error(`[createRegistrationOrder] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create Cashfree payment order.",
    });
  }
};

// ============================================================
// 2. REGISTRATION CHECKOUT: VERIFY PAYMENT
// ============================================================
// Public / Hotel Register Flow
// POST /payments/registration/verify-payment
// ============================================================
export const verifyRegistrationPayment = async (req, res) => {
  try {
    const { registrationId, orderId } = req.body;

    if (!registrationId || !mongoose.Types.ObjectId.isValid(registrationId)) {
      return res.status(400).json({
        success: false,
        message: "Valid registration ID is required.",
      });
    }

    const registration = await SaasHotelRegistration.findById(registrationId).populate("planId");

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Hotel registration record not found.",
      });
    }

    // Idempotent return if already paid
    if (registration.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        message: "Payment has already been verified and recorded.",
        data: {
          paymentStatus: "paid",
          transactionId: registration.paymentTransactionId,
        },
      });
    }

    const targetOrderId = orderId || registration.paymentOrderId;
    if (!targetOrderId) {
      return res.status(400).json({
        success: false,
        message: "Cashfree order ID is missing.",
      });
    }

    // 1. Double-check order status with Cashfree API server-to-server
    const orderDetails = await fetchCashfreeOrder(targetOrderId);

    if (orderDetails.order_status !== "PAID") {
      return res.status(400).json({
        success: false,
        message: `Payment not completed yet. Current status: ${orderDetails.order_status}`,
        orderStatus: orderDetails.order_status,
      });
    }

    // 2. Fetch specific transaction ID from payments
    const payments = await fetchCashfreeOrderPayments(targetOrderId);
    const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS") || payments[0];
    const transactionId = successfulPayment?.cf_payment_id
      ? String(successfulPayment.cf_payment_id)
      : `CF-${targetOrderId}`;

    // 3. Mark Registration as paid
    registration.paymentStatus = "paid";
    registration.paymentTransactionId = transactionId;
    registration.paymentOrderId = targetOrderId;
    await registration.save();

    // 4. Send Admin In-App Notification
    try {
      await SaasNotification.create({
        type: "registration_submitted",
        title: "New Hotel Registration (Payment Received)",
        message: `${registration.ownerName} registered ${registration.hotelName}. Subscription payment of ₹${orderDetails.order_amount} was successfully paid via Cashfree (${transactionId}) and is waiting for review.`,
        registrationId: registration._id,
        isRead: false,
        metadata: {
          hotelName: registration.hotelName,
          ownerName: registration.ownerName,
          email: registration.email,
          phone: registration.phone,
          planId: registration.planId?._id,
          planName: registration.planId?.planName,
          billingCycle: registration.billingCycle,
          amount: orderDetails.order_amount,
          paymentTransactionId: transactionId,
          orderId: targetOrderId,
        },
      });
    } catch (notifErr) {
      log.error(`[verifyRegistrationPayment] Notification error: ${notifErr.message}`);
    }

    log.info(
      `[verifyRegistrationPayment] Successfully verified payment for ${registration.hotelName}. CF Payment ID: ${transactionId}`
    );

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully!",
      data: {
        paymentStatus: "paid",
        paymentTransactionId: transactionId,
        orderId: targetOrderId,
      },
    });
  } catch (error) {
    log.error(`[verifyRegistrationPayment] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify Cashfree payment.",
    });
  }
};

// ============================================================
// 2.5. SUBSCRIPTION UPGRADE: PREVIEW PRORATION
// ============================================================
// Authenticated Hotel User or Public Token
// GET /payments/subscription-upgrade/preview?planId=...&billingCycle=...
// ============================================================
export const getSubscriptionUpgradePreview = async (req, res) => {
  try {
    const { planId, billingCycle = "monthly" } = req.query;
    const hotelId = req.user?.hotelId;

    if (!hotelId) {
      return res.status(403).json({
        success: false,
        message: "Hotel context missing from authenticated session.",
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "planId is required for upgrade preview.",
      });
    }

    const [hotel, plan] = await Promise.all([
      Hotels.findById(hotelId),
      Plans.findById(planId),
    ]);

    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Plan not found or inactive." });
    }

    const price = Math.max(0, Number(plan.pricing?.[billingCycle] ?? plan.price ?? 0));

    // Fetch current active subscription or latest subscription for this hotel
    const now = new Date();
    let currentSub = await Subscription.findOne({
      hotelId,
      status: { $in: ["active", "expiring_soon", "trial", "grace_period"] },
      endDate: { $gt: now },
    })
      .populate("planId", "planName pricing validityDays trialDays")
      .sort({ createdAt: -1, endDate: -1 });

    if (!currentSub) {
      currentSub = await Subscription.findOne({
        hotelId,
      })
        .populate("planId", "planName pricing validityDays trialDays")
        .sort({ createdAt: -1, endDate: -1 });
    }

    const proration = calculateUpgradeProration({ currentSub, newPlanPrice: price });

    // Proration credit applies to all plan changes based on remaining unused days
    const effectiveUnusedCredit = proration.unusedCredit;
    const effectivePayableAmount = proration.payableAmount;
    const effectiveExcessCredit = proration.excessCredit;
    const isFreeSwitch = effectivePayableAmount === 0;
    const isHigherTierUpgrade = price > proration.currentPlanPrice;
    const isLowerTierSwitch = proration.currentPlanPrice > 0 && price < proration.currentPlanPrice;

    const startDate = new Date();
    const endDate = calculateEndDate(startDate, billingCycle, plan.validityDays);

    return res.status(200).json({
      success: true,
      data: {
        planId: plan._id,
        planName: plan.planName,
        billingCycle,
        originalPrice: price,
        newPlanPrice: price,
        unusedCredit: effectiveUnusedCredit,
        rawCredit: proration.rawCredit,
        excessCredit: effectiveExcessCredit,
        payableAmount: effectivePayableAmount,
        remainingDays: proration.remainingDays,
        totalDays: proration.totalDays,
        perDayCost: proration.perDayCost,
        currentPlanName: proration.currentPlanName,
        currentPlanPrice: proration.currentPlanPrice,
        isFreeSwitch,
        isLowerTierSwitch,
        isHigherTierUpgrade,
        newPlanStartDate: startDate.toISOString(),
        newPlanEndDate: endDate.toISOString(),
        newPlanValidityDays: Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        currency: "INR",
      },
    });
  } catch (error) {
    log.error(`[getSubscriptionUpgradePreview] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to calculate upgrade preview.",
    });
  }
};

// ============================================================
// 2b. SUBSCRIPTION PLAN SWITCH: DIRECT SWITCH (WHEN PAYABLE IS 0)
// ============================================================
// Authenticated Hotel User
// POST /payments/subscription-upgrade/direct-switch
// ============================================================
export const switchSubscriptionPlanDirect = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const hotelId = req.user?.hotelId;

    if (!hotelId) {
      return res.status(403).json({
        success: false,
        message: "Hotel context missing from authenticated session.",
      });
    }

    if (!planId || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: "planId and billingCycle are required.",
      });
    }

    const [hotel, plan] = await Promise.all([
      Hotels.findById(hotelId),
      Plans.findById(planId),
    ]);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel record not found.",
      });
    }

    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Selected plan is inactive or not found.",
      });
    }

    const newPlanPrice = Math.max(0, Number(plan.pricing?.[billingCycle] ?? plan.price ?? 0));

    // Fetch current active subscription
    const now = new Date();
    const currentSub = await Subscription.findOne({
      hotelId,
      status: { $in: ["active", "expiring_soon", "trial", "grace_period"] },
      endDate: { $gt: now },
    })
      .populate("planId", "planName pricing validityDays trialDays")
      .sort({ createdAt: -1, endDate: -1 });

    const proration = calculateUpgradeProration({ currentSub, newPlanPrice });

    // Security check: Must be fully covered (payableAmount must be 0)
    if (proration.payableAmount > 0) {
      return res.status(400).json({
        success: false,
        message: `Payment of ₹${proration.payableAmount} is required for this plan change. Please complete payment via Cashfree.`,
        payableAmount: proration.payableAmount,
      });
    }

    const startDate = new Date();
    const endDate = calculateEndDate(startDate, billingCycle, plan.validityDays);

    // Cancel existing active subscriptions
    await Subscription.updateMany(
      {
        hotelId: new mongoose.Types.ObjectId(hotelId),
        status: { $in: ["active", "trial", "expiring_soon", "grace_period"] },
      },
      {
        $set: {
          status: "cancelled",
          autoRenewal: false,
          cancellationReason: "Replaced by plan switch",
        },
      }
    );

    const orderId = `FREE_SWITCH_${hotel._id.toString().slice(-6)}_${Date.now()}`;
    const transactionId = `CREDIT_${Date.now()}`;

    // Create fresh active subscription with 0 finalAmount
    const newSubscription = await Subscription.create({
      hotelId,
      planId: plan._id,
      billingCycle,
      startDate,
      endDate,
      status: "active",
      paymentStatus: "paid",
      paymentTransactionId: transactionId,
      paymentOrderId: orderId,
      autoRenewal: false,
      trialStatus: "not_started",
      limits: {
        rooms: plan.limits?.rooms || 50,
        branches: plan.limits?.branches || 5,
        receptionists: plan.limits?.receptionists || 10,
      },
      features: {
        foodService: plan.features?.foodService ?? true,
        roomService: plan.features?.roomService ?? true,
      },
      amount: newPlanPrice,
      discount: proration.unusedCredit,
      tax: 0,
      finalAmount: 0,
    });

    if (hotel.status !== "active") {
      hotel.status = "active";
      await hotel.save();
    }

    // Notify SaaS Admin
    try {
      await SaasNotification.create({
        type: "plan_switched",
        title: "Hotel Plan Switched with Unused Credit",
        message: `${hotel.hotelName} switched to the "${plan.planName}" plan (${billingCycle}) fully covered by ₹${proration.unusedCredit} unused credit from their previous plan. Payment: ₹0.`,
        hotelId: hotel._id,
        isRead: false,
        metadata: {
          hotelName: hotel.hotelName,
          ownerName: hotel.ownerName,
          email: hotel.email,
          phone: hotel.phone,
          planName: plan.planName,
          billingCycle,
          amount: 0,
          discount: proration.unusedCredit,
          transactionId,
          orderId,
          startDate,
          endDate,
        },
      });
    } catch (notifErr) {
      log.error(`[switchSubscriptionPlanDirect] Notification error: ${notifErr.message}`);
    }

    return res.status(200).json({
      success: true,
      message: `Your plan has been successfully switched to ${plan.planName}!`,
      data: newSubscription,
    });
  } catch (error) {
    log.error(`[switchSubscriptionPlanDirect] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to switch plan.",
    });
  }
};

// ============================================================
// 3. SUBSCRIPTION UPGRADE: CREATE CASHFREE ORDER
// ============================================================
// Authenticated Hotel User
// POST /payments/subscription-upgrade/create-order
// ============================================================
export const createSubscriptionUpgradeOrder = async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;
    const hotelId = req.user?.hotelId;

    if (!hotelId) {
      return res.status(403).json({
        success: false,
        message: "Hotel context missing from authenticated session.",
      });
    }

    if (!planId || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: "planId and billingCycle are required.",
      });
    }

    const [hotel, plan] = await Promise.all([
      Hotels.findById(hotelId),
      Plans.findById(planId),
    ]);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel record not found.",
      });
    }

    if (!plan || !plan.isActive) {
      return res.status(404).json({
        success: false,
        message: "Selected plan is inactive or not found.",
      });
    }

    const originalPrice = Math.max(0, Number(plan.pricing?.[billingCycle] ?? 0));
    if (originalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: `No price configured for ${billingCycle} billing cycle on plan "${plan.planName}".`,
      });
    }

    // Check if there are remaining days on current active subscription for proration discount
    const now = new Date();
    const currentSub = await Subscription.findOne({
      hotelId,
      status: { $in: ["active", "expiring_soon", "trial", "grace_period"] },
      endDate: { $gt: now },
    })
      .populate("planId", "planName pricing validityDays trialDays")
      .sort({ createdAt: -1, endDate: -1 });

    const proration = calculateUpgradeProration({ currentSub, newPlanPrice: originalPrice });

    const finalChargeAmount = proration.payableAmount;
    const appliedDiscount = proration.unusedCredit;

    if (finalChargeAmount <= 0) {
      return res.status(400).json({
        success: false,
        isFreeSwitch: true,
        message: "This plan switch is fully covered by your unused credit. Please confirm without payment.",
      });
    }

    const orderId = `UPG_${hotel._id.toString().slice(-6)}_${Date.now()}`;

    const clientOrigin =
      req.get("origin") ||
      (req.get("referer") ? new URL(req.get("referer")).origin : null) ||
      process.env.CLIENT_URL ||
      process.env.FRONTEND_URL ||
      process.env.BACKEND_URL ||
      "";

    let subscriptionBase = getFrontendUrl() || clientOrigin;
    if (subscriptionBase.endsWith("/hotel-billing-system")) {
      subscriptionBase = subscriptionBase.replace(/\/+$/, "");
    } else if (subscriptionBase) {
      subscriptionBase = `${subscriptionBase.replace(/\/+$/, "")}/hotel-billing-system`;
    }

    const returnUrl =
      process.env.CASHFREE_RETURN_URL ||
      (subscriptionBase ? `${subscriptionBase}/plan-upgrade?payment=success&order_id={order_id}` : undefined);

    const cashfreeOrder = await createCashfreeOrder({
      orderId,
      orderAmount: finalChargeAmount,
      customerDetails: {
        customer_id: String(hotel._id),
        customer_name: hotel.ownerName || hotel.hotelName,
        customer_email: hotel.email,
        customer_phone: hotel.phone,
      },
      returnUrl,
      orderNote: `Plan change to ${plan.planName} (${billingCycle}) for ${hotel.hotelName}${
        appliedDiscount > 0 ? ` [₹${appliedDiscount} credit applied for ${proration.remainingDays} remaining days]` : ""
      }`,
    });

    const { env } = getCashfreeConfig();

    return res.status(200).json({
      success: true,
      data: {
        orderId,
        paymentSessionId: cashfreeOrder.paymentSessionId,
        cfOrderId: cashfreeOrder.cfOrderId,
        originalPrice,
        discount: appliedDiscount,
        amount: finalChargeAmount,
        remainingDays: proration.remainingDays,
        currency: "INR",
        env,
      },
    });
  } catch (error) {
    log.error(`[createSubscriptionUpgradeOrder] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create subscription upgrade payment order.",
    });
  }
};

// ============================================================
// 4. SUBSCRIPTION UPGRADE: VERIFY PAYMENT & ACTIVATE
// ============================================================
// Authenticated Hotel User
// POST /payments/subscription-upgrade/verify-payment
// ============================================================
export const verifySubscriptionUpgradePayment = async (req, res) => {
  try {
    const { orderId, planId, billingCycle } = req.body;
    const hotelId = req.user?.hotelId;

    if (!hotelId || !orderId || !planId || !billingCycle) {
      return res.status(400).json({
        success: false,
        message: "orderId, planId, and billingCycle are required.",
      });
    }

    // Idempotency: Prevent duplicate upgrade processing for the same order
    const existingSubscription = await Subscription.findOne({ paymentOrderId: orderId });
    if (existingSubscription) {
      return res.status(200).json({
        success: true,
        message: "Payment already verified and subscription activated.",
        data: existingSubscription,
      });
    }

    // 1. Server-to-server check with Cashfree
    const orderDetails = await fetchCashfreeOrder(orderId);

    if (orderDetails.order_status !== "PAID") {
      return res.status(400).json({
        success: false,
        message: `Payment has not been completed. Status: ${orderDetails.order_status}`,
        orderStatus: orderDetails.order_status,
      });
    }

    // 2. Fetch specific transaction ID
    const payments = await fetchCashfreeOrderPayments(orderId);
    const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS") || payments[0];
    const transactionId = successfulPayment?.cf_payment_id
      ? String(successfulPayment.cf_payment_id)
      : `CF-${orderId}`;

    const [hotel, plan] = await Promise.all([
      Hotels.findById(hotelId),
      Plans.findById(planId),
    ]);

    if (!hotel || !plan) {
      return res.status(404).json({
        success: false,
        message: "Hotel or plan record not found.",
      });
    }

    // 3. Calculate start & end dates
    const startDate = new Date();
    const endDate = calculateEndDate(startDate, billingCycle, plan.validityDays);

    // 4. Cancel any existing active subscriptions for this hotel
    await Subscription.updateMany(
      {
        hotelId: new mongoose.Types.ObjectId(hotelId),
        status: { $in: ["active", "trial", "expiring_soon", "grace_period"] },
      },
      {
        $set: {
          status: "cancelled",
          autoRenewal: false,
          cancellationReason: "Replaced by upgraded plan",
        },
      }
    );

    // 5. Create fresh active subscription
    const basePlanPrice = plan.pricing?.[billingCycle] ?? plan.price ?? orderDetails.order_amount;
    const upgradeDiscount = Math.max(0, Number((basePlanPrice - orderDetails.order_amount).toFixed(2)));

    const newSubscription = await Subscription.create({
      hotelId,
      planId: plan._id,
      billingCycle,
      startDate,
      endDate,
      status: "active",
      paymentStatus: "paid",
      paymentTransactionId: transactionId,
      paymentOrderId: orderId,
      autoRenewal: false,
      trialStatus: "not_started",
      limits: {
        rooms: plan.limits?.rooms || 50,
        branches: plan.limits?.branches || 5,
        receptionists: plan.limits?.receptionists || 10,
      },
      features: {
        foodService: plan.features?.foodService ?? true,
        roomService: plan.features?.roomService ?? true,
      },
      amount: basePlanPrice,
      discount: upgradeDiscount,
      tax: 0,
      finalAmount: orderDetails.order_amount,
    });

    // 6. Ensure hotel status is active
    if (hotel.status !== "active") {
      hotel.status = "active";
      await hotel.save();
    }

    // 7. Notify SaaS Admin
    try {
      await SaasNotification.create({
        type: "payment_verified",
        title: "Hotel Plan Upgraded",
        message: `${hotel.hotelName} successfully paid ₹${orderDetails.order_amount} via Cashfree (${transactionId}) and upgraded to the "${plan.planName}" plan (${billingCycle}). Active immediately.`,
        hotelId: hotel._id,
        isRead: false,
        metadata: {
          hotelName: hotel.hotelName,
          ownerName: hotel.ownerName,
          email: hotel.email,
          phone: hotel.phone,
          planName: plan.planName,
          billingCycle,
          amount: orderDetails.order_amount,
          transactionId,
          orderId,
          startDate,
          endDate,
        },
      });
    } catch (notifErr) {
      log.error(`[verifySubscriptionUpgradePayment] Notification error: ${notifErr.message}`);
    }

    log.info(
      `[verifySubscriptionUpgradePayment] Hotel ${hotel.hotelName} successfully upgraded to ${plan.planName}. Subscription ${newSubscription._id} active.`
    );

    return res.status(200).json({
      success: true,
      message: `Plan upgraded successfully to ${plan.planName}!`,
      data: newSubscription,
    });
  } catch (error) {
    log.error(`[verifySubscriptionUpgradePayment] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to verify upgrade payment.",
    });
  }
};

// Helper: Get frontend URL dynamically based on .env and request host
export const getFrontendUrl = (req) => {
  // 1. Always prioritize URL configured safely in backend .env (CLIENT_URL or FRONTEND_URL)
  const envFrontend = (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    process.env.VITE_CLIENT_URL ||
    process.env.VITE_FRONTEND_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  if (envFrontend) {
    return envFrontend.replace(/\/hotel-billing-system\/hotel-billing-system/g, "/hotel-billing-system");
  }

  // 2. Fallback: derive from backend base URL configured in .env
  const base = (
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    process.env.SERVER_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  if (base) {
    const fallback = `${base}/hotel-billing-system`;
    return fallback.replace(/\/hotel-billing-system\/hotel-billing-system/g, "/hotel-billing-system");
  }

  return "https://jayam.co.in/hotel-billing-system";
};

/**
 * Shared Activation Logic for 1-click renewal payment success
 */
export const processRenewalActivation = async ({
  linkId,
  transactionId,
  amount,
  notes = {},
}) => {
  try {
    // 1. Idempotency check: if already recorded as paid, return existing
    const existingSub = await Subscription.findOne({
      paymentOrderId: linkId,
      paymentStatus: "paid",
    });

    if (existingSub) {
      log.info(`[processRenewalActivation] Order ${linkId} already processed.`);
      return existingSub;
    }

    let hotelId = notes?.hotelId;
    let planId = notes?.planId;
    let billingCycle = notes?.billingCycle || "monthly";

    // Fallback: If notes are missing, retrieve from Cashfree Link details
    if (!hotelId || !planId) {
      const linkDetails = await fetchCashfreePaymentLink(linkId);
      if (linkDetails?.link_notes) {
        hotelId = linkDetails.link_notes.hotelId || hotelId;
        planId = linkDetails.link_notes.planId || planId;
        billingCycle = linkDetails.link_notes.billingCycle || billingCycle;
      }
    }

    if (!hotelId || !planId) {
      log.error(`[processRenewalActivation] Missing hotelId/planId for renewal ${linkId}`);
      return null;
    }

    const [hotel, plan] = await Promise.all([
      Hotels.findById(hotelId),
      Plans.findById(planId),
    ]);

    if (!hotel || !plan) {
      log.error(`[processRenewalActivation] Hotel or Plan not found for renewal ${linkId}`);
      return null;
    }

    // 2. Calculate Start & End Date
    // 2. Calculate Start & End Date
    // If upgrading to a different plan or if early upgrade discount was applied, start immediately
    const now = new Date();
    const currentSub = await Subscription.findOne({
      hotelId,
      status: { $in: ["active", "expiring_soon", "trial", "grace_period"] },
      endDate: { $gt: now },
    }).sort({ createdAt: -1, endDate: -1 });

    const isDifferentPlan = currentSub && String(currentSub.planId) !== String(plan._id);
    const hasProrationDiscount = Number(notes?.discount || 0) > 0;

    // Upgrades start immediately from today so new features/limits take effect instantly
    const startDate = (isDifferentPlan || hasProrationDiscount || !currentSub)
      ? new Date()
      : new Date(currentSub.endDate);

    const endDate = calculateEndDate(startDate, billingCycle);

    // 3. Mark older subscriptions as cancelled so the upgraded/renewed one is primary
    await Subscription.updateMany(
      {
        hotelId: new mongoose.Types.ObjectId(hotelId),
        status: { $in: ["active", "trial", "expiring_soon", "grace_period"] },
      },
      {
        $set: {
          status: "cancelled",
          autoRenewal: false,
          cancellationReason: "Replaced by renewed/upgraded plan",
        },
      }
    );

    // 4. Create active renewed/upgraded subscription
    const finalPrice = amount || (plan.pricing?.[billingCycle] ?? plan.price ?? 0);
    const recordedDiscount = Number(notes?.discount || 0);
    const recordedOriginalPrice = Number(notes?.originalPrice || finalPrice);

    const newSubscription = await Subscription.create({
      hotelId,
      planId: plan._id,
      billingCycle,
      startDate,
      endDate,
      status: "active",
      paymentStatus: "paid",
      paymentTransactionId: String(transactionId || `CF-${linkId}`),
      paymentOrderId: linkId,
      autoRenewal: false,
      trialStatus: "not_started",
      limits: {
        rooms: plan.limits?.rooms || 50,
        branches: plan.limits?.branches || 5,
        receptionists: plan.limits?.receptionists || 10,
      },
      features: {
        foodService: plan.features?.foodService ?? true,
        roomService: plan.features?.roomService ?? true,
      },
      amount: recordedOriginalPrice,
      discount: recordedDiscount,
      tax: 0,
      finalAmount: finalPrice,
    });

    // 5. Ensure hotel status is active
    if (hotel.status !== "active") {
      hotel.status = "active";
      await hotel.save();
    }

    // 6. Notify SaaS Admin
    try {
      await SaasNotification.create({
        type: "payment_verified",
        title: "Subscription Renewed via Email Link",
        message: `${hotel.hotelName} successfully renewed their ${plan.planName} plan (${billingCycle}) via 1-click email link.`,
        hotelId,
        isRead: false,
        metadata: {
          hotelName: hotel.hotelName,
          planName: plan.planName,
          billingCycle,
          amount: newSubscription.finalAmount,
          orderId: linkId,
          transactionId: String(transactionId || `CF-${linkId}`),
          source: "email_quick_renew",
        },
      });
    } catch (notifErr) {
      log.error(`[processRenewalActivation] Notification error: ${notifErr.message}`);
    }

    log.info(
      `[processRenewalActivation] Hotel ${hotel.hotelName} plan renewed to ${plan.planName} until ${endDate.toISOString()}`
    );
    return newSubscription;
  } catch (err) {
    log.error(`[processRenewalActivation] Error: ${err.message}`);
    return null;
  }
};

// ============================================================
// 3. 1-CLICK EMAIL RENEWAL REDIRECT (Public / Email Click Flow)
// ============================================================
// GET /payments/quick-renew?token=...
// ============================================================
export const handleQuickRenewalRedirect = async (req, res) => {
  let fallbackHotelId = "";
  try {
    const { token } = req.query;
    const frontendBaseUrl = getFrontendUrl(req);

    if (!token) {
      return res.redirect(`${frontendBaseUrl}/plan-upgrade`);
    }

    const verification = verifyRenewalToken(token);
    if (!verification.valid) {
      return res.redirect(`${frontendBaseUrl}/plan-upgrade`);
    }

    const { hotelId, planId, billingCycle } = verification;
    fallbackHotelId = hotelId;
    let [hotel, plan] = await Promise.all([
      Hotels.findById(hotelId),
      Plans.findById(planId),
    ]);

    if (!hotel) {
      log.error(`[handleQuickRenewalRedirect] Hotel not found: ${hotelId}`);
      return res.redirect(`${frontendBaseUrl}/plan-upgrade`);
    }

    // If plan not found by ID, fall back to hotel's latest subscription plan or default plan
    if (!plan) {
      const latestSub = await Subscription.findOne({ hotelId }).sort({ createdAt: -1 });
      if (latestSub?.planId) {
        plan = await Plans.findById(latestSub.planId);
      }
      if (!plan) {
        plan = await Plans.findOne().sort({ price: 1 });
      }
    }

    if (!plan) {
      log.error(`[handleQuickRenewalRedirect] Plan not found for renewal: ${planId}`);
      return res.redirect(`${frontendBaseUrl}/plan-upgrade?hotelId=${hotel._id}`);
    }

    // Calculate renewal price for the hotel's current plan
    let cycle = billingCycle || "monthly";
    if (cycle === "trial" || cycle === "custom") {
      cycle = "monthly";
    }

    let basePrice = plan.pricing?.[cycle] ?? plan.pricing?.monthly ?? plan.price ?? 0;
    if (basePrice <= 0) {
      basePrice = 999;
    }

    // Check if hotel has an active subscription with remaining days to apply credit
    const now = new Date();
    const currentSub = await Subscription.findOne({
      hotelId: hotel._id,
      status: { $in: ["active", "expiring_soon", "trial", "grace_period"] },
      endDate: { $gt: now },
    })
      .populate("planId", "planName pricing validityDays trialDays")
      .sort({ createdAt: -1, endDate: -1 });

    let unusedCredit = 0;
    let remainingDays = 0;
    let discountedBasePrice = basePrice;
    let linkPurpose = `Renewal: ${plan.planName} Plan (${hotel.hotelName})`;

    // SCENARIO A: Remainder flow - Current plan still has unused days remaining
    if (currentSub && currentSub.endDate > now) {
      const proration = calculateUpgradeProration({
        currentSub,
        newPlanPrice: basePrice,
      });
      unusedCredit = proration.unusedCredit || 0;
      remainingDays = proration.remainingDays || 0;
      discountedBasePrice = Math.max(1, proration.payableAmount);
      if (unusedCredit > 0) {
        linkPurpose = `Renewal: ${plan.planName} Plan (${hotel.hotelName}) [₹${unusedCredit} credit for ${remainingDays} remaining days applied]`;
      }
    } else {
      // SCENARIO B: Expired flow - Plan is fully expired, charge 100% full amount
      discountedBasePrice = basePrice;
      linkPurpose = `Renewal: ${plan.planName} Plan (${hotel.hotelName}) [Full Amount - Plan Expired]`;
    }

    const taxRate = hotel.taxEnabled ? 0.18 : 0;
    const taxAmount = Number((discountedBasePrice * taxRate).toFixed(2));
    const finalAmount = Number((discountedBasePrice + taxAmount).toFixed(2));

    // Resolve owner user details for Cashfree customer info
    const ownerUser = await User.findOne({
      hotelId: hotel._id,
      role: "hotelOwner",
    }).lean();

    const customerEmail = (ownerUser?.email || hotel.email || "billing@hotel.com").trim().toLowerCase();
    const customerPhone = ownerUser?.phone || hotel.phone || "9999999999";
    const customerName = ownerUser?.name || hotel.ownerName || hotel.hotelName || "Hotel Owner";

    // Collision-Proof Order ID for High-Concurrency Multi-User Safety
    const randomSuffix = crypto.randomBytes(3).toString("hex");
    const linkId = `REN_${hotel._id.toString().slice(-6)}_${Date.now()}_${randomSuffix}`;

    // Return to Hotel Login with success & order_id query parameters and pre-filled email
    const returnUrl = `${frontendBaseUrl}/hotel-login?payment=success&order_id=${linkId}&email=${encodeURIComponent(customerEmail)}`;

    // Create Cashfree Payment Link (with prorated amount if unused days remain, or full amount if expired)
    const paymentLink = await createCashfreePaymentLink({
      linkId,
      linkAmount: finalAmount,
      linkCurrency: "INR",
      linkPurpose,
      customerDetails: {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      linkNotes: {
        hotelId: hotel._id.toString(),
        planId: plan._id.toString(),
        billingCycle: cycle,
        discount: String(unusedCredit || 0),
        originalPrice: String(basePrice),
      },
      returnUrl,
      expiryDays: 7,
    });

    if (paymentLink && paymentLink.link_url) {
      log.info(`[handleQuickRenewalRedirect] Redirecting ${hotel.hotelName} to Cashfree checkout: ${paymentLink.link_url} (Amount: ₹${finalAmount})`);
      return res.redirect(paymentLink.link_url);
    }

    return res.redirect(`${frontendBaseUrl}/plan-upgrade?hotelId=${hotel._id}`);
  } catch (error) {
    log.error(`[handleQuickRenewalRedirect] Error: ${error.message}`);
    const frontendBaseUrl = getFrontendUrl(req);
    const fallback = fallbackHotelId
      ? `${frontendBaseUrl}/plan-upgrade?hotelId=${fallbackHotelId}`
      : `${frontendBaseUrl}/plan-upgrade`;
    return res.redirect(fallback);
  }
};

// ============================================================
// 4. VERIFY EMAIL RENEWAL PAYMENT (Direct API Verification)
// ============================================================
// GET /payments/verify-renewal?orderId=...
// ============================================================
export const verifyRenewalPayment = async (req, res) => {
  try {
    const { orderId } = req.query;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    // 1. Check if already activated in DB (Idempotency)
    const existingSub = await Subscription.findOne({
      paymentOrderId: orderId,
      paymentStatus: "paid",
    }).populate("planId", "planName");

    if (existingSub) {
      return res.status(200).json({
        success: true,
        message: "Subscription renewal has been confirmed!",
        data: existingSub,
      });
    }


    

    // 2. Query Cashfree Link status
    const linkDetails = await fetchCashfreePaymentLink(orderId);
    if (!linkDetails) {
      return res.status(404).json({
        success: false,
        message: "Renewal order details could not be found with Cashfree.",
      });
    }

    const isPaid =
      linkDetails.link_status === "PAID" ||
      Number(linkDetails.link_amount_paid || 0) >= Number(linkDetails.link_amount || 0);

    if (!isPaid) {
      const isPending =
        linkDetails.link_status === "ACTIVE" ||
        linkDetails.link_status === "PENDING" ||
        linkDetails.link_status === "PROCESSING";

      const isCancelled =
        linkDetails.link_status === "USER_DROPPED" ||
        linkDetails.link_status === "CANCELLED";

      return res.status(200).json({
        success: false,
        pending: isPending,
        cancelled: isCancelled,
        linkStatus: linkDetails.link_status,
        message: isPending
          ? "Your payment is currently being confirmed by your bank. Your subscription will activate automatically once confirmed."
          : isCancelled
          ? "The payment was cancelled and no amount was deducted."
          : "Payment was not completed. You can try again anytime from your renewal email.",
      });
    }

    // 3. Process activation
    const renewedSub = await processRenewalActivation({
      linkId: orderId,
      transactionId: `CF-${orderId}`,
      amount: linkDetails.link_amount_paid || linkDetails.link_amount,
      notes: linkDetails.link_notes || {},
    });

    if (!renewedSub) {
      return res.status(500).json({
        success: false,
        message: "Failed to activate renewal. Please contact support.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription renewed successfully!",
      data: renewedSub,
    });
  } catch (error) {
    log.error(`[verifyRenewalPayment] Error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
// 5. CASHFREE WEBHOOK (PRODUCTION BACKUP)
// ============================================================
// POST /payments/webhook
// ============================================================
export const handleCashfreeWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const timestamp = req.headers["x-webhook-timestamp"];
    const rawBody = JSON.stringify(req.body);

    const isValid = verifyCashfreeWebhook({ rawBody, signature, timestamp });
    if (!isValid) {
      log.warn("[Cashfree Webhook] Invalid webhook signature received.");
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    const { type, data } = req.body;
    log.info(`[Cashfree Webhook] Event received: ${type}`);

    // --------------------------------------------------------
    // CASE A: PAYMENT SUCCESS (Standard Orders & Payment Links)
    // --------------------------------------------------------
    const isPaymentSuccess =
      type === "PAYMENT_SUCCESS_WEBHOOK" ||
      type === "ORDER_PAID" ||
      type === "PAYMENT_LINK_EVENT" ||
      type === "LINK_PAID_WEBHOOK";

    if (isPaymentSuccess) {
      const order = data?.order;
      const payment = data?.payment;
      const link = data?.link;
      const orderId = order?.order_id || link?.link_id || data?.order_id;
      const transactionId = payment?.cf_payment_id || `CF-${orderId}`;

      // A.1 HOTEL REGISTRATION ORDER
      if (orderId?.startsWith("REG_")) {
        const registration = await SaasHotelRegistration.findOne({ paymentOrderId: orderId });
        if (registration && registration.paymentStatus !== "paid") {
          registration.paymentStatus = "paid";
          registration.paymentTransactionId = String(transactionId);
          await registration.save();
          log.info(`[Cashfree Webhook] Auto-marked registration ${registration._id} as paid.`);
        }
      }

      // A.2 1-CLICK EMAIL RENEWAL ORDER
      else if (orderId?.startsWith("REN_") || link?.link_id?.startsWith("REN_")) {
        const linkId = orderId?.startsWith("REN_") ? orderId : link?.link_id;
        const amount = payment?.payment_amount || order?.order_amount || link?.link_amount || 0;
        await processRenewalActivation({
          linkId,
          transactionId,
          amount,
          notes: link?.link_notes || order?.order_tags || {},
        });
      }
    }

    return res.status(200).json({ success: true, message: "Webhook acknowledged" });
  } catch (error) {
    log.error(`[Cashfree Webhook] Error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};
