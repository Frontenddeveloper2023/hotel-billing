import express from "express";

import {
  getAdminNotifications,
  markNotificationAsRead,
} from "../controllers/saasNotificationController.js";

import {
  authVerify,
  permissionVerify,
} from "../middleware/userVerify.js";

const router = express.Router();

// ============================================================
// ADMIN NOTIFICATIONS
// ============================================================

// Get all SaaS admin notifications
router.get(
  "/admin",
  authVerify,
  permissionVerify("hotelRegistrations"),
  getAdminNotifications
);

// Mark notification as read
router.put(
  "/read/:id",
  authVerify,
  permissionVerify("hotelRegistrations"),
  markNotificationAsRead
);

export default router;