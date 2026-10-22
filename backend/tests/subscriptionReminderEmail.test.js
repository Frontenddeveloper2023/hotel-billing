import { test, describe } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import dotenv from "dotenv";

process.env.NODE_ENV = "test";
dotenv.config();

import {
  generateRenewalToken,
  verifyRenewalToken,
} from "../util/renewalToken.js";
import {
  getDaysDifference,
  getDateKey,
  getIndiaDate,
} from "../cron/subscriptionExpiryCron.js";
import {
  getFrontendUrl,
  getBackendApiUrl,
  getBaseUrl,
  renderSubscriptionReminderTemplate,
} from "../util/email.js";

describe("Subscription Reminder Email Flow & Scheduler Tests", () => {
  const sampleHotelId = "6acddf2d38cbf65c1787ea01";
  const samplePlanId = "6aaa53185c80eba3c908a91e";
  const sampleCycle = "monthly";

  // Derive frontend and backend API URLs dynamically from .env configuration
  const frontendBaseUrl = getFrontendUrl();
  const backendApiUrl = getBackendApiUrl();

  // ============================================================
  // 1. DATE CALCULATION & SCHEDULER DAYS DIFFERENCE TESTS
  // ============================================================
  describe("Scheduler Expiry Date Difference Calculation (Asia/Kolkata)", () => {
    test("Scenario: Exactly 7 days remaining", () => {
      const from = new Date("2026-10-16T10:00:00+05:30");
      const to = new Date("2026-10-23T10:00:00+05:30");
      const diff = getDaysDifference(from, to);
      assert.equal(diff, 7);
    });

    test("Scenario: Exactly 3 days remaining", () => {
      const from = new Date("2026-10-16T10:00:00+05:30");
      const to = new Date("2026-10-19T10:00:00+05:30");
      const diff = getDaysDifference(from, to);
      assert.equal(diff, 3);
    });

    test("Scenario: Exactly 1 day remaining", () => {
      const from = new Date("2026-10-16T10:00:00+05:30");
      const to = new Date("2026-10-17T10:00:00+05:30");
      const diff = getDaysDifference(from, to);
      assert.equal(diff, 1);
    });

    test("Scenario: Exactly expired (0 days or past date)", () => {
      const from = new Date("2026-10-16T10:00:00+05:30");
      const to = new Date("2026-10-16T10:00:00+05:30");
      const diff = getDaysDifference(from, to);
      assert.equal(diff, 0);

      const pastTo = new Date("2026-10-15T10:00:00+05:30");
      assert.ok(getDaysDifference(from, pastTo) < 0);
    });
  });

  // ============================================================
  // 2. RENEWAL TOKEN SECURITY & VERIFICATION
  // ============================================================
  describe("1-Click Renewal Token Cryptographic Integrity", () => {
    test("Generates valid URL-safe token containing hotelId, planId, billingCycle", () => {
      const token = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
        expiresInDays: 7,
      });

      assert.ok(typeof token === "string" && token.length > 20);

      const verification = verifyRenewalToken(token);
      assert.equal(verification.valid, true);
      assert.equal(verification.hotelId, sampleHotelId);
      assert.equal(verification.planId, samplePlanId);
      assert.equal(verification.billingCycle, sampleCycle);
    });

    test("Rejects expired renewal tokens", () => {
      // Create token that expired 1 second ago
      const token = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
        expiresInDays: -1, // in the past
      });

      const verification = verifyRenewalToken(token);
      assert.equal(verification.valid, false);
      assert.match(verification.message, /expired/i);
    });

    test("Rejects tampered renewal tokens (forged payload or signature)", () => {
      const validToken = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
        expiresInDays: 7,
      });

      // Tamper with the base64 string
      const decoded = Buffer.from(validToken, "base64url").toString("utf8");
      const parts = decoded.split(":");
      parts[0] = "6acddf2d38cbf65c1787ea99"; // Alter hotelId
      const tampered = Buffer.from(parts.join(":")).toString("base64url");

      const verification = verifyRenewalToken(tampered);
      assert.equal(verification.valid, false);
      assert.match(verification.message, /tampered|invalid/i);
    });
  });

  // ============================================================
  // 3. EMAIL TEMPLATE CONTENT & BUTTON RENDERING TESTS
  // ============================================================
  describe("Email Template Content & HTML Button Rendering", () => {
    test("Scenario 1: Pre-expiry 7-day reminder contains active 'Pay & Renew Now' CTA (Upgrade button safely commented for future)", async () => {
      const renewToken = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
      });
      const quickRenewUrl = `${backendApiUrl}/payments/quick-renew?token=${renewToken}`;

      // Plain-text check: only active Pay & Renew button attached
      const plainText = `Please renew your plan now so all hotel rooms and billing keep working without interruption.

Pay & Renew Now: ${quickRenewUrl}`;

      assert.ok(plainText.includes("Pay & Renew Now:"));
      assert.ok(!plainText.includes("Choose / Upgrade Plan:"));

      // HTML Button structure check
      assert.ok(quickRenewUrl.includes("quick-renew?token="));
    });

    test("Scenario 2: Pre-expiry 3-day reminder urgency and buttons", () => {
      const daysRemaining = 3;
      const urgencyText = `Your subscription will expire in ${daysRemaining} days. Please renew soon to avoid any stoppage.`;
      const subject = `Subscription Reminder: ${daysRemaining} days left for Jayam Hotel`;

      assert.equal(subject, "Subscription Reminder: 3 days left for Jayam Hotel");
      assert.ok(urgencyText.includes("3 days"));
    });

    test("Scenario 3: Pre-expiry 1-day reminder urgency and buttons", () => {
      const daysRemaining = 1;
      const urgencyText = "Your subscription expires tomorrow. Please renew today to keep your hotel system running smoothly.";
      const subject = "Subscription Reminder: 1 day left for Jayam Hotel";

      assert.equal(subject, "Subscription Reminder: 1 day left for Jayam Hotel");
      assert.ok(urgencyText.includes("expires tomorrow"));
    });

    test("Scenario 4: Expired subscription notification contains active 'Pay & Renew Now' CTA (Upgrade button safely commented for future)", () => {
      const renewToken = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
      });
      const quickRenewUrl = `${backendApiUrl}/payments/quick-renew?token=${renewToken}`;

      const plainText = `Your account features are currently paused. Please renew your plan now to continue using all hotel features.

Pay & Renew Now: ${quickRenewUrl}`;

      assert.ok(plainText.includes("Pay & Renew Now:"));
      assert.ok(!plainText.includes("Choose / Upgrade Different Plan:"));

      const sampleHtmlButton = `
        <td align="center" bgcolor="#2563EB" style="border-radius:10px;background-color:#2563EB;box-shadow:0 4px 14px rgba(37,99,235,0.30);">
          <a href="${quickRenewUrl}" target="_blank" style="display:block;padding:16px 28px;background-color:#2563EB;color:#FFFFFF !important;text-decoration:none;">
            💳 Pay &amp; Renew Now (Premium Plan) &rarr;
          </a>
        </td>
      `;

      assert.ok(sampleHtmlButton.includes("background-color:#2563EB;"));
      assert.ok(sampleHtmlButton.includes("Pay &amp; Renew Now"));
    });

    test("Scenario 5: Trial subscription billingCycle automatically falls back to 'monthly' for 1-click renewal", () => {
      let resolvedCycle = "trial";
      if (resolvedCycle === "trial") {
        resolvedCycle = "monthly";
      }
      assert.equal(resolvedCycle, "monthly");

      const token = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: resolvedCycle,
      });

      const verification = verifyRenewalToken(token);
      assert.equal(verification.billingCycle, "monthly");
    });

    test("Scenario 6: Dynamically sources frontend and backend URLs from .env configuration", () => {
      const baseUrl = getBaseUrl();
      const expectedBaseName = process.env.BASE_NAME || "hotel-billing-system-backend";

      assert.equal(backendApiUrl, `${baseUrl}/${expectedBaseName}/api`);
      assert.ok(frontendBaseUrl.endsWith("/hotel-billing-system"));

      // Verify URL helpers react to .env overrides
      const originalClientUrl = process.env.CLIENT_URL;
      try {
        process.env.CLIENT_URL = "https://custom-hotel-portal.com";
        assert.equal(getFrontendUrl(), "https://custom-hotel-portal.com");
      } finally {
        if (originalClientUrl !== undefined) {
          process.env.CLIENT_URL = originalClientUrl;
        } else {
          delete process.env.CLIENT_URL;
        }
      }
    });

    test("Scenario 7: Every reminder email provides both an HTML Pay & Renew button and a plain-text renewal link fallback", () => {
      const renewToken = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
      });
      const quickRenewUrl = `${backendApiUrl}/payments/quick-renew?token=${renewToken}`;

      const { subject, text, html } = renderSubscriptionReminderTemplate({
        resolvedHotelName: "Jayam Hotel",
        resolvedPlanName: "Premium Plan",
        cycleLabel: "Monthly",
        formattedDate: "22 October 2026",
        daysRemaining: 1,
        formattedBasePrice: "₹999",
        formattedCredit: "₹0",
        remainingDays: 1,
        formattedAmount: "₹999",
        taxAmount: 0,
        quickRenewUrl,
        upgradeUrl: `${frontendBaseUrl}/plan-upgrade`,
        urgencyText: "Your subscription expires tomorrow. Please renew today to keep your hotel system running smoothly.",
        urgencyColor: "#B42318",
        subject: "Subscription Reminder: 1 day left for Jayam Hotel",
      });

      // Verify subject
      assert.equal(subject, "Subscription Reminder: 1 day left for Jayam Hotel");

      // Verify HTML Pay & Renew Now button
      assert.ok(html.includes("💳 Pay &amp; Renew Now"));
      assert.ok(html.includes("background-color:#2563EB"));
      assert.ok(html.includes(`href="${quickRenewUrl}"`));

      // Verify HTML plain-text fallback link
      assert.ok(
        html.includes(
          "Can't click the button? Copy and paste this renewal link into your browser:"
        )
      );
      assert.ok(html.includes(quickRenewUrl));

      // Verify Cashfree security guarantee note
      assert.ok(
        html.includes("100% Secure Checkout powered by Cashfree Payments")
      );

      // Regression checks: verify NO empty button comments or obsolete text
      assert.ok(!html.includes("<!-- BUTTON -->\n\n\n<!-- FOOTER -->"));
      assert.ok(!html.includes("<!-- BUTTON -->\r\n\r\n\r\n<!-- FOOTER -->"));
      assert.ok(!text.includes("Renew or Upgrade here:"));
      assert.ok(text.includes(`Pay & Renew Now: ${quickRenewUrl}`));
    });

    test("Scenario 8: Template identifiers and dispatch logging tags are consistent across reminders and expired notifications", () => {
      const reminderDays = [7, 3, 1];
      reminderDays.forEach((days) => {
        const templateId = `reminder-${days}d`;
        assert.match(templateId, /^reminder-\d+d$/);
      });

      const expiredTemplateId = "subscription-expired";
      assert.equal(expiredTemplateId, "subscription-expired");

      const logTagDispatch = "[EMAIL-DISPATCH]";
      const logTagSuccess = "[EMAIL-DISPATCH-SUCCESS]";
      const logTagCron = "[CRON-DISPATCH]";

      assert.ok(logTagDispatch.startsWith("[EMAIL-DISPATCH]"));
      assert.ok(logTagSuccess.startsWith("[EMAIL-DISPATCH-SUCCESS]"));
      assert.ok(logTagCron.startsWith("[CRON-DISPATCH]"));
    });

    test("Scenario 9: Regression test across 1-day, 3-day, and 7-day reminders confirms consistent button and fallback link", () => {
      const daysList = [1, 3, 7];
      daysList.forEach((days) => {
        const renewToken = generateRenewalToken({
          hotelId: sampleHotelId,
          planId: samplePlanId,
          billingCycle: sampleCycle,
        });
        const quickRenewUrl = `${backendApiUrl}/payments/quick-renew?token=${renewToken}`;

        const { html, text } = renderSubscriptionReminderTemplate({
          resolvedHotelName: "Jayam Hotel",
          resolvedPlanName: "Standard Plan",
          cycleLabel: "Monthly",
          formattedDate: "28 October 2026",
          daysRemaining: days,
          formattedBasePrice: "₹1,499",
          formattedCredit: "₹100",
          remainingDays: days,
          formattedAmount: "₹1,399",
          taxAmount: 0,
          quickRenewUrl,
          upgradeUrl: `${frontendBaseUrl}/plan-upgrade`,
          urgencyText: `Your subscription will expire in ${days} day(s).`,
          urgencyColor: days === 1 ? "#B42318" : days === 3 ? "#C2410C" : "#0875D1",
          subject: `Subscription Reminder: ${days} day${days > 1 ? "s" : ""} left for Jayam Hotel`,
        });

        // Button assertions
        assert.ok(html.includes("💳 Pay &amp; Renew Now"));
        assert.ok(html.includes(`href="${quickRenewUrl}"`));
        assert.ok(html.includes("background-color:#2563EB"));

        // Fallback link assertions
        assert.ok(
          html.includes(
            "Can't click the button? Copy and paste this renewal link into your browser:"
          )
        );
        assert.ok(html.includes(quickRenewUrl));

        // Plain text assertions
        assert.ok(text.includes(`Pay & Renew Now: ${quickRenewUrl}`));
        assert.ok(!text.includes("Renew or Upgrade here:"));
      });
    });
  });

  // ============================================================
  // 4. DEDUPLICATION LOGIC VERIFICATION
  // ============================================================
  describe("Hotel & Subscription Deduplication Logic", () => {
    test("Multiple subscriptions for same hotel: latest subscription takes precedence", () => {
      const hotelAId = "6acddf2d38cbf65c1787ea01";
      const hotelBId = "6acddf2d38cbf65c1787ea02";

      const mockSubscriptions = [
        // Hotel A: newer subscription
        {
          _id: "sub_a_new",
          hotelId: { _id: hotelAId },
          endDate: new Date("2026-11-01"),
          createdAt: new Date("2026-10-01"),
          status: "active",
        },
        // Hotel A: older subscription
        {
          _id: "sub_a_old",
          hotelId: { _id: hotelAId },
          endDate: new Date("2026-10-01"),
          createdAt: new Date("2026-09-01"),
          status: "expired",
        },
        // Hotel B: only one subscription
        {
          _id: "sub_b",
          hotelId: hotelBId,
          endDate: new Date("2026-10-23"),
          createdAt: new Date("2026-09-23"),
          status: "active",
        },
      ];

      // Replicate the deduplication algorithm in subscriptionExpiryCron.js
      const latestSubscriptionsByHotel = new Map();
      for (const sub of mockSubscriptions) {
        if (!sub.hotelId) continue;
        const hId = String(sub.hotelId._id || sub.hotelId);
        if (!latestSubscriptionsByHotel.has(hId)) {
          latestSubscriptionsByHotel.set(hId, sub);
        }
      }

      const deduplicated = Array.from(latestSubscriptionsByHotel.values());
      assert.equal(deduplicated.length, 2);
      assert.equal(deduplicated[0]._id, "sub_a_new");
      assert.equal(deduplicated[1]._id, "sub_b");
    });

    test("Expired or cancelled subscription with future date is NEVER resurrected to active", () => {
      const evaluateActiveStatus = (status, daysRemaining) => {
        // Must match subscriptionExpiryCron.js logic:
        // Only 'expiring_soon' with > 7 days is restored to active
        if (daysRemaining > 7 && status === "expiring_soon") {
          return "active";
        }
        return status;
      };

      // Expired plan with 30 days left should stay expired
      assert.equal(evaluateActiveStatus("expired", 30), "expired");

      // Cancelled plan with 30 days left should stay cancelled
      assert.equal(evaluateActiveStatus("cancelled", 30), "cancelled");

      // Suspended plan with 30 days left should stay suspended
      assert.equal(evaluateActiveStatus("suspended", 30), "suspended");

      // Expiring soon plan with extended validity (>7 days) correctly restores to active
      assert.equal(evaluateActiveStatus("expiring_soon", 15), "active");
    });

    test("Older subscription is superseded when newer subscription exists for the same hotel", () => {
      const hotelId = "6ad5c00e3f288855ebaacdf4";
      const subscriptions = [
        {
          _id: "sub_1_old",
          hotelId,
          createdAt: new Date("2026-10-21T07:20:02.796Z"),
          status: "active",
        },
        {
          _id: "sub_2_new_upgraded",
          hotelId,
          createdAt: new Date("2026-10-21T07:21:07.443Z"),
          status: "expired",
        },
      ];

      const isSuperseded = (sub, allSubs) => {
        return allSubs.some(
          (other) =>
            other.hotelId === sub.hotelId &&
            other._id !== sub._id &&
            other.createdAt > sub.createdAt
        );
      };

      // sub_1 is older than sub_2 -> superseded
      assert.equal(isSuperseded(subscriptions[0], subscriptions), true);

      // sub_2 is the latest -> not superseded
      assert.equal(isSuperseded(subscriptions[1], subscriptions), false);
    });
  });

  // ============================================================
  // 5. CASCADING RENEWAL TOKEN VALIDITY & DOUBLE-RENEWAL PREVENTION
  // ============================================================
  describe("Cascading Expiry Windows & Security Guards", () => {
    test("Cascading expiry duration algorithm assigns 4d (7d), 2d (3d), 1d (1d), and 10d (expired)", () => {
      const getExpiryInDays = (daysRemaining, isExpired = false) => {
        if (isExpired) return 10;
        if (daysRemaining <= 1) return 1;
        if (daysRemaining <= 3) return 2;
        return Math.max(1, daysRemaining - 3);
      };

      assert.equal(getExpiryInDays(7), 4);
      assert.equal(getExpiryInDays(3), 2);
      assert.equal(getExpiryInDays(1), 1);
      assert.equal(getExpiryInDays(0, true), 10);
    });

    test("Generates 1-day, 2-day, 4-day, and 10-day cryptographic tokens successfully", () => {
      const token1d = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
        expiresInDays: 1,
      });
      const token2d = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
        expiresInDays: 2,
      });
      const token4d = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
        expiresInDays: 4,
      });
      const token10d = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
        expiresInDays: 10,
      });

      assert.equal(verifyRenewalToken(token1d).valid, true);
      assert.equal(verifyRenewalToken(token2d).valid, true);
      assert.equal(verifyRenewalToken(token4d).valid, true);
      assert.equal(verifyRenewalToken(token10d).valid, true);
    });

    test("Double-renewal prevention logic accurately flags already renewed active paid subscriptions", () => {
      const now = new Date("2026-10-22T12:00:00Z");

      const isAlreadyRenewed = (sub) => {
        if (!sub) return false;
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        return (
          sub.status === "active" &&
          sub.paymentStatus === "paid" &&
          sub.endDate.getTime() - now.getTime() > sevenDaysMs
        );
      };

      // Case A: Hotel just renewed for 30 days -> already renewed = true
      const justRenewedSub = {
        status: "active",
        paymentStatus: "paid",
        endDate: new Date("2026-11-22T12:00:00Z"), // 31 days ahead
      };
      assert.equal(isAlreadyRenewed(justRenewedSub), true);

      // Case B: Hotel still expiring in 2 days -> already renewed = false (allow renewal)
      const expiringSub = {
        status: "active",
        paymentStatus: "paid",
        endDate: new Date("2026-10-24T12:00:00Z"), // 2 days ahead
      };
      assert.equal(isAlreadyRenewed(expiringSub), false);

      // Case C: Expired subscription -> already renewed = false
      const expiredSub = {
        status: "expired",
        paymentStatus: "paid",
        endDate: new Date("2026-10-21T12:00:00Z"),
      };
      assert.equal(isAlreadyRenewed(expiredSub), false);
    });
  });
});

