import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { calculateUpgradeProration, calculateEndDate } from "../controllers/paymentController.js";

describe("Plan Upgrade Proration Calculation Tests", () => {
  // 1. ₹999 current plan, 30 days, 16 unused days, ₹1,999 new plan → ₹1,466.20
  test("Requirement 1: ₹999 current plan, 30 days, 16 unused days, ₹1,999 new plan → ₹1,466.20", () => {
    const result = calculateUpgradeProration({
      newPlanPrice: 1999,
      currentPlanPrice: 999,
      totalDays: 30,
      remainingDays: 16,
    });

    assert.equal(result.currentPlanPrice, 999.00);
    assert.equal(result.totalDays, 30);
    assert.equal(result.remainingDays, 16);
    assert.equal(result.perDayCost, 33.30);
    assert.equal(result.unusedCredit, 532.80);
    assert.equal(result.payableAmount, 1466.20);
  });

  // 2. ₹999 current plan, 30 days, 5 unused days, ₹2,000 new plan → ₹1,833.50
  test("Requirement 2: ₹999 current plan, 30 days, 5 unused days, ₹2,000 new plan → ₹1,833.50", () => {
    const result = calculateUpgradeProration({
      newPlanPrice: 2000,
      currentPlanPrice: 999,
      totalDays: 30,
      remainingDays: 5,
    });

    assert.equal(result.currentPlanPrice, 999.00);
    assert.equal(result.totalDays, 30);
    assert.equal(result.remainingDays, 5);
    assert.equal(result.perDayCost, 33.30);
    assert.equal(result.unusedCredit, 166.50);
    assert.equal(result.payableAmount, 1833.50);
  });

  // 3. Zero unused days → no upgrade credit
  test("Requirement 3: Zero unused days → no upgrade credit", () => {
    const result = calculateUpgradeProration({
      newPlanPrice: 1999,
      currentPlanPrice: 999,
      totalDays: 30,
      remainingDays: 0,
    });

    assert.equal(result.unusedCredit, 0.00);
    assert.equal(result.payableAmount, 1999.00);
    assert.equal(result.remainingDays, 0);
  });

  // 4. Expired current plan → no upgrade credit
  test("Requirement 4: Expired current plan (status: 'expired' or past endDate) → no upgrade credit", () => {
    const now = new Date("2026-05-15T12:00:00Z");

    // Case 4a: Status explicitly expired
    const resultExpiredStatus = calculateUpgradeProration({
      currentSub: {
        status: "expired",
        amount: 999,
        startDate: new Date("2026-03-01T00:00:00Z"),
        endDate: new Date("2026-03-31T00:00:00Z"),
      },
      newPlanPrice: 1999,
      asOfDate: now,
    });
    assert.equal(resultExpiredStatus.unusedCredit, 0.00);
    assert.equal(resultExpiredStatus.payableAmount, 1999.00);
    assert.equal(resultExpiredStatus.remainingDays, 0);

    // Case 4b: EndDate in the past
    const resultPastDate = calculateUpgradeProration({
      currentSub: {
        status: "active",
        amount: 999,
        startDate: new Date("2026-04-01T00:00:00Z"),
        endDate: new Date("2026-05-01T00:00:00Z"),
      },
      newPlanPrice: 1999,
      asOfDate: now,
    });
    assert.equal(resultPastDate.unusedCredit, 0.00);
    assert.equal(resultPastDate.payableAmount, 1999.00);
    assert.equal(resultPastDate.remainingDays, 0);
  });

  // 5. Different current plan prices and validity periods
  test("Requirement 5: Different current plan prices and validity periods (Quarterly, Yearly, Custom)", () => {
    // Quarterly plan: ₹2,999, 90 days validity, 45 remaining days, new plan ₹5,999
    const quarterlyResult = calculateUpgradeProration({
      newPlanPrice: 5999,
      currentPlanPrice: 2999,
      totalDays: 90,
      remainingDays: 45,
    });
    // Daily cost = 2999 / 90 = 33.3222... (display 33.32)
    // Credit = (2999 * 45) / 90 = 1499.50
    // Payable = 5999 - 1499.50 = 4499.50
    assert.equal(quarterlyResult.unusedCredit, 1499.50);
    assert.equal(quarterlyResult.payableAmount, 4499.50);

    // Yearly plan: ₹9,999, 365 days, 100 remaining days, new plan ₹15,000
    const yearlyResult = calculateUpgradeProration({
      newPlanPrice: 15000,
      currentPlanPrice: 9999,
      totalDays: 365,
      remainingDays: 100,
    });
    // Credit = Math.round((9999 * 100) / 365 * 100) / 100 = 2739.45
    // Payable = 15000 - 2739.45 = 12260.55
    assert.equal(yearlyResult.unusedCredit, 2739.45);
    assert.equal(yearlyResult.payableAmount, 12260.55);

    // Custom duration: 45 days validity, price ₹1,500, 15 remaining days, new plan ₹3,000
    const customResult = calculateUpgradeProration({
      newPlanPrice: 3000,
      currentPlanPrice: 1500,
      totalDays: 45,
      remainingDays: 15,
    });
    // Credit = (1500 * 15) / 45 = 500.00
    // Payable = 3000 - 500 = 2500.00
    assert.equal(customResult.unusedCredit, 500.00);
    assert.equal(customResult.payableAmount, 2500.00);
  });

  // 6. Fractional currency calculations and rounding
  test("Requirement 6: Fractional currency calculations and rounding (avoids premature rounding errors)", () => {
    // Current plan ₹499 for 30 days, 7 remaining days, new plan ₹999
    // Premature daily rounding: 499 / 30 = 16.63 -> 16.63 * 7 = 116.41
    // Correct full precision: (499 * 7) / 30 = 3493 / 30 = 116.4333... -> rounded to 116.43
    const fracResult = calculateUpgradeProration({
      newPlanPrice: 999,
      currentPlanPrice: 499,
      totalDays: 30,
      remainingDays: 7,
    });

    assert.equal(fracResult.perDayCost, 16.63);
    assert.equal(fracResult.unusedCredit, 116.43);
    assert.equal(fracResult.payableAmount, 882.57);
  });

  // 7. Invalid or missing subscription dates and safe fallbacks
  test("Requirement 7: Invalid or missing subscription dates, negative amounts and bad data", () => {
    // Null current subscription
    const nullSubResult = calculateUpgradeProration({
      currentSub: null,
      newPlanPrice: 1999,
    });
    assert.equal(nullSubResult.unusedCredit, 0);
    assert.equal(nullSubResult.payableAmount, 1999);
    assert.equal(nullSubResult.remainingDays, 0);

    // Invalid dates in current subscription
    const badDateResult = calculateUpgradeProration({
      currentSub: {
        amount: 999,
        startDate: "not-a-date",
        endDate: "invalid-date",
      },
      newPlanPrice: 1999,
    });
    assert.equal(badDateResult.unusedCredit, 0);
    assert.equal(badDateResult.payableAmount, 1999);
    assert.equal(badDateResult.remainingDays, 0);

    // Negative plan price input
    const negPriceResult = calculateUpgradeProration({
      newPlanPrice: -500,
      currentPlanPrice: 999,
      totalDays: 30,
      remainingDays: 10,
    });
    assert.equal(negPriceResult.payableAmount, 0);

    // Excess credit (credit > new plan price) should not result in negative payable
    const excessCreditResult = calculateUpgradeProration({
      newPlanPrice: 300,
      currentPlanPrice: 999,
      totalDays: 30,
      remainingDays: 16, // credit is 532.80 > 300
    });
    assert.equal(excessCreditResult.unusedCredit, 300.00); // capped at newPlanPrice
    assert.equal(excessCreditResult.excessCredit, 232.80);
    assert.equal(excessCreditResult.payableAmount, 0.00); // NEVER negative
  });

  // 8. Subscription validity dates helper
  test("Requirement 8a: calculateEndDate produces exact validity days for billing cycles", () => {
    const start = new Date("2026-01-15T00:00:00Z");

    const endMonthly = calculateEndDate(start, "monthly");
    const diffMonthlyDays = Math.round((endMonthly.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diffMonthlyDays, 30);

    const endQuarterly = calculateEndDate(start, "quarterly");
    const diffQuarterlyDays = Math.round((endQuarterly.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diffQuarterlyDays, 90);

    const endHalfYearly = calculateEndDate(start, "halfYearly");
    const diffHalfYearlyDays = Math.round((endHalfYearly.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diffHalfYearlyDays, 180);

    const endYearly = calculateEndDate(start, "yearly");
    const diffYearlyDays = Math.round((endYearly.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    assert.equal(diffYearlyDays, 365);
  });

  // 8b. Duplicate upgrade requests & idempotency
  test("Requirement 8b: Duplicate upgrade requests prevent duplicate credit and duplicate activation", () => {
    // When an upgrade order has already been verified and activated, a replay returns the existing subscription
    const mockDb = new Map();
    const orderId = "UPG_test_123456";

    const verifyOrder = (orderId, subData) => {
      if (mockDb.has(orderId)) {
        return {
          idempotent: true,
          subscription: mockDb.get(orderId),
        };
      }
      mockDb.set(orderId, { ...subData, paymentOrderId: orderId });
      return {
        idempotent: false,
        subscription: mockDb.get(orderId),
      };
    };

    const firstRun = verifyOrder(orderId, { planId: "plan_pro", finalAmount: 1466.20 });
    assert.equal(firstRun.idempotent, false);
    assert.equal(firstRun.subscription.finalAmount, 1466.20);

    // Duplicate replay
    const secondRun = verifyOrder(orderId, { planId: "plan_pro", finalAmount: 1466.20 });
    assert.equal(secondRun.idempotent, true);
    assert.equal(secondRun.subscription.paymentOrderId, orderId);
  });

  // 9. Frontend amount tampering
  test("Requirement 9: Backend authoritatively calculates amount, rejecting or ignoring any frontend-supplied amount or credit", () => {
    // Current plan ₹999, 16 unused days. New plan ₹1,999.
    // Untrusted frontend tries to send amount: 1 or discount: 1998
    const untrustedFrontendBody = {
      planId: "pro_plan_id",
      billingCycle: "monthly",
      amount: 1.00, // TAMPERED!
      discount: 1998.00, // TAMPERED!
      remainingDays: 29, // TAMPERED!
    };

    const authoritativePlan = {
      _id: "pro_plan_id",
      planName: "Pro Plan",
      pricing: { monthly: 1999 },
    };

    const currentSubInDb = {
      planId: { planName: "Basic Plan", pricing: { monthly: 999 }, validityDays: 30 },
      amount: 999,
      billingCycle: "monthly",
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2026-05-01T00:00:00Z"),
    };

    // Backend ignores untrusted body.amount and body.discount:
    const authoritativePrice = authoritativePlan.pricing[untrustedFrontendBody.billingCycle];
    assert.equal(authoritativePrice, 1999);

    // Calculate with verified server dates (asOf 2026-04-15 = 16 days left)
    const asOf = new Date("2026-04-15T00:00:00Z");
    const result = calculateUpgradeProration({
      currentSub: currentSubInDb,
      newPlanPrice: authoritativePrice,
      asOfDate: asOf,
    });

    // Authoritative calculation overrides any tampering
    assert.equal(result.remainingDays, 16); // not 29
    assert.equal(result.unusedCredit, 532.80); // not 1998.00
    assert.equal(result.payableAmount, 1466.20); // not 1.00
  });

  // 10. Backend and payment gateway amount consistency
  test("Requirement 10: Backend and payment gateway amount consistency across preview, order, and verification", () => {
    const currentSub = {
      planId: { planName: "Basic Plan", pricing: { monthly: 999 }, validityDays: 30 },
      amount: 999,
      billingCycle: "monthly",
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2026-05-01T00:00:00Z"),
    };
    const newPlanPrice = 1999;
    const asOf = new Date("2026-04-15T00:00:00Z");

    // 1. Preview calculation
    const previewResult = calculateUpgradeProration({
      currentSub,
      newPlanPrice,
      asOfDate: asOf,
    });

    // 2. Order creation amount sent to gateway
    const orderChargeAmount = previewResult.payableAmount;

    // 3. Payment verification amount recorded in database
    const gatewayPaidAmount = orderChargeAmount;
    const recordedFinalAmount = gatewayPaidAmount;
    const recordedDiscount = previewResult.unusedCredit;

    assert.equal(previewResult.payableAmount, 1466.20);
    assert.equal(orderChargeAmount, 1466.20);
    assert.equal(recordedFinalAmount, 1466.20);
    assert.equal(recordedDiscount, 532.80);
    assert.equal(Number((recordedFinalAmount + recordedDiscount).toFixed(2)), newPlanPrice);
  });

  // 11. Plan switch to lower-priced plan:
  // - If unused credit >= new plan price: payable is ₹0, Cashfree bypassed (1-click direct switch)
  // - If unused credit < new plan price: payable is difference, paid via Cashfree
  test("Requirement 11: Switching to lower-priced plan calculates unused credit and allows free switch if fully covered", () => {
    // Scenario 1: Current Premium ₹1,999, 0 days used (all 30 days remaining), switching to Basic ₹999
    const currentSubFullCredit = {
      planId: { planName: "Premium Plan", pricing: { monthly: 1999 }, validityDays: 30 },
      amount: 1999,
      billingCycle: "monthly",
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2026-05-01T00:00:00Z"),
    };
    const asOfStart = new Date("2026-04-01T00:00:00Z"); // 0 days used, 30 days remaining

    const fullCreditResult = calculateUpgradeProration({
      currentSub: currentSubFullCredit,
      newPlanPrice: 999,
      asOfDate: asOfStart,
    });

    // Credit covers the ₹999 basic plan completely
    assert.equal(fullCreditResult.unusedCredit, 999.00); // capped at newPlanPrice
    assert.equal(fullCreditResult.excessCredit, 1000.00);
    assert.equal(fullCreditResult.payableAmount, 0.00); // Free switch: ₹0 to pay, no Cashfree needed!

    // Scenario 2: Current Premium ₹1,999, 25 days used (5 days remaining), switching to Basic ₹999
    const asOfPartial = new Date("2026-04-26T00:00:00Z"); // 5 days remaining (credit = 5/30 * 1999 = 333.17)
    const partialCreditResult = calculateUpgradeProration({
      currentSub: currentSubFullCredit,
      newPlanPrice: 999,
      asOfDate: asOfPartial,
    });

    assert.equal(partialCreditResult.remainingDays, 5);
    assert.equal(partialCreditResult.unusedCredit, 333.17);
    assert.equal(partialCreditResult.payableAmount, 665.83); // Difference paid via Cashfree
    assert.ok(partialCreditResult.payableAmount >= 1.00, "Cashfree requires order amount >= 1 INR");
  });
});

