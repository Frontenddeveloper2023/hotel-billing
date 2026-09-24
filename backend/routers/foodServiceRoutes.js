import express from "express";

import {
  createFoodService,
  getAllFoodServices,
  getFoodServicesByBooking,
  updateFoodService,
  deleteFoodService,
  markFoodServicesPaid,
} from "../controllers/foodServiceController.js";

import {
  authVerify,
  permissionVerify,
} from "../middleware/userVerify.js";

import { subscriptionVerify } from "../middleware/subscriptionVerify.js";
import { featureVerify } from "../middleware/featureVerify.js";

const router = express.Router();

// ==========================================
// GET ALL FOOD SERVICES
// ==========================================

router.get(
  "/",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  getAllFoodServices
);

// ==========================================
// GET FOOD SERVICES FOR ONE BOOKING
// ==========================================

router.get(
  "/booking/:bookingId",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  getFoodServicesByBooking
);

// ==========================================
// ADD FOOD
// ==========================================

router.post(
  "/bookings/:bookingId/rooms/:roomId",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  createFoodService
);

// ==========================================
// UPDATE FOOD
// ==========================================

router.put(
  "/bookings/:bookingId/rooms/:roomId/:foodServiceId",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  updateFoodService
);

// ==========================================
// DELETE FOOD
// ==========================================

router.delete(
  "/bookings/:bookingId/rooms/:roomId/food/:foodServiceId",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  deleteFoodService
);

// ==========================================
// MARK FOOD SERVICES PAID
// ==========================================

router.patch(
  "/bookings/:bookingId/rooms/:roomId/paid",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  markFoodServicesPaid
);

export default router;