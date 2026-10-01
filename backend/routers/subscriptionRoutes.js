import express from "express";

import {
    createSubscription,
    getAllSubscriptions,
    getSubscriptionById,
    getHotelSubscription,
    getMySubscription,
    upgradeHotelSubscription,
    updateSubscription,
    cancelSubscription,
} from "../controllers/subscriptionController.js";

import {
    authVerify,
    permissionVerify,
} from "../middleware/userVerify.js";

const router = express.Router();


// ============================================================
// MY CURRENT HOTEL SUBSCRIPTION & UPGRADE
// ============================================================
//
// These routes are for logged-in hotel users.
// hotelId comes from req.user.hotelId in the controller.
//
// ============================================================

router.get(
    "/my-subscription",
    authVerify,
    getMySubscription
);

// Immediately upgrade hotel's plan without requiring admin approval
router.post(
    "/upgrade",
    authVerify,
    upgradeHotelSubscription
);


// ============================================================
// ADMIN SUBSCRIPTION ROUTES
// ============================================================


// ------------------------------------------------------------
// Get all subscriptions
// ------------------------------------------------------------

router.get(
    "/list-subscriptions",
    authVerify,
    permissionVerify("subscriptions"),
    getAllSubscriptions
);


// ------------------------------------------------------------
// Create new subscription
// ------------------------------------------------------------

router.post(
    "/add-subscription",
    authVerify,
    permissionVerify("subscriptions"),
    createSubscription
);


// ------------------------------------------------------------
// Get subscription for a specific hotel
// SaaS Admin only
// ------------------------------------------------------------

router.get(
    "/hotel/:hotelId",
    authVerify,
    permissionVerify("subscriptions"),
    getHotelSubscription
);


// ------------------------------------------------------------
// Get subscription by ID
// SaaS Admin only
// ------------------------------------------------------------

router.get(
    "/:id",
    authVerify,
    permissionVerify("subscriptions"),
    getSubscriptionById
);


// ------------------------------------------------------------
// Update subscription
// SaaS Admin only
// ------------------------------------------------------------

router.put(
    "/update-subscription/:id",
    authVerify,
    permissionVerify("subscriptions"),
    updateSubscription
);


// ------------------------------------------------------------
// Cancel subscription
// SaaS Admin only
// ------------------------------------------------------------

router.delete(
    "/cancel-subscription/:id",
    authVerify,
    permissionVerify("subscriptions"),
    cancelSubscription
);


export default router;