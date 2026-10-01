import express from "express";

import {
    addRoom,
    getAllRooms,
    getRoom,
    updateRoom,
    deleteRoom,
} from "../controllers/roomController.js";

import {
    authVerify,
    permissionVerify,
    permissionVerifyAny,
} from "../middleware/userVerify.js";
import { roomLimitVerify } from "../middleware/roomLimitVerify.js";

const router = express.Router();


// ==========================================
// ADD ROOM
// Only roomsBooking permission + valid room plan limit
// ==========================================
router.post(
    "/add",
    authVerify,
    permissionVerify("roomsBooking"),
    roomLimitVerify,
    addRoom
);


// ==========================================
// GET ALL ROOMS
// Rooms Booking OR Dashboard
// ==========================================
router.get(
    "/all",
    authVerify,
    permissionVerifyAny("roomsBooking", "dashboard"),
    getAllRooms
);


// ==========================================
// GET SINGLE ROOM
// Rooms Booking OR Dashboard
// ==========================================
router.get(
    "/:id",
    authVerify,
    permissionVerifyAny("roomsBooking", "dashboard"),
    getRoom
);


// ==========================================
// UPDATE ROOM
// Only roomsBooking permission
// ==========================================
router.put(
    "/:id",
    authVerify,
    permissionVerify("roomsBooking"),
    updateRoom
);


// ==========================================
// DELETE ROOM
// Only roomsBooking permission
// ==========================================
router.delete(
    "/:id",
    authVerify,
    permissionVerify("roomsBooking"),
    deleteRoom
);

export default router;