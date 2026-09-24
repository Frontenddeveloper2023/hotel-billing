import mongoose from "mongoose";
import SaasNotification from "../models/saasNotification.js";
import { log } from "../util/logger.js";

// ============================================================
// GET ADMIN NOTIFICATIONS
// GET /saas-notifications/admin
// ============================================================

export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await SaasNotification.find()
      .populate(
        "registrationId",
        "hotelName ownerName email phone status paymentStatus paymentTransactionId billingCycle"
      )
      .populate(
        "hotelId",
        "hotelName ownerName email phone status"
      )
      .sort({ createdAt: -1 });

    const unreadCount = notifications.filter(
      (notification) => !notification.isRead
    ).length;

    return res.status(200).json({
      success: true,
      message: "Admin notifications retrieved successfully.",
      count: notifications.length,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    log.error(
      `Failed to retrieve SaaS notifications: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load notifications right now. Please try again later.",
    });
  }
};

// ============================================================
// MARK NOTIFICATION AS READ
// PUT /saas-notifications/read/:id
// ============================================================

export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Notification ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await SaasNotification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification was not found.",
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();

    await notification.save();

    log.info(
      `SaaS notification marked as read: ${notification._id}`
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    log.error(
      `Failed to mark SaaS notification as read: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to update the notification right now.",
    });
  }
};