import mongoose from "mongoose";
import Room from "../models/room.js";
import { log } from "../util/logger.js";

// ============================================================
// GET TENANT IDS
// ============================================================

const getTenantIds = (req, res) => {
    const hotelId = req.user?.hotelId;
    const branchId = req.user?.branchId;

    if (!hotelId) {
        res.status(403).json({
            success: false,
            message:
                "Your account is not connected to a hotel. Please contact the administrator.",
        });

        return null;
    }

    if (!branchId) {
        res.status(403).json({
            success: false,
            message:
                "Your account is not connected to a branch. Please contact the administrator.",
        });

        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({
            success: false,
            message:
                "Your hotel information is invalid. Please contact the administrator.",
        });

        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
        res.status(400).json({
            success: false,
            message:
                "Your branch information is invalid. Please contact the administrator.",
        });

        return null;
    }

    return {
        hotelId,
        branchId,
    };
};

// ============================================================
// ADD ROOM
// ============================================================

const addRoom = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        const {
            roomNumber,
            roomType,
            bedType,
            pricePerNight,
            status,
        } = req.body;

        // ----------------------------------------------------
        // ROOM NUMBER
        // ----------------------------------------------------

        if (
            !roomNumber ||
            typeof roomNumber !== "string" ||
            !roomNumber.trim()
        ) {
            log(
                "ERROR",
                "Add Room failed: Room number is required"
            );

            return res.status(400).json({
                success: false,
                message: "Room number is required.",
            });
        }

        const normalizedRoomNumber = roomNumber.trim();

        // ----------------------------------------------------
        // ROOM TYPE
        // ----------------------------------------------------

        if (
            !roomType ||
            typeof roomType !== "string" ||
            !roomType.trim()
        ) {
            log(
                "ERROR",
                "Add Room failed: Room type is required"
            );

            return res.status(400).json({
                success: false,
                message: "Room type is required.",
            });
        }

        // ----------------------------------------------------
        // BED TYPE
        // ----------------------------------------------------

        if (
            !bedType ||
            typeof bedType !== "string" ||
            !bedType.trim()
        ) {
            log(
                "ERROR",
                "Add Room failed: Bed type is required"
            );

            return res.status(400).json({
                success: false,
                message: "Bed type is required.",
            });
        }

        // ----------------------------------------------------
        // PRICE
        // ----------------------------------------------------

        if (
            pricePerNight === undefined ||
            pricePerNight === null ||
            pricePerNight === ""
        ) {
            log(
                "ERROR",
                "Add Room failed: Price per night is required"
            );

            return res.status(400).json({
                success: false,
                message: "Price per night is required.",
            });
        }

        const price = Number(pricePerNight);

        if (!Number.isFinite(price) || price <= 0) {
            log(
                "ERROR",
                `Add Room failed: Invalid price per night - ${pricePerNight}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Price per night must be a valid number greater than 0.",
            });
        }

        // ----------------------------------------------------
        // ROOM TYPE VALIDATION
        // ----------------------------------------------------

        const allowedRoomTypes = [
            "AC",
            "Non-AC",
        ];

        if (!allowedRoomTypes.includes(roomType.trim())) {
            log(
                "ERROR",
                `Add Room failed: Invalid room type - ${roomType}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Room type must be AC or Non-AC.",
            });
        }

        // ----------------------------------------------------
        // BED TYPE VALIDATION
        // ----------------------------------------------------

        const allowedBedTypes = [
            "Single Bed",
            "2 Bed",
            "3 Bed",
        ];

        if (!allowedBedTypes.includes(bedType.trim())) {
            log(
                "ERROR",
                `Add Room failed: Invalid bed type - ${bedType}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Bed type must be Single Bed, 2 Bed or 3 Bed.",
            });
        }

        // ----------------------------------------------------
        // STATUS
        // ----------------------------------------------------

        const roomStatus = status || "available";

        const allowedStatuses = [
            "available",
            "occupied",
        ];

        if (!allowedStatuses.includes(roomStatus)) {
            log(
                "ERROR",
                `Add Room failed: Invalid room status - ${roomStatus}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Room status must be available or occupied.",
            });
        }

        // ----------------------------------------------------
        // CHECK DUPLICATE ROOM
        // ----------------------------------------------------
        //
        // IMPORTANT:
        // Duplicate room number is checked only within
        // the current hotel + branch.
        //
        // ----------------------------------------------------

        const existingRoom = await Room.findOne({
            hotelId,
            branchId,
            roomNumber: normalizedRoomNumber,
        });

        if (existingRoom) {
            log(
                "ERROR",
                `Add Room failed: Room number already exists in this branch - ${normalizedRoomNumber}`
            );

            return res.status(409).json({
                success: false,
                message:
                    "This room number already exists in your branch.",
            });
        }

        // ----------------------------------------------------
        // CREATE ROOM
        // ----------------------------------------------------

        const room = await Room.create({
            hotelId,
            branchId,

            roomNumber: normalizedRoomNumber,
            roomType: roomType.trim(),
            bedType: bedType.trim(),
            pricePerNight: price,
            status: roomStatus,
        });

        log(
            "INFO",
            `Room added successfully: ${room.roomNumber} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(201).json({
            success: true,
            message: "Room added successfully.",
            room,
        });
    } catch (error) {
        log(
            "ERROR",
            `Add Room error: ${error.message}`
        );

        console.error("Add Room error:", error);

        return res.status(500).json({
            success: false,
            message:
                "Unable to add the room right now. Please try again later.",
        });
    }
};

// ============================================================
// GET ALL ROOMS
// ============================================================

const getAllRooms = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        // ----------------------------------------------------
        // ONLY CURRENT HOTEL + BRANCH
        // ----------------------------------------------------

        const rooms = await Room.find({
            hotelId,
            branchId,
        }).sort({
            roomNumber: 1,
        });

        log(
            "INFO",
            `Rooms fetched successfully: ${rooms.length} rooms | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message: "Rooms fetched successfully.",
            rooms,
        });
    } catch (error) {
        log(
            "ERROR",
            `Get all rooms error: ${error.message}`
        );

        console.error(
            "Get all rooms error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load rooms right now. Please try again later.",
        });
    }
};

// ============================================================
// GET SINGLE ROOM
// ============================================================

const getRoom = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        const { id } = req.params;

        // ----------------------------------------------------
        // OBJECT ID VALIDATION
        // ----------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {
            log(
                "ERROR",
                `Get Room failed: Invalid room ID - ${id}`
            );

            return res.status(400).json({
                success: false,
                message: "Invalid room ID.",
            });
        }

        // ----------------------------------------------------
        // FIND ROOM INSIDE CURRENT TENANT
        // ----------------------------------------------------

        const room = await Room.findOne({
            _id: id,
            hotelId,
            branchId,
        });

        if (!room) {
            log(
                "ERROR",
                `Get Room failed: Room not found in current branch - ${id}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "The room was not found in your branch.",
            });
        }

        log(
            "INFO",
            `Room fetched successfully: ${room.roomNumber} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message: "Room fetched successfully.",
            room,
        });
    } catch (error) {
        log(
            "ERROR",
            `Get Room error: ${error.message}`
        );

        console.error(
            "Get Room error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load the room right now. Please try again later.",
        });
    }
};

// ============================================================
// UPDATE ROOM
// ============================================================

const updateRoom = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        const { id } = req.params;

        const {
            roomNumber,
            roomType,
            bedType,
            pricePerNight,
            status,
        } = req.body;

        // ----------------------------------------------------
        // OBJECT ID VALIDATION
        // ----------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {
            log(
                "ERROR",
                `Update Room failed: Invalid room ID - ${id}`
            );

            return res.status(400).json({
                success: false,
                message: "Invalid room ID.",
            });
        }

        // ----------------------------------------------------
        // FIND ROOM INSIDE CURRENT TENANT
        // ----------------------------------------------------

        const existingRoom = await Room.findOne({
            _id: id,
            hotelId,
            branchId,
        });

        if (!existingRoom) {
            log(
                "ERROR",
                `Update Room failed: Room not found in current branch - ${id}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "The room was not found in your branch.",
            });
        }

        const currentStatus = String(existingRoom.status || "").toLowerCase();
        if (currentStatus === "booked" || currentStatus === "occupied") {
            log(
                "WARN",
                `Update Room rejected: Room is currently occupied/booked - roomNumber=${existingRoom.roomNumber}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "This room is currently occupied/booked by a guest and cannot be edited. Please wait until checkout.",
            });
        }

        // ----------------------------------------------------
        // ROOM NUMBER VALIDATION
        // ----------------------------------------------------

        if (roomNumber !== undefined) {
            if (
                typeof roomNumber !== "string" ||
                !roomNumber.trim()
            ) {
                log(
                    "ERROR",
                    `Update Room failed: Invalid room number - ${id}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Room number cannot be empty.",
                });
            }

            const normalizedRoomNumber =
                roomNumber.trim();

            // ------------------------------------------------
            // CHECK DUPLICATE ONLY SAME HOTEL + BRANCH
            // ------------------------------------------------

            const duplicateRoom =
                await Room.findOne({
                    hotelId,
                    branchId,
                    roomNumber: normalizedRoomNumber,
                    _id: { $ne: id },
                });

            if (duplicateRoom) {
                log(
                    "ERROR",
                    `Update Room failed: Room number already exists in this branch - ${normalizedRoomNumber}`
                );

                return res.status(409).json({
                    success: false,
                    message:
                        "This room number already exists in your branch.",
                });
            }

            existingRoom.roomNumber =
                normalizedRoomNumber;
        }

        // ----------------------------------------------------
        // ROOM TYPE VALIDATION
        // ----------------------------------------------------

        if (roomType !== undefined) {
            const allowedRoomTypes = [
                "AC",
                "Non-AC",
            ];

            if (!allowedRoomTypes.includes(roomType)) {
                log(
                    "ERROR",
                    `Update Room failed: Invalid room type - ${roomType}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Room type must be AC or Non-AC.",
                });
            }

            existingRoom.roomType = roomType;
        }

        // ----------------------------------------------------
        // BED TYPE VALIDATION
        // ----------------------------------------------------

        if (bedType !== undefined) {
            const allowedBedTypes = [
                "Single Bed",
                "2 Bed",
                "3 Bed",
            ];

            if (!allowedBedTypes.includes(bedType)) {
                log(
                    "ERROR",
                    `Update Room failed: Invalid bed type - ${bedType}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Bed type must be Single Bed, 2 Bed or 3 Bed.",
                });
            }

            existingRoom.bedType = bedType;
        }

        // ----------------------------------------------------
        // PRICE VALIDATION
        // ----------------------------------------------------

        if (pricePerNight !== undefined) {
            if (
                pricePerNight === "" ||
                pricePerNight === null
            ) {
                log(
                    "ERROR",
                    `Update Room failed: Price is empty - ${id}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Price per night is required.",
                });
            }

            const price = Number(pricePerNight);

            if (
                !Number.isFinite(price) ||
                price <= 0
            ) {
                log(
                    "ERROR",
                    `Update Room failed: Invalid price - ${pricePerNight}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Price per night must be a valid number greater than 0.",
                });
            }

            existingRoom.pricePerNight = price;
        }

        // ----------------------------------------------------
        // STATUS VALIDATION
        // ----------------------------------------------------

        if (status !== undefined) {
            const allowedStatuses = [
                "available",
                "occupied",
            ];

            if (!allowedStatuses.includes(status)) {
                log(
                    "ERROR",
                    `Update Room failed: Invalid status - ${status}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Room status must be available or occupied.",
                });
            }

            existingRoom.status = status;
        }

        // ----------------------------------------------------
        // SAVE UPDATED ROOM
        // ----------------------------------------------------

        const updatedRoom =
            await existingRoom.save();

        log(
            "INFO",
            `Room updated successfully: ${updatedRoom.roomNumber} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message: "Room updated successfully.",
            room: updatedRoom,
        });
    } catch (error) {
        log(
            "ERROR",
            `Update Room error: ${error.message}`
        );

        console.error(
            "Update Room error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update the room right now. Please try again later.",
        });
    }
};

// ============================================================
// DELETE ROOM
// ============================================================

const deleteRoom = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        const { id } = req.params;

        // ----------------------------------------------------
        // OBJECT ID VALIDATION
        // ----------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {
            log(
                "ERROR",
                `Delete Room failed: Invalid room ID - ${id}`
            );

            return res.status(400).json({
                success: false,
                message: "Invalid room ID.",
            });
        }

        // ----------------------------------------------------
        // FIND ROOM INSIDE CURRENT TENANT
        // ----------------------------------------------------

        const room = await Room.findOne({
            _id: id,
            hotelId,
            branchId,
        });

        if (!room) {
            log(
                "ERROR",
                `Delete Room failed: Room not found in current branch - ${id}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "The room was not found in your branch.",
            });
        }

        // ----------------------------------------------------
        // DO NOT DELETE OCCUPIED ROOM
        // ----------------------------------------------------

        if (room.status === "occupied") {
            log(
                "ERROR",
                `Delete Room failed: Room ${room.roomNumber} is currently occupied`
            );

            return res.status(400).json({
                success: false,
                message:
                    "An occupied room cannot be deleted.",
            });
        }

        // ----------------------------------------------------
        // DELETE ONLY CURRENT TENANT ROOM
        // ----------------------------------------------------

        await Room.findOneAndDelete({
            _id: id,
            hotelId,
            branchId,
        });

        log(
            "INFO",
            `Room deleted successfully: ${room.roomNumber} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message: "Room deleted successfully.",
        });
    } catch (error) {
        log(
            "ERROR",
            `Delete Room error: ${error.message}`
        );

        console.error(
            "Delete Room error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete the room right now. Please try again later.",
        });
    }
};

// ============================================================
// EXPORT
// ============================================================

export {
    addRoom,
    getAllRooms,
    getRoom,
    updateRoom,
    deleteRoom,
};