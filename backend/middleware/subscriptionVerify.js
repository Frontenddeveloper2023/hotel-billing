import Subscription from "../models/subscription.js";
import Hotels from "../models/hotels.js";
import { log } from "../util/logger.js";



export const subscriptionVerify = async (req, res, next) => {
  try {
    // ==========================================
    // GET HOTEL ID FROM AUTHENTICATED USER
    // ==========================================

    // SaaS Admin bypass
    if (req.user?.role === "admin") {
      return next();
    }

    const hotelId = req.user?.hotelId;

    if (!hotelId) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is not connected to a hotel.",
      });
    }

    // ==========================================
    // CHECK HOTEL
    // ==========================================

    const hotel = await Hotels.findById(hotelId)
      .select("_id hotelName status")
      .lean();

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel account was not found.",
      });
    }

    if (hotel.status === "blocked" || hotel.status === "cancelled" || hotel.status === "suspended") {
      return res.status(403).json({
        success: false,
        action: "LOGOUT",
        reason: "blocked",
        message: "Your hotel was blocked by admin.",
      });
    }

    if (hotel.status !== "active") {
      return res.status(403).json({
        success: false,
        message:
          "Your hotel account is not active. Please contact the administrator.",
      });
    }

    // ==========================================
    // CURRENT TIME
    // ==========================================

    const now = new Date();

    // ==========================================
    // FIND SUBSCRIPTION
    // ==========================================

    const subscription = await Subscription.findOne({
      hotelId: hotelId,

      status: {
        $in: [
          "trial",
          "active",
          "expiring_soon",
        ],
      },

      endDate: {
        $gt: now,
      },
    })
      .sort({
        createdAt: -1,
        endDate: -1,
      })
      .lean();

    // ==========================================
    // NO ACTIVE SUBSCRIPTION / EXPIRED
    // ==========================================

    if (!subscription) {
      // Find latest subscription to determine if it was a trial
      const existingSubscription =
        await Subscription.findOne({
          hotelId: hotelId,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      const wasTrial =
        existingSubscription?.status === "trial" ||
        existingSubscription?.trialStatus === "active" ||
        existingSubscription?.trialStatus === "completed" ||
        existingSubscription?.billingCycle === "trial";

      if (wasTrial) {
        return res.status(403).json({
          success: false,
          isTrialEnded: true,
          message:
            "Your free trial was ended so purchase any active plan and continue your portal.",
        });
      }

      return res.status(403).json({
        success: false,
        isExpired: true,
        message:
          "Your subscription has expired or is not active. Please renew your plan.",
      });
    }

    // ==========================================
    // SAVE SUBSCRIPTION TO REQUEST
    // ==========================================

    req.subscription = subscription;

    console.log(
      "[Subscription Verify] Access granted.",
      {
        hotelId: subscription.hotelId,
        planId: subscription.planId,
        status: subscription.status,
        endDate: subscription.endDate,
      }
    );

    next();
  } catch (error) {
    console.error(
      "[Subscription Verify] Error:",
      error
    );

    log.error(
      `[Subscription Verify] Error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify your subscription right now.",
    });
  }
};