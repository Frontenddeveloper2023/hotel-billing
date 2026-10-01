import Subscription from "../models/subscription.js";
import Hotels from "../models/hotels.js";
import BranchHotels from "../models/branchHotels.js";
import { log } from "../util/logger.js";

/**
 * ============================================================
 * BRANCH LIMIT VERIFY MIDDLEWARE
 * ============================================================
 *
 * Verifies that the authenticated hotel owner's hotel has:
 * 1. An active, valid subscription
 * 2. Available branch quota (currentCount < limits.branches)
 *
 * ============================================================
 */

export const branchLimitVerify = async (req, res, next) => {
  try {
    // ========================================================
    // 1. GET HOTEL ID
    // ========================================================
    let hotelId = req.user?.hotelId;

    // SaaS Admin can specify hotelId in body or query
    if (req.user?.role === "admin" && !hotelId) {
      hotelId = req.body?.hotelId || req.query?.hotelId;
    }

    if (!hotelId) {
      log.warn("[Branch Limit Verify] User is not associated with a hotel.");
      return res.status(403).json({
        success: false,
        message: "Your account is not connected to a hotel.",
      });
    }

    // ========================================================
    // 2. CHECK HOTEL STATUS
    // ========================================================
    const hotel = await Hotels.findById(hotelId)
      .select("_id hotelName status")
      .lean();

    if (!hotel) {
      log.warn(`[Branch Limit Verify] Hotel not found: ${hotelId}`);
      return res.status(404).json({
        success: false,
        message: "Hotel account was not found.",
      });
    }

    if (hotel.status !== "active") {
      log.warn(`[Branch Limit Verify] Inactive hotel: ${hotelId}`);
      return res.status(403).json({
        success: false,
        message:
          "Your hotel account is not active. Please contact the administrator.",
      });
    }

    // ========================================================
    // 3. GET ACTIVE SUBSCRIPTION
    // ========================================================
    const now = new Date();

    const subscription = await Subscription.findOne({
      hotelId,
      status: {
        $in: ["trial", "active", "expiring_soon", "grace_period"],
      },
      endDate: {
        $gt: now,
      },
    })
      .sort({
        endDate: -1,
      })
      .lean();

    if (!subscription) {
      log.warn(`[Branch Limit Verify] No active subscription for hotel: ${hotelId}`);
      return res.status(403).json({
        success: false,
        message:
          "Your subscription has expired or is not active. Please renew or upgrade your plan to create branches.",
      });
    }

    // ========================================================
    // 4. CHECK BRANCH LIMIT
    // ========================================================
    const branchLimit = Number(subscription.limits?.branches ?? 0);

    // Count existing branches for this hotel
    const currentCount = await BranchHotels.countDocuments({
      hotelId,
    });

    log.info(
      `[Branch Limit Verify] Hotel: ${hotelId} | Existing Branches: ${currentCount} | Limit: ${branchLimit}`
    );

    if (currentCount >= branchLimit) {
      log.warn(
        `[Branch Limit Verify] Branch limit reached for hotel: ${hotelId}. Allowed: ${branchLimit}, Current: ${currentCount}`
      );

      return res.status(403).json({
        success: false,
        message: `Branch limit reached. Your current plan allows a maximum of ${branchLimit} branch${
          branchLimit === 1 ? "" : "es"
        } (you currently have ${currentCount}). Please upgrade your subscription plan to add more sub-branches.`,
        limit: branchLimit,
        currentCount,
        upgradeRequired: true,
      });
    }

    // ========================================================
    // 5. ATTACH DATA & CONTINUE
    // ========================================================
    req.subscription = subscription;
    req.branchUsage = {
      currentCount,
      limit: branchLimit,
      remaining: Math.max(0, branchLimit - currentCount),
    };

    next();
  } catch (error) {
    log.error(`[Branch Limit Verify] Error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: "Unable to verify branch subscription limit right now.",
    });
  }
};
