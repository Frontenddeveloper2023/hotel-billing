import Subscription from "../models/subscription.js";
import Hotels from "../models/hotels.js";
import { log } from "../util/logger.js";



export const subscriptionVerify = async (req, res, next) => {
  try {
    // ==========================================
    // GET HOTEL ID FROM AUTHENTICATED USER
    // ==========================================

    const hotelId = req.user?.hotelId;

    console.log(
      "[Subscription Verify] User:",
      req.user?._id
    );

    console.log(
      "[Subscription Verify] Hotel ID:",
      hotelId
    );

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

    console.log(
      "[Subscription Verify] Hotel:",
      hotel
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: "Hotel account was not found.",
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

    console.log(
      "[Subscription Verify] Current time:",
      now
    );

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
        endDate: -1,
      })
      .lean();

    console.log(
      "[Subscription Verify] Subscription:",
      subscription
    );

    // ==========================================
    // NO ACTIVE SUBSCRIPTION
    // ==========================================

    if (!subscription) {
      // Find any subscription for debugging
      const existingSubscription =
        await Subscription.findOne({
          hotelId: hotelId,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      console.log(
        "[Subscription Verify] Existing subscription for hotel:",
        existingSubscription
      );

      return res.status(403).json({
        success: false,
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