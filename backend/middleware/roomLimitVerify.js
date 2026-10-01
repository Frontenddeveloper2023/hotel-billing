import Subscription from "../models/subscription.js";
import Hotels from "../models/hotels.js";
import Room from "../models/room.js";
import { log } from "../util/logger.js";

/**
 * ============================================================
 * ROOM LIMIT VERIFY MIDDLEWARE
 * ============================================================
 *
 * Verifies that the authenticated hotel user's hotel has:
 * 1. An active, valid subscription
 * 2. Available room allocation quota (currentCount < limits.rooms)
 *
 * ============================================================
 */

export const roomLimitVerify = async (req, res, next) => {
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
      log.warn("[Room Limit Verify] User is not associated with a hotel.");
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
      log.warn(`[Room Limit Verify] Hotel not found: ${hotelId}`);
      return res.status(404).json({
        success: false,
        message: "Hotel account was not found.",
      });
    }

    if (hotel.status !== "active") {
      log.warn(`[Room Limit Verify] Inactive hotel: ${hotelId}`);
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
      .populate("planId")
      .sort({
        endDate: -1,
      })
      .lean();

    if (!subscription) {
      log.warn(
        `[Room Limit Verify] No active subscription for hotel: ${hotelId}`
      );
      return res.status(403).json({
        success: false,
        message:
          "Your subscription has expired or is not active. Please renew or upgrade your plan to manage rooms.",
      });
    }

    // ========================================================
    // 4. CHECK ROOM LIMIT (PER BRANCH)
    // ========================================================
    const roomLimit = Number(
      subscription.limits?.rooms ??
      subscription.planId?.limits?.rooms ??
      0
    );

    let branchId = req.user?.branchId || req.body?.branchId || req.query?.branchId;

    // Count existing rooms for this branch (or hotel if no branchId)
    const roomQuery = { hotelId };
    if (branchId) {
      roomQuery.branchId = branchId;
    }

    const currentCount = await Room.countDocuments(roomQuery);

    log.info(
      `[Room Limit Verify] Hotel: ${hotelId} | Branch: ${branchId || "all"} | Existing Rooms: ${currentCount} | Limit: ${roomLimit}`
    );

    // If roomLimit is specified (> 0) and currentCount reaches or exceeds limit
    if (roomLimit > 0 && currentCount >= roomLimit) {
      log.warn(
        `[Room Limit Verify] Room limit reached for branch: ${branchId} in hotel: ${hotelId}. Allowed: ${roomLimit}, Current: ${currentCount}`
      );

      return res.status(403).json({
        success: false,
        message: `Your branch room allocation limit has been reached! Your current plan allows a maximum of ${roomLimit} room${
          roomLimit === 1 ? "" : "s"
        } per branch (this branch already has ${currentCount}). If you want to add more rooms, please upgrade your subscription plan.`,
        limit: roomLimit,
        currentCount,
        upgradeRequired: true,
      });
    }

    // ========================================================
    // 5. ATTACH DATA & CONTINUE
    // ========================================================
    req.subscription = subscription;
    req.roomUsage = {
      currentCount,
      limit: roomLimit,
      remaining: roomLimit > 0 ? Math.max(0, roomLimit - currentCount) : null,
    };

    next();
  } catch (error) {
    log.error(`[Room Limit Verify] Error: ${error.message}`);

    return res.status(500).json({
      success: false,
      message: "Unable to verify room subscription limit right now.",
    });
  }
};
