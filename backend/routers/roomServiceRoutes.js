import express from "express";

import {
    addRoomService,
    getAllServices,
    getServicesByBooking,
    updateRoomService,
    deleteRoomService,
    markRoomServicesPaid,
} from "../controllers/roomServiceController.js";

import {
    authVerify,
    permissionVerify,
} from "../middleware/userVerify.js";

const router = express.Router();

// Get all embedded room services
router.get(
    "/",
    authVerify,
    permissionVerify("serviceManagement"),
    getAllServices
);

// Get services for one booking
router.get(
    "/booking/:bookingId",
    authVerify,
    permissionVerify("serviceManagement"),
    getServicesByBooking
);

// Add room service
router.post(
    "/bookings/:bookingId/rooms/:roomId",
    authVerify,
    permissionVerify("serviceManagement"),
    addRoomService
);

// Update room service
router.put(
    "/bookings/:bookingId/rooms/:roomId/:serviceId",
    authVerify,
    permissionVerify("serviceManagement"),
    updateRoomService
);

// Delete room service
router.delete(
    "/bookings/:bookingId/rooms/:roomId/:serviceId",
    authVerify,
    permissionVerify("serviceManagement"),
    deleteRoomService
);

// Mark room services paid
router.patch(
    "/bookings/:bookingId/rooms/:roomId/paid",
    authVerify,
    permissionVerify("serviceManagement"),
    markRoomServicesPaid
);

export default router;
