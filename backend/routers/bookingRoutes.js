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

const router = express.Router();

// ===============================
// BOOKING
// ===============================

router.post(
    "/",
    authVerify,
    permissionVerify("roomsBooking"),
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
    updateBooking
);

router.delete(
    "/:id",
    authVerify,
    permissionVerify("roomsBooking"),
    deleteBooking
);

// ===============================
// PAYMENTS
// ===============================

router.post(
    "/:id/payment",
    authVerify,
    permissionVerify("roomsBooking"),
    addBookingPayment
);

// ===============================
// CHECKOUT
// ===============================

router.post(
    "/:id/checkout",
    authVerify,
    permissionVerify("roomsBooking"),
    checkoutRooms
);

// ===============================
// FOOD SERVICES
// ===============================

router.post(
    "/:id/rooms/:roomId/food",
    authVerify,
    permissionVerify("foodManagement"),
    addFoodService
);

router.patch(
    "/:id/rooms/:roomId/food/paid",
    authVerify,
    permissionVerifyAny("foodManagement", "roomsBooking"),
    markFoodServicesPaid
);

// ===============================
// ROOM SERVICES
// ===============================

router.post(
    "/:id/rooms/:roomId/room-service",
    authVerify,
    permissionVerify("serviceManagement"),
    addRoomService
);

router.patch(
    "/:id/rooms/:roomId/room-service/paid",
    authVerify,
    permissionVerifyAny("serviceManagement", "roomsBooking"),
    markRoomServicesPaid
);

export default router;
