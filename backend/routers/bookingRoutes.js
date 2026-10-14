import express from "express";

import {
    createBooking,
    getAllBookings,
    getBookingById,
    getBookingsByCustomer,
    getActiveBookings,
    updateBooking,
    deleteBooking,
    addBookingPayment,
    checkoutRooms,
    addFoodService,
    addRoomService,
    markFoodServicesPaid,
    markRoomServicesPaid,
} from "../controllers/bookingController.js";

import {
    authVerify,
    permissionVerify,
    permissionVerifyAny,
} from "../middleware/userVerify.js";
import { subscriptionVerify } from "../middleware/subscriptionVerify.js";

const router = express.Router();

// ===============================
// BOOKING
// ===============================

router.post(
    "/",
    authVerify,
    permissionVerify("roomsBooking"),
    subscriptionVerify,
    createBooking
);

router.get(
    "/",
    authVerify,
    permissionVerify("roomsBooking"),
    getAllBookings
);

router.get(
    "/active",
    authVerify,
    permissionVerify("roomsBooking"),
    getActiveBookings
);

router.get(
    "/customer/:customerId",
    authVerify,
    permissionVerify("roomsBooking"),
    getBookingsByCustomer
);

router.get(
    "/:id",
    authVerify,
    permissionVerify("roomsBooking"),
    getBookingById
);

router.put(
    "/:id",
    authVerify,
    permissionVerify("roomsBooking"),
    subscriptionVerify,
    updateBooking
);

router.delete(
    "/:id",
    authVerify,
    permissionVerify("roomsBooking"),
    subscriptionVerify,
    deleteBooking
);

// ===============================
// PAYMENTS
// ===============================

router.post(
    "/:id/payment",
    authVerify,
    permissionVerify("roomsBooking"),
    subscriptionVerify,
    addBookingPayment
);

// ===============================
// CHECKOUT
// ===============================

router.post(
    "/:id/checkout",
    authVerify,
    permissionVerify("roomsBooking"),
    subscriptionVerify,
    checkoutRooms
);

// ===============================
// FOOD SERVICES
// ===============================

router.post(
    "/:id/rooms/:roomId/food",
    authVerify,
    permissionVerify("foodManagement"),
    subscriptionVerify,
    addFoodService
);

router.patch(
    "/:id/rooms/:roomId/food/paid",
    authVerify,
    permissionVerifyAny("foodManagement", "roomsBooking"),
    subscriptionVerify,
    markFoodServicesPaid
);

// ===============================
// ROOM SERVICES
// ===============================

router.post(
    "/:id/rooms/:roomId/room-service",
    authVerify,
    permissionVerify("serviceManagement"),
    subscriptionVerify,
    addRoomService
);

router.patch(
    "/:id/rooms/:roomId/room-service/paid",
    authVerify,
    permissionVerifyAny("serviceManagement", "roomsBooking"),
    subscriptionVerify,
    markRoomServicesPaid
);

export default router;
