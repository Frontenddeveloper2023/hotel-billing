import express from "express";
import {
  createRegistrationOrder,
  verifyRegistrationPayment,
  createSubscriptionUpgradeOrder,
  verifySubscriptionUpgradePayment,
  handleQuickRenewalRedirect,
  verifyRenewalPayment,
  handleCashfreeWebhook,
} from "../controllers/paymentController.js";
import { authVerify } from "../middleware/userVerify.js";

const router = express.Router();

// ------------------------------------------------------------
// 1. REGISTRATION CHECKOUT PAYMENTS (Public / Registration Flow)
// ------------------------------------------------------------
router.post("/registration/create-order", createRegistrationOrder);
router.post("/registration/verify-payment", verifyRegistrationPayment);

// ------------------------------------------------------------
// 2. SUBSCRIPTION UPGRADE PAYMENTS (Authenticated Hotel User)
// ------------------------------------------------------------
router.post(
  "/subscription-upgrade/create-order",
  authVerify,
  createSubscriptionUpgradeOrder
);
router.post(
  "/subscription-upgrade/verify-payment",
  authVerify,
  verifySubscriptionUpgradePayment
);

// ------------------------------------------------------------
// 3. 1-CLICK EMAIL RENEWAL FLOW (Public / Signed Token)
// ------------------------------------------------------------
router.get("/quick-renew", handleQuickRenewalRedirect);
router.get("/verify-renewal", verifyRenewalPayment);

// ------------------------------------------------------------
// 4. CASHFREE WEBHOOK (Direct from Cashfree Server)
// ------------------------------------------------------------
router.get("/webhook", (req, res) => {
  return res.status(200).json({ success: true, message: "Cashfree webhook endpoint is active and listening." });
});
router.post("/webhook", handleCashfreeWebhook);

export default router;

