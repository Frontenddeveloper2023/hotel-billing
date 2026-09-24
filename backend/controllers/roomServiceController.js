import mongoose from "mongoose";
import Booking from "../models/booking.js";
import RoomService from "../models/roomService.js";
import { log } from "../util/logger.js";

// ============================================================
// HELPER
// ============================================================

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

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

    if (!isValidObjectId(hotelId)) {
        res.status(400).json({
            success: false,
            message:
                "Your hotel information is invalid. Please contact the administrator.",
        });

        return null;
    }

    if (!isValidObjectId(branchId)) {
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
// GET BOOKING + ROOM
// ============================================================
//
// IMPORTANT:
// Booking must belong to the logged-in hotel + branch.
//
// ============================================================

const getBookingRoom = async (
    bookingId,
    roomId,
    hotelId,
    branchId
) => {
    if (
        !bookingId ||
        !roomId ||
        !isValidObjectId(bookingId) ||
        !isValidObjectId(roomId) ||
        !isValidObjectId(hotelId) ||
        !isValidObjectId(branchId)
    ) {
        return null;
    }

    const booking = await Booking.findOne({
        _id: bookingId,
        hotelId,
        branchId,
    });

    if (!booking) {
        return null;
    }

    const room = booking.rooms.id(roomId);

    if (!room) {
        return null;
    }

    return {
        booking,
        room,
    };
};

// ============================================================
// BUILD ROOM SERVICE RESPONSE
// ============================================================

const formatRoomService = (
    booking,
    room,
    service
) => {
    return {
        _id: service._id,

        bookingId: booking._id,

        customerId: booking.customerId,

        roomId: room._id,

        roomNumber: room.roomNumber,

        serviceId: service.serviceId,

        serviceName: service.name,

        serviceFees: service.fees,

        quantity: service.quantity,

        total: service.total,

        paymentStatus: service.paymentStatus,

        bookingStatus: booking.bookingStatus,
    };
};

// ============================================================
// RECALCULATE BOOKING ROOM SERVICE TOTAL
// ============================================================

const recalculateRoomServiceTotal = (booking) => {
    let roomServiceTotal = 0;

    booking.rooms.forEach((bookingRoom) => {
        (bookingRoom.roomServices || []).forEach(
            (service) => {
                roomServiceTotal += Number(
                    service.total || 0
                );
            }
        );
    });

    if (!booking.financials) {
        booking.financials = {};
    }

    booking.financials.roomServiceTotal =
        roomServiceTotal;

    return roomServiceTotal;
};

// ============================================================
// 1. ADD ROOM SERVICE TO BOOKING ROOM
// ============================================================
//
// POST
// /api/bookings/:bookingId/rooms/:roomId/room-service
//
// ============================================================

export const addRoomService = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const {
            hotelId,
            branchId,
        } = tenant;

        const {
            bookingId,
            roomId,
        } = req.params;

        const {
            serviceId,
            name,
            fees,
            quantity,
        } = req.body;

        log(
            "INFO",
            `[ROOM SERVICE] Add request | Booking: ${bookingId} | Room: ${roomId} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        // ----------------------------------------------------
        // VALIDATE BOOKING ID
        // ----------------------------------------------------

        if (
            !bookingId ||
            !isValidObjectId(bookingId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        // ----------------------------------------------------
        // VALIDATE ROOM ID
        // ----------------------------------------------------

        if (
            !roomId ||
            !isValidObjectId(roomId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID.",
            });
        }

        // ----------------------------------------------------
        // VALIDATE SERVICE NAME
        // ----------------------------------------------------

        if (
            !name ||
            !String(name).trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Service name is required.",
            });
        }

        // ----------------------------------------------------
        // VALIDATE FEES
        // ----------------------------------------------------

        if (
            fees === undefined ||
            fees === null ||
            fees === ""
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Service fees are required.",
            });
        }

        const parsedFees = Number(fees);

        if (
            !Number.isFinite(parsedFees) ||
            parsedFees < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Service fees must be a valid number greater than or equal to 0.",
            });
        }

        // ----------------------------------------------------
        // VALIDATE QUANTITY
        // ----------------------------------------------------

        const parsedQuantity =
            quantity === undefined ||
            quantity === null ||
            quantity === ""
                ? 1
                : Number(quantity);

        if (
            !Number.isFinite(parsedQuantity) ||
            parsedQuantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Quantity must be at least 1.",
            });
        }

        // ----------------------------------------------------
        // CALCULATE TOTAL
        // ----------------------------------------------------

        const calculatedTotal =
            parsedFees * parsedQuantity;

        // ----------------------------------------------------
        // FIND BOOKING + ROOM
        // ----------------------------------------------------

        const result = await getBookingRoom(
            bookingId,
            roomId,
            hotelId,
            branchId
        );

        if (!result) {
            const bookingExists =
                await Booking.findOne({
                    _id: bookingId,
                    hotelId,
                    branchId,
                });

            if (!bookingExists) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Booking not found in your branch.",
                });
            }

            return res.status(404).json({
                success: false,
                message:
                    "Selected room is not part of this booking.",
            });
        }

        const {
            booking,
            room,
        } = result;

        // ----------------------------------------------------
        // DO NOT ALLOW SERVICE ON CHECKED-OUT ROOM
        // ----------------------------------------------------

        if (
            room.checkoutStatus ===
            "Checked Out"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot add service to a checked-out room.",
            });
        }

        // ----------------------------------------------------
        // ADD EMBEDDED SERVICE
        // ----------------------------------------------------

        room.roomServices.push({
            serviceId:
                serviceId &&
                isValidObjectId(serviceId)
                    ? serviceId
                    : null,

            name: String(name).trim(),

            fees: parsedFees,

            quantity: parsedQuantity,

            total: calculatedTotal,

            paymentStatus: "Pending",
        });

        // ----------------------------------------------------
        // RECALCULATE TOTAL
        // ----------------------------------------------------

        recalculateRoomServiceTotal(
            booking
        );

        // ----------------------------------------------------
        // SAVE BOOKING
        // ----------------------------------------------------

        await booking.save();

        const addedService =
            room.roomServices[
                room.roomServices.length - 1
            ];

        log(
            "INFO",
            `[ROOM SERVICE] Added | Booking: ${bookingId} | Room: ${room.roomNumber} | Service: ${addedService.name} | Total: ${addedService.total} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(201).json({
            success: true,
            message:
                "Room service added successfully.",
            data: addedService,
            booking,
        });
    } catch (error) {
        log(
            "ERROR",
            `[ROOM SERVICE] Error in addRoomService: ${error.message}`
        );

        console.error(
            "[ROOM SERVICE] addRoomService error:",
            error
        );

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid booking or room ID.",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to add room service right now. Please try again later.",
        });
    }
};

// ============================================================
// 2. GET ALL ROOM SERVICES
// ============================================================
//
// GET
// /api/room-services
//
// Only current hotel + branch.
//
// ============================================================

export const getAllServices = async (
    req,
    res
) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const {
            hotelId,
            branchId,
        } = tenant;

        const bookings =
            await Booking.find({
                hotelId,
                branchId,
                "rooms.roomServices.0": {
                    $exists: true,
                },
            })
                .populate(
                    "customerId",
                    "customerName phoneNumber"
                )
                .sort({
                    updatedAt: -1,
                });

        const services = [];

        bookings.forEach((booking) => {
            booking.rooms.forEach((room) => {
                (room.roomServices || []).forEach(
                    (service) => {
                        services.push(
                            formatRoomService(
                                booking,
                                room,
                                service
                            )
                        );
                    }
                );
            });
        });

        services.sort((a, b) => {
            return (
                new Date(
                    b._id?.getTimestamp?.() || 0
                ) -
                new Date(
                    a._id?.getTimestamp?.() || 0
                )
            );
        });

        log(
            "INFO",
            `[ROOM SERVICE] Services fetched: ${services.length} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            count: services.length,
            data: services,
        });
    } catch (error) {
        log(
            "ERROR",
            `[ROOM SERVICE] Error in getAllServices: ${error.message}`
        );

        console.error(
            "[ROOM SERVICE] getAllServices error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load room services right now. Please try again later.",
        });
    }
};

// ============================================================
// 3. GET SERVICES BY BOOKING
// ============================================================
//
// GET
// /api/bookings/:bookingId/room-services
//
// ============================================================

export const getServicesByBooking = async (
    req,
    res
) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const {
            hotelId,
            branchId,
        } = tenant;

        const { bookingId } = req.params;

        // ----------------------------------------------------
        // VALIDATE BOOKING ID
        // ----------------------------------------------------

        if (
            !bookingId ||
            !isValidObjectId(bookingId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        // ----------------------------------------------------
        // FIND BOOKING INSIDE CURRENT TENANT
        // ----------------------------------------------------

        const booking =
            await Booking.findOne({
                _id: bookingId,
                hotelId,
                branchId,
            }).populate(
                "customerId",
                "customerName phoneNumber email"
            );

        if (!booking) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking not found in your branch.",
            });
        }

        const services = [];

        booking.rooms.forEach((room) => {
            (room.roomServices || []).forEach(
                (service) => {
                    services.push(
                        formatRoomService(
                            booking,
                            room,
                            service
                        )
                    );
                }
            );
        });

        log(
            "INFO",
            `[ROOM SERVICE] Booking services fetched | Booking: ${bookingId} | Count: ${services.length} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            count: services.length,
            data: services,
        });
    } catch (error) {
        log(
            "ERROR",
            `[ROOM SERVICE] Error in getServicesByBooking: ${error.message}`
        );

        console.error(
            "[ROOM SERVICE] getServicesByBooking error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load booking room services right now. Please try again later.",
        });
    }
};

// ============================================================
// 4. UPDATE EMBEDDED ROOM SERVICE
// ============================================================
//
// PUT
// /api/bookings/:bookingId/rooms/:roomId/room-service/:serviceId
//
// ============================================================

export const updateRoomService = async (
    req,
    res
) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const {
            hotelId,
            branchId,
        } = tenant;

        const {
            bookingId,
            roomId,
            serviceId,
        } = req.params;

        // ----------------------------------------------------
        // VALIDATE IDS
        // ----------------------------------------------------

        if (!isValidObjectId(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        if (!isValidObjectId(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID.",
            });
        }

        if (!isValidObjectId(serviceId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID.",
            });
        }

        // ----------------------------------------------------
        // FIND BOOKING + ROOM INSIDE TENANT
        // ----------------------------------------------------

        const result = await getBookingRoom(
            bookingId,
            roomId,
            hotelId,
            branchId
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking or room was not found in your branch.",
            });
        }

        const {
            booking,
            room,
        } = result;

        // ----------------------------------------------------
        // FIND EMBEDDED SERVICE
        // ----------------------------------------------------

        const service =
            room.roomServices.id(serviceId);

        if (!service) {
            return res.status(404).json({
                success: false,
                message:
                    "Room service was not found.",
            });
        }

        // ----------------------------------------------------
        // DO NOT UPDATE CHECKED-OUT ROOM
        // ----------------------------------------------------

        if (
            room.checkoutStatus ===
            "Checked Out"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot update service for a checked-out room.",
            });
        }

        const {
            name,
            fees,
            quantity,
            paymentStatus,
        } = req.body;

        // ----------------------------------------------------
        // NAME
        // ----------------------------------------------------

        if (name !== undefined) {
            if (!String(name).trim()) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Service name cannot be empty.",
                });
            }

            service.name =
                String(name).trim();
        }

        // ----------------------------------------------------
        // FEES
        // ----------------------------------------------------

        if (fees !== undefined) {
            const parsedFees =
                Number(fees);

            if (
                !Number.isFinite(
                    parsedFees
                ) ||
                parsedFees < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Service fees must be a valid number greater than or equal to 0.",
                });
            }

            service.fees =
                parsedFees;
        }

        // ----------------------------------------------------
        // QUANTITY
        // ----------------------------------------------------

        if (quantity !== undefined) {
            const parsedQuantity =
                Number(quantity);

            if (
                !Number.isFinite(
                    parsedQuantity
                ) ||
                parsedQuantity < 1
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Quantity must be at least 1.",
                });
            }

            service.quantity =
                parsedQuantity;
        }

        // ----------------------------------------------------
        // PAYMENT STATUS
        // ----------------------------------------------------

        if (
            paymentStatus !== undefined
        ) {
            if (
                ![
                    "Pending",
                    "Paid",
                ].includes(paymentStatus)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Payment status must be either Pending or Paid.",
                });
            }

            service.paymentStatus =
                paymentStatus;
        }

        // ----------------------------------------------------
        // RECALCULATE SERVICE TOTAL
        // ----------------------------------------------------

        service.total =
            Number(service.fees || 0) *
            Number(service.quantity || 1);

        // ----------------------------------------------------
        // RECALCULATE BOOKING TOTAL
        // ----------------------------------------------------

        recalculateRoomServiceTotal(
            booking
        );

        await booking.save();

        log(
            "INFO",
            `[ROOM SERVICE] Updated | Booking: ${bookingId} | Room: ${room.roomNumber} | Service: ${service.name} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Room service updated successfully.",
            data: service,
        });
    } catch (error) {
        log(
            "ERROR",
            `[ROOM SERVICE] Error in updateRoomService: ${error.message}`
        );

        console.error(
            "[ROOM SERVICE] updateRoomService error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update room service right now. Please try again later.",
        });
    }
};

// ============================================================
// 5. DELETE EMBEDDED ROOM SERVICE
// ============================================================
//
// DELETE
// /api/bookings/:bookingId/rooms/:roomId/room-service/:serviceId
//
// ============================================================

export const deleteRoomService = async (
    req,
    res
) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const {
            hotelId,
            branchId,
        } = tenant;

        const {
            bookingId,
            roomId,
            serviceId,
        } = req.params;

        // ----------------------------------------------------
        // VALIDATE IDS
        // ----------------------------------------------------

        if (!isValidObjectId(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        if (!isValidObjectId(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID.",
            });
        }

        if (!isValidObjectId(serviceId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid service ID.",
            });
        }

        // ----------------------------------------------------
        // FIND BOOKING + ROOM INSIDE TENANT
        // ----------------------------------------------------

        const result = await getBookingRoom(
            bookingId,
            roomId,
            hotelId,
            branchId
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking or room was not found in your branch.",
            });
        }

        const {
            booking,
            room,
        } = result;

        // ----------------------------------------------------
        // FIND SERVICE
        // ----------------------------------------------------

        const service =
            room.roomServices.id(serviceId);

        if (!service) {
            return res.status(404).json({
                success: false,
                message:
                    "Room service was not found.",
            });
        }

        // ----------------------------------------------------
        // DO NOT DELETE PAID SERVICE
        // ----------------------------------------------------

        if (
            service.paymentStatus ===
            "Paid"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Paid room service cannot be deleted.",
            });
        }

        // ----------------------------------------------------
        // DELETE SERVICE
        // ----------------------------------------------------

        service.deleteOne();

        // ----------------------------------------------------
        // RECALCULATE TOTAL
        // ----------------------------------------------------

        recalculateRoomServiceTotal(
            booking
        );

        await booking.save();

        log(
            "INFO",
            `[ROOM SERVICE] Deleted | Booking: ${bookingId} | Room: ${room.roomNumber} | Service: ${serviceId} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Room service deleted successfully.",
        });
    } catch (error) {
        log(
            "ERROR",
            `[ROOM SERVICE] Error in deleteRoomService: ${error.message}`
        );

        console.error(
            "[ROOM SERVICE] deleteRoomService error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete room service right now. Please try again later.",
        });
    }
};

// ============================================================
// 6. MARK ALL ROOM SERVICES FOR ONE ROOM AS PAID
// ============================================================
//
// PATCH
// /api/bookings/:bookingId/rooms/:roomId/room-service/paid
//
// ============================================================

export const markRoomServicesPaid = async (
    req,
    res
) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const {
            hotelId,
            branchId,
        } = tenant;

        const {
            bookingId,
            roomId,
        } = req.params;

        // ----------------------------------------------------
        // VALIDATE IDS
        // ----------------------------------------------------

        if (!isValidObjectId(bookingId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid booking ID.",
            });
        }

        if (!isValidObjectId(roomId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid room ID.",
            });
        }

        // ----------------------------------------------------
        // FIND BOOKING + ROOM INSIDE TENANT
        // ----------------------------------------------------

        const result = await getBookingRoom(
            bookingId,
            roomId,
            hotelId,
            branchId
        );

        if (!result) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking or room was not found in your branch.",
            });
        }

        const {
            booking,
            room,
        } = result;

        // ----------------------------------------------------
        // DO NOT MODIFY CHECKED-OUT ROOM
        // ----------------------------------------------------

        if (
            room.checkoutStatus ===
            "Checked Out"
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Cannot update services for a checked-out room.",
            });
        }

        let changedCount = 0;

        // ----------------------------------------------------
        // MARK PENDING SERVICES AS PAID
        // ----------------------------------------------------

        (room.roomServices || []).forEach(
            (service) => {
                if (
                    service.paymentStatus ===
                    "Pending"
                ) {
                    service.paymentStatus =
                        "Paid";

                    changedCount++;
                }
            }
        );

        await booking.save();

        log(
            "INFO",
            `[ROOM SERVICE] Marked as paid | Booking: ${bookingId} | Room: ${room.roomNumber} | Changed: ${changedCount} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message:
                `${changedCount} room service item(s) marked as Paid.`,
            changedCount,
            data: room.roomServices,
        });
    } catch (error) {
        log(
            "ERROR",
            `[ROOM SERVICE] Error in markRoomServicesPaid: ${error.message}`
        );

        console.error(
            "[ROOM SERVICE] markRoomServicesPaid error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to mark room services as paid right now. Please try again later.",
        });
    }
};