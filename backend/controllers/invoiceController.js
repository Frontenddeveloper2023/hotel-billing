import mongoose from "mongoose";

import Invoice from "../models/invoice.js";
import InvoiceCounter from "../models/InvoiceCounter.js";
import Customer from "../models/customers.js";
import Hotels from "../models/hotels.js";
import BranchHotels from "../models/branchHotels.js";
import CheckoutBill from "../models/checkoutBill.js";
import Booking from "../models/booking.js";



import { log } from "../util/logger.js";

// ============================================================
// HELPERS
// ============================================================

const isValidObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

const roundMoney = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Number(number.toFixed(2));
};

const normalizeNumber = (value, fallback = 0) => {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
};

const normalizeString = (value, fallback = "") => {
    if (value === undefined || value === null) {
        return fallback;
    }

    return String(value).trim();
};

// ============================================================
// TENANT VALIDATION
// ============================================================
//
// hotelId and branchId always come from req.user.
//
// Never trust hotelId or branchId from:
// - req.body
// - req.query
// - req.params
//
// ============================================================

const getTenantIds = (
    req,
    res,
    operation = "invoice operation"
) => {
    const hotelId = req.user?.hotelId;
    const branchId = req.user?.branchId;

    if (!hotelId) {
        log.error(
            `[Invoice] ${operation} rejected. ` +
            `Authenticated user is not connected to a hotel. ` +
            `userId=${req.user?._id || "unknown"}`
        );

        res.status(403).json({
            success: false,
            message:
                "Your account is not connected to a hotel. Please contact the administrator.",
        });

        return null;
    }

    if (!branchId) {
        log.error(
            `[Invoice] ${operation} rejected. ` +
            `Authenticated user is not connected to a branch. ` +
            `hotelId=${hotelId}, ` +
            `userId=${req.user?._id || "unknown"}`
        );

        res.status(403).json({
            success: false,
            message:
                "Your account is not connected to a branch. Please contact the administrator.",
        });

        return null;
    }

    if (!isValidObjectId(hotelId)) {
        log.error(
            `[Invoice] ${operation} rejected. ` +
            `Invalid hotelId received from authenticated user. ` +
            `hotelId=${hotelId}, ` +
            `userId=${req.user?._id || "unknown"}`
        );

        res.status(403).json({
            success: false,
            message:
                "Your hotel information is invalid. Please contact the administrator.",
        });

        return null;
    }

    if (!isValidObjectId(branchId)) {
        log.error(
            `[Invoice] ${operation} rejected. ` +
            `Invalid branchId received from authenticated user. ` +
            `branchId=${branchId}, ` +
            `hotelId=${hotelId}`
        );

        res.status(403).json({
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
// COMMON ERROR HANDLER
// ============================================================

const handleControllerError = (
    res,
    error,
    operation,
    context = {}
) => {
    log.error(
        `[Invoice] ${operation} failed. ` +
        `context=${JSON.stringify(context)}, ` +
        `error=${error?.message || error}`
    );

    if (error?.code === 11000) {
        log.error(
            `[Invoice] Duplicate invoice data detected. ` +
            `operation=${operation}, ` +
            `keyValue=${JSON.stringify(
                error?.keyValue || {}
            )}`
        );

        return res.status(409).json({
            success: false,
            message:
                "This invoice number already exists. Please try again.",
        });
    }

    if (error?.name === "ValidationError") {
        const messages = Object.values(
            error.errors || {}
        )
            .map((item) => item.message)
            .filter(Boolean);

        log.error(
            `[Invoice] Validation error. ` +
            `operation=${operation}, ` +
            `messages=${messages.join(" | ")}`
        );

        return res.status(400).json({
            success: false,
            message:
                messages.length > 0
                    ? messages.join(" ")
                    : "Some invoice information is invalid. Please check the invoice details.",
        });
    }

    if (error?.name === "CastError") {
        log.error(
            `[Invoice] Invalid MongoDB identifier. ` +
            `operation=${operation}, ` +
            `path=${error?.path || "unknown"}, ` +
            `value=${error?.value || "unknown"}`
        );

        return res.status(400).json({
            success: false,
            message:
                "One of the provided IDs is invalid. Please refresh the page and try again.",
        });
    }

    return res.status(500).json({
        success: false,
        message:
            "Something went wrong while processing the invoice. Please try again later.",
    });
};

// ============================================================
// GENERATE INVOICE NUMBER
// ============================================================
// RESOLVE UNIQUE HOTEL CODE
// ============================================================

const generateHotelCode = (hotelName) => {
    const raw = String(hotelName || "HOTEL").trim();
    const clean = raw.replace(/[^A-Za-z0-9 ]/g, "").trim();
    const words = clean.split(/\s+/).filter(Boolean);

    let code = "";
    if (words.length >= 2) {
        const first = words[0].toUpperCase();
        if (first.length >= 3 && first !== "THE" && first !== "HOTEL") {
            code = first.slice(0, 6);
        } else {
            code = words.map((w) => w[0]).join("").toUpperCase().slice(0, 5);
        }
    } else if (words.length === 1) {
        code = words[0].slice(0, 6).toUpperCase();
    }

    if (!code || code.length < 2) {
        code = "HTL";
    }

    return code;
};

const resolveHotelCode = async (hotelId) => {
    try {
        const hotel = await Hotels.findById(hotelId);
        if (!hotel) {
            return "HTL";
        }

        if (hotel.hotelCode && String(hotel.hotelCode).trim()) {
            return String(hotel.hotelCode).trim().toUpperCase();
        }

        let baseCode = generateHotelCode(hotel.hotelName);

        // Check if another hotel already has this hotelCode
        const existing = await Hotels.findOne({
            _id: { $ne: hotel._id },
            hotelCode: baseCode,
        });

        if (existing) {
            const suffix = String(hotel._id).slice(-4).toUpperCase();
            baseCode = `${baseCode}${suffix}`;
        }

        // Persist hotelCode on the hotel document so it stays constant
        hotel.hotelCode = baseCode;
        await hotel.save();

        log.info(
            `[Invoice] Assigned unique hotelCode: ${baseCode} to hotel: ${hotel.hotelName} (${hotel._id})`
        );

        return baseCode;
    } catch (err) {
        log.error(`[Invoice] Error resolving hotelCode: ${err.message}`);
        return "HTL";
    }
};

// ============================================================
// RESOLVE UNIQUE BRANCH CODE
// ============================================================

const resolveBranchCode = async (branchId) => {
    let branchCode = "MAIN";

    try {
        const branch = await BranchHotels.findById(branchId)
            .select("branchCode branchName isMainBranch")
            .lean();

        if (branch?.branchCode && String(branch.branchCode).trim()) {
            branchCode = String(branch.branchCode).trim().toUpperCase();
        } else if (branch?.isMainBranch) {
            branchCode = "MAIN";
        } else if (branch?.branchName && String(branch.branchName).trim()) {
            const clean = String(branch.branchName)
                .replace(/[^A-Za-z0-9]/g, "")
                .slice(0, 5)
                .toUpperCase();
            branchCode = clean || "SUB";
        }
    } catch (error) {
        log.warn(
            `[Invoice] Unable to resolve branch code. branchId=${branchId}, error=${error.message}`
        );
    }

    return branchCode;
};

// ============================================================
// GENERATE UNIQUE INVOICE NUMBER
//
// Sequence is scoped by: hotelId + branchId + year
//
// Format:
// INV-[HOTEL_CODE]-[BRANCH_CODE]-[YEAR]-[SEQUENCE]
//
// Example:
// INV-TEST-MAIN-2026-000001
// INV-TEST-BR1-2026-000001
// INV-MANI-MAIN-2026-000001
//
// ============================================================

const generateInvoiceNumber = async (
    hotelId,
    branchId
) => {
    const year = new Date().getFullYear();

    log.info(
        `[Invoice] Starting invoice number generation. ` +
        `hotelId=${hotelId}, ` +
        `branchId=${branchId}, ` +
        `year=${year}`
    );

    const hotelCode = await resolveHotelCode(hotelId);
    const branchCode = await resolveBranchCode(branchId);

    log.info(
        `[Invoice] Codes resolved: hotelCode=${hotelCode}, branchCode=${branchCode}`
    );

    const latestInvoice =
        await Invoice.findOne({
            hotelId,
            branchId,
            invoiceYear: year,
        })
            .sort({
                invoiceSequence: -1,
            })
            .select("invoiceSequence")
            .lean();

    const highestExistingSequence =
        Number(
            latestInvoice?.invoiceSequence || 0
        );

    log.info(
        `[Invoice] Existing invoice sequence checked. ` +
        `highestExistingSequence=${highestExistingSequence}`
    );

    let counter =
        await InvoiceCounter.findOne({
            hotelId,
            branchId,
            year,
        });

    if (!counter) {
        counter =
            await InvoiceCounter.create({
                hotelId,
                branchId,
                year,
                sequence:
                    highestExistingSequence,
            });

        log.info(
            `[Invoice] Invoice counter created. ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}, ` +
            `year=${year}, ` +
            `sequence=${counter.sequence}`
        );
    }

    if (
        Number(counter.sequence) <
        highestExistingSequence
    ) {
        counter.sequence =
            highestExistingSequence;

        await counter.save();

        log.info(
            `[Invoice] Invoice counter synchronized. ` +
            `sequence=${counter.sequence}`
        );
    }

    const updatedCounter =
        await InvoiceCounter.findOneAndUpdate(
            {
                hotelId,
                branchId,
                year,
            },
            {
                $inc: {
                    sequence: 1,
                },
            },
            {
                new: true,
                upsert: true,
            }
        );

    if (!updatedCounter) {
        log.error(
            `[Invoice] Invoice counter update failed. ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}, ` +
            `year=${year}`
        );

        throw new Error(
            "Unable to generate invoice number."
        );
    }

    const invoiceSequence =
        Number(
            updatedCounter.sequence
        );

    // Format: INV-[HOTEL_CODE]-[BRANCH_CODE]-[YEAR]-[SEQUENCE]
    const invoiceNo =
        `INV-${hotelCode}-${branchCode}-${year}-${String(
            invoiceSequence
        ).padStart(6, "0")}`;

    log.info(
        `[Invoice] Invoice number generated successfully. ` +
        `invoiceNo=${invoiceNo}, ` +
        `hotelCode=${hotelCode}, ` +
        `branchCode=${branchCode}, ` +
        `invoiceYear=${year}, ` +
        `invoiceSequence=${invoiceSequence}`
    );

    return {
        invoiceNo,
        invoiceYear: year,
        invoiceSequence,
    };
};

// ============================================================
// FORMAT INVOICE DATE
// ============================================================

const formatInvoiceDate = (
    date = new Date()
) => {
    return new Intl.DateTimeFormat(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    ).format(date);
};

// ============================================================
// NORMALIZE ROOM DATA
// ============================================================
//
// This function creates the room snapshot stored inside
// the invoice.
//
// bookedNights comes from the backend checkout calculation.
// It is NOT calculated from frontend price values.
//
// ============================================================

const normalizeRoom = (room) => {
    return {
        roomNumber: normalizeString(
            room?.roomNumber
        ),

        roomType: normalizeString(
            room?.roomType
        ),

        bedType: normalizeString(
            room?.bedType
        ),

        perNightRoomPrice:
            roundMoney(
                room?.perNightRoomPrice ??
                    room?.pricePerNight ??
                    room?.roomPrice ??
                    0
            ),

        adults: Math.max(
            0,
            Math.floor(
                normalizeNumber(
                    room?.adults
                )
            )
        ),

        children: Math.max(
            0,
            Math.floor(
                normalizeNumber(
                    room?.children
                )
            )
        ),

        bookedNights: Math.max(
            0,
            Math.floor(
                normalizeNumber(
                    room?.bookedNights ??
                        room?.nights ??
                        0
                )
            )
        ),

        roomRent: roundMoney(
            room?.roomRent ??
                room?.baseRoomRent ??
                0
        ),

        checkoutPolicyCharge:
            roundMoney(
                room?.checkoutPolicyCharge ??
                    room?.checkoutPolicyAmount ??
                    0
            ),

        checkoutPolicyType:
            normalizeString(
                room?.checkoutPolicyType
            ),

        checkoutPolicyValue:
            normalizeNumber(
                room?.checkoutPolicyValue
            ),
    };
};

// ============================================================
// NORMALIZE FOOD SERVICES
// ============================================================

const normalizeFoodServices = (
    foodServices
) => {
    if (!Array.isArray(foodServices)) {
        return [];
    }

    return foodServices.map(
        (food) => ({
            foodId:
                food?.foodId ||
                food?._id ||
                null,

            name: normalizeString(
                food?.name ??
                    food?.foodName
            ),

            price: roundMoney(
                food?.price ??
                    food?.foodPrice ??
                    0
            ),

            quantity: Math.max(
                0,
                normalizeNumber(
                    food?.quantity ??
                        food?.qty ??
                        1
                )
            ),

            total: roundMoney(
                food?.total ??
                    food?.totalPrice ??
                    0
            ),
        })
    );
};

// ============================================================
// NORMALIZE ROOM SERVICES
// ============================================================

const normalizeRoomServices = (
    services
) => {
    if (!Array.isArray(services)) {
        return [];
    }

    return services.map(
        (service) => ({
            serviceId:
                service?.serviceId ||
                service?._id ||
                null,

            name: normalizeString(
                service?.name ??
                    service?.serviceName
            ),

            fees: roundMoney(
                service?.fees ??
                    service?.serviceFees ??
                    service?.fee ??
                    service?.amount ??
                    0
            ),

            quantity: Math.max(
                0,
                normalizeNumber(
                    service?.quantity ??
                        1
                )
            ),

            total: roundMoney(
                service?.total ??
                    service?.serviceFees ??
                    service?.fees ??
                    service?.fee ??
                    service?.amount ??
                    0
            ),
        })
    );
};

// ============================================================
// 1. CREATE INVOICE
// ============================================================

export const createInvoice = async (req, res) => {
    let tenant = null;

    try {
        log.info(
            `[Invoice] Create invoice request received. ` +
            `userId=${req.user?._id || "unknown"}`
        );

        // ========================================================
        // TENANT
        // ========================================================

        tenant = getTenantIds(
            req,
            res,
            "create invoice"
        );

        if (!tenant) {
            return;
        }

        const {
            hotelId,
            branchId,
        } = tenant;

        log.info(
            `[Invoice] Tenant verified. ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}, ` +
            `userId=${req.user?._id || "unknown"}`
        );

        // ========================================================
        // REQUEST DATA
        // ========================================================

        const {
            checkoutBillId,
            bookingIds,
            paymentMode,
        } = req.body;

        // ========================================================
        // CHECKOUT BILL ID VALIDATION
        // ========================================================

        if (!checkoutBillId) {
            log.warn(
                `[Invoice] Create rejected. ` +
                `checkoutBillId is missing. ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Checkout bill ID is required.",
            });
        }

        if (!isValidObjectId(checkoutBillId)) {
            log.warn(
                `[Invoice] Create rejected. ` +
                `Invalid checkoutBillId=${checkoutBillId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "The checkout bill ID is invalid.",
            });
        }

        // ========================================================
        // FETCH CHECKOUT BILL
        // ========================================================

        log.info(
            `[Invoice] Fetching CheckoutBill. ` +
            `checkoutBillId=${checkoutBillId}, ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}`
        );

        const checkoutBill =
            await CheckoutBill.findOne({
                _id: checkoutBillId,
                hotelId,
                branchId,
            }).lean();

        if (!checkoutBill) {
            log.warn(
                `[Invoice] CheckoutBill not found. ` +
                `checkoutBillId=${checkoutBillId}, ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "Checkout bill not found in your branch.",
            });
        }

        // ========================================================
        // BOOKING IDS VALIDATION
        // ========================================================

        if (
            !Array.isArray(bookingIds) ||
            bookingIds.length === 0
        ) {
            log.warn(
                `[Invoice] Create rejected. ` +
                `No booking IDs supplied.`
            );

            return res.status(400).json({
                success: false,
                message:
                    "At least one booking ID is required.",
            });
        }

        const validBookingIds =
            bookingIds.filter((id) =>
                isValidObjectId(id)
            );

        if (
            validBookingIds.length !==
            bookingIds.length
        ) {
            log.warn(
                `[Invoice] Create rejected. ` +
                `One or more booking IDs are invalid.`
            );

            return res.status(400).json({
                success: false,
                message:
                    "One or more booking IDs are invalid.",
            });
        }

        // ========================================================
        // FETCH BOOKINGS
        // ========================================================

        log.info(
            `[Invoice] Fetching bookings. ` +
            `bookingCount=${validBookingIds.length}, ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}`
        );

        const bookings =
            await Booking.find({
                _id: {
                    $in: validBookingIds,
                },
                hotelId,
                branchId,
            }).lean();

        if (
            bookings.length !==
            validBookingIds.length
        ) {
            log.warn(
                `[Invoice] Booking ownership validation failed. ` +
                `requested=${validBookingIds.length}, ` +
                `found=${bookings.length}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "One or more bookings were not found in your branch.",
            });
        }

        log.info(
            `[Invoice] CheckoutBill and Booking data loaded successfully. ` +
            `checkoutBillId=${checkoutBillId}, ` +
            `bookingCount=${bookings.length}`
        );

        // ========================================================
        // PRIMARY BOOKING
        // ========================================================

        const primaryBooking =
            bookings[0];

        if (!primaryBooking) {
            return res.status(404).json({
                success: false,
                message:
                    "Booking data is required to create the invoice.",
            });
        }

        // ========================================================
        // CUSTOMER
        // ========================================================

        const customerId =
            primaryBooking.customerId ||
            checkoutBill.customer ||
            null;

        if (
            !customerId ||
            !isValidObjectId(customerId)
        ) {
            log.warn(
                `[Invoice] Invalid customer ID. ` +
                `customerId=${customerId || "none"}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Customer information is invalid.",
            });
        }

        log.info(
            `[Invoice] Fetching customer. ` +
            `customerId=${customerId}`
        );

        const customer =
            await Customer.findOne({
                _id: customerId,
                hotelId,
                branchId,
            }).lean();

        if (!customer) {
            log.warn(
                `[Invoice] Customer not found. ` +
                `customerId=${customerId}, ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "Customer not found in your branch.",
            });
        }

        const customerName =
            normalizeString(
                customer.customerName
            ) || "Guest";

        const phoneNumber =
            normalizeString(
                customer.phoneNumber
            );

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message:
                    "Customer phone number is required.",
            });
        }

        // ========================================================
        // ROOMS FROM BOOKING DB
        // ========================================================

        const bookingRooms =
            bookings.flatMap(
                (booking) =>
                    Array.isArray(
                        booking.rooms
                    )
                        ? booking.rooms.map(
                              (room) => ({
                                  bookingId:
                                      booking._id,

                                  roomId:
                                      room.roomId ||
                                      null,

                                  roomNumber:
                                      normalizeString(
                                          room.roomNumber
                                      ),

                                  roomType:
                                      normalizeString(
                                          room.roomType
                                      ),

                                  bedType:
                                      normalizeString(
                                          room.bedType
                                      ),

                                  perNightRoomPrice:
                                      roundMoney(
                                          room.pricePerNight
                                      ),

                                  adults:
                                      Math.max(
                                          0,
                                          Math.floor(
                                              normalizeNumber(
                                                  room.adults
                                              )
                                          )
                                      ),

                                  children:
                                      Math.max(
                                          0,
                                          Math.floor(
                                              normalizeNumber(
                                                  room.children
                                              )
                                          )
                                      ),

                                  checkIn:
                                      room.checkIn ||
                                      null,

                                  checkInTime:
                                      normalizeString(
                                          room.checkInTime
                                      ),

                                  checkOut:
                                      room.checkOut ||
                                      null,

                                  checkOutTime:
                                      normalizeString(
                                          room.checkOutTime
                                      ),

                                  actualCheckoutDate:
                                      normalizeString(
                                          room.actualCheckoutDate
                                      ),

                                  actualCheckoutTime:
                                      normalizeString(
                                          room.actualCheckoutTime
                                      ),

                                  foodServicesDetails: normalizeFoodServices(room.foodServices),

                                 roomServicesDetails: normalizeRoomServices(room.roomServices),
                              })
                          )
                        : []
            );

        if (
            bookingRooms.length === 0
        ) {
            log.warn(
                `[Invoice] No rooms found in booking. ` +
                `bookingId=${primaryBooking._id}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "At least one room is required for the invoice.",
            });
        }

        // ========================================================
        // CHECKOUT BILL - ROOM BILLING
        // ========================================================

        const bookedNights =
            Math.max(
                0,
                Math.floor(
                    normalizeNumber(
                        checkoutBill
                            ?.roomBilling
                            ?.nights
                    )
                )
            );

        const roomSubtotal =
            roundMoney(
                checkoutBill
                    ?.roomBilling
                    ?.roomSubtotal
            );

        const checkoutPolicy =
            checkoutBill
                ?.roomBilling
                ?.checkoutPolicy || {};

        const checkoutPolicyCharge =
            roundMoney(
                checkoutPolicy.amount
            );

        const checkoutPolicyType =
            normalizeString(
                checkoutPolicy.type
            );

        const checkoutPolicyValue =
            normalizeNumber(
                checkoutPolicy.policyValue
            );

        // ========================================================
        // EXTRA FULL DAY
        // ========================================================

        const extraFullDays =
            Math.max(
                0,
                Math.floor(
                    normalizeNumber(
                        checkoutBill
                            ?.roomExtraStay
                            ?.extraDayStay
                            ?.numberOfDays
                    )
                )
            );

        const extraFullDayCharge =
            roundMoney(
                checkoutBill
                    ?.roomExtraStay
                    ?.extraDayStay
                    ?.amount
            );

        // ========================================================
        // FOOD / ROOM SERVICE
        // ========================================================

        const foodTotal =
            roundMoney(
                checkoutBill?.foodTotal
            );

        const roomServiceTotal =
            roundMoney(
                checkoutBill
                    ?.roomServiceTotal
            );

        // ========================================================
        // GST
        // ========================================================

        const gstAmount =
            roundMoney(
                checkoutBill?.gst
            );

        const taxableSubtotal =
            roundMoney(
                roomSubtotal +
                    foodTotal +
                    roomServiceTotal
            );

        const gstPercentage =
            taxableSubtotal > 0
                ? roundMoney(
                      (
                          gstAmount /
                          taxableSubtotal
                      ) * 100
                  )
                : 0;

        // ========================================================
        // GRAND TOTAL
        // ========================================================

        const grandTotal =
            roundMoney(
                checkoutBill?.grandTotal
            );

        // ========================================================
        // BASE ROOM RENT
        // ========================================================
        //
        // roomSubtotal already includes:
        //
        // Base room rent
        // + extra full day
        // + checkout policy
        //
        // Therefore remove those extra charges here.
        //
        // ========================================================

        const baseRoomRent =
            Math.max(
                0,
                roundMoney(
                    roomSubtotal -
                        extraFullDayCharge -
                        checkoutPolicyCharge
                )
            );

        // ========================================================
        // FINAL PAYMENTS FROM BOOKING DB
        // ========================================================

        const allPayments =
            bookings.flatMap(
                (booking) =>
                    Array.isArray(
                        booking.payments
                    )
                        ? booking.payments
                        : []
            );

        const initialPaid =
            roundMoney(
                bookings.reduce(
                    (
                        total,
                        booking
                    ) =>
                        total +
                        normalizeNumber(
                            booking.initialPaidAmount
                        ),
                    0
                )
            );

        const checkoutPayment =
            roundMoney(
                allPayments
                    .filter(
                        (payment) =>
                            payment?.paymentType ===
                            "Checkout"
                    )
                    .reduce(
                        (
                            total,
                            payment
                        ) =>
                            total +
                            normalizeNumber(
                                payment.amount
                            ),
                        0
                    )
            );

        const servicePayment =
            roundMoney(
                allPayments
                    .filter(
                        (payment) =>
                            payment?.paymentType ===
                            "Service"
                    )
                    .reduce(
                        (
                            total,
                            payment
                        ) =>
                            total +
                            normalizeNumber(
                                payment.amount
                            ),
                        0
                    )
            );

        const otherPayment =
            roundMoney(
                allPayments
                    .filter(
                        (payment) =>
                            payment?.paymentType ===
                            "Other"
                    )
                    .reduce(
                        (
                            total,
                            payment
                        ) =>
                            total +
                            normalizeNumber(
                                payment.amount
                            ),
                        0
                    )
            );

        const paymentsTotal =
            roundMoney(
                allPayments.reduce(
                    (
                        total,
                        payment
                    ) =>
                        total +
                        normalizeNumber(
                            payment.amount
                        ),
                    0
                )
            );

        const bookingFinancialTotal =
            roundMoney(
                bookings.reduce(
                    (
                        total,
                        booking
                    ) =>
                        total +
                        normalizeNumber(
                            booking
                                ?.financials
                                ?.totalPaid
                        ),
                    0
                )
            );

        const totalPaid =
            paymentsTotal > 0
                ? paymentsTotal
                : bookingFinancialTotal;

        // ========================================================
        // CURRENT PAYMENT
        // ========================================================

        const currentPayment =
            roundMoney(
                checkoutPayment +
                    servicePayment +
                    otherPayment
            );

        // ========================================================
        // BALANCE
        // ========================================================

        const balanceDue =
            Math.max(
                0,
                roundMoney(
                    grandTotal -
                        totalPaid
                )
            );

        // ========================================================
        // ROOM SNAPSHOT
        // ========================================================

        const roomCount =
            bookingRooms.length;

        const roomNightsPerRoom =
            roomCount > 0
                ? Math.floor(
                      bookedNights /
                          roomCount
                  )
                : 0;

        let remainingNights =
            bookedNights;

        let remainingRoomRent =
            baseRoomRent;

        const formattedRooms =
            bookingRooms.map(
                (room, index) => {
                    let nights;

                    if (
                        index ===
                        roomCount - 1
                    ) {
                        nights =
                            remainingNights;
                    } else {
                        nights =
                            roomNightsPerRoom;
                    }

                    nights =
                        Math.max(
                            0,
                            nights
                        );

                    let roomRent;

                    if (
                        index ===
                        roomCount - 1
                    ) {
                        roomRent =
                            roundMoney(
                                remainingRoomRent
                            );
                    } else {
                        roomRent =
                            roundMoney(
                                room.perNightRoomPrice *
                                    nights
                            );
                    }

                    remainingNights =
                        Math.max(
                            0,
                            remainingNights -
                                nights
                        );

                    remainingRoomRent =
                        Math.max(
                            0,
                            roundMoney(
                                remainingRoomRent -
                                    roomRent
                            )
                        );

                    return {
                        ...room,

                        bookedNights:
                            nights,

                        roomRent,

                        checkoutPolicyCharge:
                            index ===
                            roomCount - 1
                                ? checkoutPolicyCharge
                                : 0,

                        checkoutPolicyType:
                            index ===
                            roomCount - 1
                                ? checkoutPolicyType
                                : "",

                        checkoutPolicyValue:
                            index ===
                            roomCount - 1
                                ? checkoutPolicyValue
                                : 0,
                    };
                }
            );

        // ========================================================
        // INVOICE ITEMS
        // ========================================================

        const invoiceItems = [];

        formattedRooms.forEach(
            (room, index) => {
                const nights =
                    Math.max(
                        0,
                        Math.floor(
                            normalizeNumber(
                                room.bookedNights
                            )
                        )
                    );

                const unitPrice =
                    roundMoney(
                        room.perNightRoomPrice
                    );

                const total =
                    roundMoney(
                        unitPrice *
                            nights
                    );

                invoiceItems.push({
                    description:
                        `Room Rent - ${
                            room.roomNumber ||
                            index + 1
                        } (${
                            room.roomType ||
                            "Room"
                        } - ${nights} ${
                            nights === 1
                                ? "Night"
                                : "Nights"
                        })`,

                    unitPrice,

                    quantity:
                        nights,

                    total,
                });
            }
        );

        // ========================================================
        // EXTRA FULL DAY ITEM
        // ========================================================

        if (
            extraFullDays > 0 &&
            extraFullDayCharge > 0
        ) {
            invoiceItems.push({
                description:
                    "Extra Full Day Stay",

                unitPrice:
                    roundMoney(
                        extraFullDayCharge /
                            extraFullDays
                    ),

                quantity:
                    extraFullDays,

                total:
                    extraFullDayCharge,
            });
        }

        // ========================================================
        // CHECKOUT POLICY ITEM
        // ========================================================

        if (
            checkoutPolicyCharge > 0
        ) {
            let policyLabel =
                "Checkout Time Policy";

            if (
                checkoutPolicyType ===
                "before12PM"
            ) {
                policyLabel =
                    "Checkout Time Policy - Before 12 PM";
            }

            if (
                checkoutPolicyType ===
                "after12PM"
            ) {
                policyLabel =
                    "Checkout Time Policy - After 12 PM";
            }

            invoiceItems.push({
                description:
                    policyLabel,

                unitPrice:
                    checkoutPolicyCharge,

                quantity: 1,

                total:
                    checkoutPolicyCharge,
            });
        }

        // ========================================================
        // SERVICES
        // ========================================================

        const foodServicesDetails =
            formattedRooms.flatMap(
                (room) =>
                    Array.isArray(
                        room.foodServices
                    )
                        ? room.foodServices
                        : []
            );

        const roomServicesDetails =
            formattedRooms.flatMap(
                (room) =>
                    Array.isArray(
                        room.roomServices
                    )
                        ? room.roomServices
                        : []
            );

        // ========================================================
        // STAY DETAILS
        // ========================================================
        //
        // IMPORTANT:
        // Booking DB is the source for:
        //
        // check-in date
        // check-in time
        // expected checkout date
        // expected checkout time
        // actual checkout date
        // actual checkout time
        //
        // ========================================================

        const firstRoom =
            formattedRooms[0];

        const expectedCheckoutDate =
            checkoutBill
                ?.roomBilling
                ?.expectedCheckoutDate ||
            firstRoom?.checkOut ||
            null;

        const actualCheckoutDateTime =
            checkoutBill
                ?.roomBilling
                ?.actualCheckoutDateTime ||
            checkoutBill
                ?.checkoutDateTime ||
            null;

        const actualCheckoutDate =
            firstRoom
                ?.actualCheckoutDate ||
            (
                actualCheckoutDateTime
                    ? new Date(
                          actualCheckoutDateTime
                      )
                          .toISOString()
                          .slice(
                              0,
                              10
                          )
                    : ""
            );

        const actualCheckoutTime =
            firstRoom
                ?.actualCheckoutTime ||
            "";

        const uiDetails = req.body.uiExtraDetails || {};

        const staySummary = {
            bookedCheckIn:
                firstRoom?.checkIn ||
                null,

            bookedCheckInTime:
                firstRoom
                    ?.checkInTime ||
                "",

            bookedCheckOut:
                expectedCheckoutDate,

            bookedCheckOutTime:
                firstRoom
                    ?.checkOutTime ||
                "",

            actualCheckOut:
                actualCheckoutDateTime,

            actualCheckOutDate:
                actualCheckoutDate,

            actualCheckOutTime:
                actualCheckoutTime,

            bookedNights,

            extraNights:
                extraFullDays,

            extraHours: uiDetails.extraHours || 0,

            extraMinutes: uiDetails.extraMinutes || 0,

            extraTime: (uiDetails.extraHours || uiDetails.extraMinutes) ? `${uiDetails.extraHours || 0}h ${uiDetails.extraMinutes || 0}m` : "",

            totalExtraStayMinutes: uiDetails.totalExtraStayMinutes || 0,

            totalNightsStayed:
                bookedNights +
                extraFullDays,

            overstayDescription:
                extraFullDays > 0
                    ? `${extraFullDays} extra full day${
                          extraFullDays >
                          1
                              ? "s"
                              : ""
                      }`
                    : checkoutPolicyCharge >
                      0
                    ? "Checkout time policy charge"
                    : "",
        };

        // ========================================================
        // EXTRA CHARGES
        // ========================================================

        const totalExtraStayCharges =
            roundMoney(
                extraFullDayCharge +
                    checkoutPolicyCharge
            );

        const extraCharges = {
            extraNightsStayed:
                extraFullDays,

            extraNightRate:
                extraFullDays > 0
                    ? roundMoney(
                          extraFullDayCharge /
                              extraFullDays
                      )
                    : 0,

            extraNightCharge:
                extraFullDayCharge,

            extraHoursStayed: uiDetails.extraHours || 0,

            extraMinutesStayed: uiDetails.extraMinutes || 0,

            extraHoursCharge: 0,

            extraTimeCharge: uiDetails.extraTimeCharge || 0,

            extraTimeChargeType:
                "No extra time charge",

            extraTimeRatePercentage:
                0,

            lateCheckoutCharge:
                checkoutPolicyCharge,

            checkoutPolicyType:
                checkoutPolicyType,

            checkoutPolicyValue:
                checkoutPolicyValue,

            damageCharge: 0,

            otherCharges: 0,

            otherChargesDescription:
                "",

            total:
                totalExtraStayCharges,
        };

        // ========================================================
        // FINANCIALS
        // ========================================================

        const subtotal =
            roundMoney(
                roomSubtotal +
                    foodTotal +
                    roomServiceTotal
            );

        const financials = {
            roomRent:
                baseRoomRent,

            roomRentPerNight:
                roundMoney(
                    firstRoom
                        ?.perNightRoomPrice
                ),

            foodServices:
                foodTotal,

            roomServices:
                roomServiceTotal,

            extraNightCharge:
                extraFullDayCharge,

            extraTimeCharge:
                uiDetails.extraTimeCharge || 0,

            totalExtraStayCharges:
                totalExtraStayCharges,

            subTotal:
                subtotal,

            gstPercentage:
                gstPercentage,

            gstAmount:
                gstAmount,

            grandTotal:
                grandTotal,

            advancePaid:
                initialPaid,

            advancePaidVia:
                normalizeString(
                    primaryBooking
                        ?.initialPaidVia,
                    "Cash"
                ),

            currentPayment:
                currentPayment,

            totalPaid:
                totalPaid,

            balanceDue:
                balanceDue,
        };

        // ========================================================
        // PAYMENT INFO
        // ========================================================

        const sortedPayments =
            [...allPayments].sort(
                (a, b) =>
                    new Date(
                        b?.paidAt || 0
                    ) -
                    new Date(
                        a?.paidAt || 0
                    )
            );

        const lastPayment =
            sortedPayments[0];

        const finalPaymentMode =
            normalizeString(
                lastPayment
                    ?.paymentVia
            ) ||
            normalizeString(
                paymentMode
            ) ||
            "Cash";

        const paymentStatus =
            balanceDue <= 0
                ? "PAID"
                : totalPaid > 0
                ? "PARTIAL"
                : "PENDING";

        const paymentInfo = {
            paymentMode:
                finalPaymentMode,

            paymentStatus:

                paymentStatus,

            paidAt:
                lastPayment
                    ?.paidAt ||
                checkoutBill
                    ?.checkoutDateTime ||
                new Date(),

            transactionId:
                "",
        };

        // ========================================================
        // GENERATE INVOICE NUMBER
        // ========================================================

        const {
            invoiceNo,
            invoiceYear,
            invoiceSequence,
        } =
            await generateInvoiceNumber(
                hotelId,
                branchId
            );

        log.info(
            `[Invoice] Creating invoice document. ` +
            `invoiceNo=${invoiceNo}, ` +
            `checkoutBillId=${checkoutBillId}, ` +
            `customerId=${customerId}, ` +
            `grandTotal=${grandTotal}, ` +
            `totalPaid=${totalPaid}, ` +
            `balanceDue=${balanceDue}`
        );

        // ========================================================
        // CREATE INVOICE
        // ========================================================

        const newInvoice =
            await Invoice.create({
                // ==================================================
                // TENANT
                // ==================================================

                hotelId,

                branchId,

                // ==================================================
                // INVOICE NUMBER
                // ==================================================

                invoiceNo,

                invoiceYear,

                invoiceSequence,

                invoiceDate:
                    formatInvoiceDate(),

                // ==================================================
                // CUSTOMER
                // ==================================================

                customerId,

                customer: {
                    customerId,

                    customerName,

                    phoneNumber,

                    alternativePhone:
                        normalizeString(
                            customer
                                .alternativePhone
                        ),

                    email:
                        normalizeString(
                            customer.email
                        ),

                    address:
                        normalizeString(
                            customer.address
                        ),

                    idProofType:
                        normalizeString(
                            customer.idProofType
                        ),

                    idProofNumber:
                        normalizeString(
                            customer.idProofNumber
                        ),

                    rooms:
                        formattedRooms,

                    roomNumber:
                        firstRoom
                            ?.roomNumber ||
                        "",

                    roomType:
                        firstRoom
                            ?.roomType ||
                        "",

                    bedType:
                        firstRoom
                            ?.bedType ||
                        "",

                    adults:
                        firstRoom
                            ?.adults ||
                        0,

                    children:
                        firstRoom
                            ?.children ||
                        0,
                },

                // ==================================================
                // ROOMS
                // ==================================================

                rooms:
                    formattedRooms,


                // ==================================================
                // STAY SUMMARY
                // ==================================================

                staySummary,

                // ==================================================
                // ITEMS
                // ==================================================

                items:
                    invoiceItems,

                // ==================================================
                // FOOD SERVICES
                // ==================================================


                // ==================================================
                // ROOM SERVICES
                // ==================================================

              

                // ==================================================
                // EXTRA CHARGES
                // ==================================================

                extraCharges,

                // ==================================================
                // FINANCIALS
                // ==================================================

                financials,

                // ==================================================
                // BILLING DETAILS
                // ==================================================

                billingDetails: {
                    checkoutBillId:
                        checkoutBill._id,

                    bookedNights:
                        bookedNights,

                    roomSubtotal:
                        roomSubtotal,

                    extraFullDays:
                        extraFullDays,

                    extraFullDayCharge:
                        extraFullDayCharge,

                    checkoutPolicyType:
                        checkoutPolicyType,

                    checkoutPolicyValue:
                        checkoutPolicyValue,

                    checkoutPolicyCharge:
                        checkoutPolicyCharge,

                    expectedCheckoutDate:
                        expectedCheckoutDate,

                    actualCheckoutDate:
                        actualCheckoutDate,

                    actualCheckoutTime:
                        actualCheckoutTime,
                },

                // ==================================================
                // PAYMENT INFO
                // ==================================================

                paymentInfo,

                // ==================================================
                // STATUS
                // ==================================================

                status:
                    balanceDue <= 0
                        ? "PAID"
                        : totalPaid > 0
                        ? "PARTIAL"
                        : "ISSUED",
            });

        // ========================================================
        // SUCCESS LOG
        // ========================================================

        log.info(
            `[Invoice] Invoice created successfully. ` +
            `invoiceId=${newInvoice._id}, ` +
            `invoiceNo=${newInvoice.invoiceNo}, ` +
            `checkoutBillId=${checkoutBillId}, ` +
            `grandTotal=${grandTotal}, ` +
            `totalPaid=${totalPaid}, ` +
            `balanceDue=${balanceDue}`
        );

        return res.status(201).json({
            success: true,

            message:
                "Invoice stored successfully.",

            data:
                newInvoice,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error,
            "create invoice",
            {
                hotelId:
                    tenant?.hotelId ||
                    req.user?.hotelId ||
                    "unknown",

                branchId:
                    tenant?.branchId ||
                    req.user?.branchId ||
                    "unknown",

                checkoutBillId:
                    req.body
                        ?.checkoutBillId ||
                    "unknown",
            }
        );
    }
};




// ============================================================
// 2. GET ALL INVOICES
// ============================================================

export const getAllInvoices = async (
    req,
    res
) => {
    let tenant = null;

    try {
        tenant = getTenantIds(
            req,
            res,
            "get all invoices"
        );

        if (!tenant) {
            return;
        }

        const {
            hotelId,
            branchId,
        } = tenant;

        log.info(
            `[Invoice] Fetching invoices. ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}`
        );

        const invoices =
            await Invoice.find({
                hotelId,
                branchId,
            })
                .sort({
                    invoiceYear: -1,
                    invoiceSequence: -1,
                })
                .lean();

        log.info(
            `[Invoice] Invoices fetched successfully. ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}, ` +
            `count=${invoices.length}`
        );

        return res.status(200).json({
            success: true,
            count: invoices.length,
            data: invoices,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error,
            "get all invoices",
            {
                hotelId:
                    tenant?.hotelId ||
                    req.user?.hotelId ||
                    "unknown",

                branchId:
                    tenant?.branchId ||
                    req.user?.branchId ||
                    "unknown",
            }
        );
    }
};

// ============================================================
// 3. GET INVOICE BY ID
// ============================================================

export const getInvoiceById = async (
    req,
    res
) => {
    let tenant = null;

    try {
        tenant = getTenantIds(
            req,
            res,
            "get invoice"
        );

        if (!tenant) {
            return;
        }

        const {
            hotelId,
            branchId,
        } = tenant;

        const { id } = req.params;

        if (!isValidObjectId(id)) {
            log.warn(
                `[Invoice] Get invoice rejected. ` +
                `Invalid invoiceId=${id}, ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "The invoice ID is invalid. Please refresh the page and try again.",
            });
        }

        log.info(
            `[Invoice] Fetching invoice. ` +
            `invoiceId=${id}, ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}`
        );

        const invoice =
            await Invoice.findOne({
                _id: id,
                hotelId,
                branchId,
            });

        if (!invoice) {
            log.warn(
                `[Invoice] Invoice not found in current branch. ` +
                `invoiceId=${id}, ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "Invoice not found in your branch.",
            });
        }

        log.info(
            `[Invoice] Invoice fetched successfully. ` +
            `invoiceId=${id}, ` +
            `invoiceNo=${invoice.invoiceNo}`
        );

        return res.status(200).json({
            success: true,
            data: invoice,
        });
    } catch (error) {
        return handleControllerError(
            res,
            error,
            "get invoice",
            {
                hotelId:
                    tenant?.hotelId ||
                    req.user?.hotelId ||
                    "unknown",

                branchId:
                    tenant?.branchId ||
                    req.user?.branchId ||
                    "unknown",

                invoiceId:
                    req.params?.id ||
                    "unknown",
            }
        );
    }
};

// ============================================================
// 4. DELETE INVOICE
// ============================================================

export const deleteInvoice = async (
    req,
    res
) => {
    let tenant = null;

    try {
        tenant = getTenantIds(
            req,
            res,
            "delete invoice"
        );

        if (!tenant) {
            return;
        }

        const {
            hotelId,
            branchId,
        } = tenant;

        const { id } = req.params;

        if (!isValidObjectId(id)) {
            log.warn(
                `[Invoice] Delete invoice rejected. ` +
                `Invalid invoiceId=${id}, ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "The invoice ID is invalid.",
            });
        }

        log.info(
            `[Invoice] Looking up invoice before deletion. ` +
            `invoiceId=${id}, ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}`
        );

        const invoice =
            await Invoice.findOne({
                _id: id,
                hotelId,
                branchId,
            });

        if (!invoice) {
            log.warn(
                `[Invoice] Delete invoice rejected. ` +
                `Invoice not found in current branch. ` +
                `invoiceId=${id}, ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "Invoice not found in your branch or it has already been deleted.",
            });
        }

        await Invoice.findOneAndDelete({
            _id: id,
            hotelId,
            branchId,
        });

        log.info(
            `[Invoice] Invoice deleted successfully. ` +
            `invoiceId=${id}, ` +
            `invoiceNo=${invoice.invoiceNo}, ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Invoice deleted successfully.",
        });
    } catch (error) {
        return handleControllerError(
            res,
            error,
            "delete invoice",
            {
                hotelId:
                    tenant?.hotelId ||
                    req.user?.hotelId ||
                    "unknown",

                branchId:
                    tenant?.branchId ||
                    req.user?.branchId ||
                    "unknown",

                invoiceId:
                    req.params?.id ||
                    "unknown",
            }
        );
    }
};