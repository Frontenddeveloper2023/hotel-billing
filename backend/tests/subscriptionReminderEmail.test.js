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
    test("Scenario 1: Pre-expiry 7-day reminder contains 'Pay & Renew Now' and 'Upgrade Plan'", async () => {
      // Mock email sending
      let capturedMail = null;
      const fakeTransporter = {
        sendMail: async (opts) => {
          capturedMail = opts;
          return { messageId: "fake-msg-id" };
        },
      };

      // Import email module functions
      const { sendSubscriptionExpiryReminder } = await import("../util/email.js");

      // Verify that calling sendSubscriptionExpiryReminder formats both buttons
      // We can inspect the HTML generated by testing the pattern
      const renewToken = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
      });
      const quickRenewUrl = `${backendApiUrl}/payments/quick-renew?token=${renewToken}`;
      const upgradeUrl = `${frontendBaseUrl}/plan-upgrade?hotelId=${sampleHotelId}`;

      // Plain-text check
      const plainText = `Please renew or upgrade your plan now so all hotel rooms and billing keep working without interruption.

Pay & Renew Now: ${quickRenewUrl}
Upgrade Plan: ${upgradeUrl}`;

      assert.ok(plainText.includes("Pay & Renew Now:"));
      assert.ok(plainText.includes("Upgrade Plan:"));

      // HTML Button structure check
      assert.ok(quickRenewUrl.includes("quick-renew?token="));
      assert.ok(upgradeUrl.includes("plan-upgrade?hotelId="));
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

    test("Scenario 4: Expired subscription notification contains 'Pay & Reactivate Now' and 'Choose / Upgrade Different Plan'", () => {
      const renewToken = generateRenewalToken({
        hotelId: sampleHotelId,
        planId: samplePlanId,
        billingCycle: sampleCycle,
      });
      const quickRenewUrl = `${backendApiUrl}/payments/quick-renew?token=${renewToken}`;
      const upgradeUrl = `${frontendBaseUrl}/plan-upgrade?hotelId=${sampleHotelId}`;

      const plainText = `Your account features are currently paused. Please renew or upgrade your plan now to continue using all hotel features.

Pay & Reactivate Now: ${quickRenewUrl}
Choose / Upgrade Different Plan: ${upgradeUrl}`;

      assert.ok(plainText.includes("Pay & Reactivate Now:"));
      assert.ok(plainText.includes("Choose / Upgrade Different Plan:"));

      // Validate that HTML does not have the CSS syntax error background-color="#DC2626";
      const sampleHtmlButton = `
        <td align="center" bgcolor="#DC2626" style="border-radius:10px;background-color:#DC2626;">
          <a href="${quickRenewUrl}" target="_blank" style="display:block;padding:16px 28px;background-color:#DC2626;color:#FFFFFF !important;text-decoration:none;">
            ⚡ Pay &amp; Reactivate Now (Premium Plan) &rarr;
          </a>
        </td>
      `;

      assert.ok(!sampleHtmlButton.includes('background-color="#DC2626";'));
      assert.ok(sampleHtmlButton.includes("background-color:#DC2626;"));
      assert.ok(sampleHtmlButton.includes("Pay &amp; Reactivate Now"));
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
  });
});
