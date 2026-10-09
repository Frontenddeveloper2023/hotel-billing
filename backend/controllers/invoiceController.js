import mongoose from "mongoose";

import Invoice from "../models/invoice.js";
import InvoiceCounter from "../models/InvoiceCounter.js";
import Customer from "../models/customers.js";
import Hotels from "../models/hotels.js";
import BranchHotels from "../models/branchHotels.js";
import CheckoutBill from "../models/checkoutBill.js";
import Booking from "../models/booking.js";
import Settings from "../models/settings.js";
import nodemailer from "nodemailer";
import { generateInvoicePdfBuffer } from "../util/pdfGenerator.js";


import { log } from "../util/logger.js";


const invoiceEmailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

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

    console.error("[Invoice Controller Error]:", error);

    return res.status(500).json({
        success: false,
        message:
            error?.message || "Something went wrong while processing the invoice. Please try again later.",
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
        const second = words[1].toUpperCase();
        if ((first === "THE" || first === "HOTEL") && words.length > 1) {
            code = second.slice(0, 8);
        } else {
            code = first.slice(0, 8);
        }
    } else if (words.length === 1) {
        code = words[0].slice(0, 8).toUpperCase();
    }

    if (!code || code.length < 2) {
        code = clean.replace(/\s+/g, "").toUpperCase().slice(0, 8) || "HTL";
    }

    return code.toUpperCase();
};

const resolveHotelCode = async (hotelId, branchId) => {
    try {
        let effectiveHotelName = "";

        // 1. Always prioritize dynamic companyName from Settings
        const settings =
            (branchId
                ? await Settings.findOne({ hotelId, branchId })
                      .select("companyName")
                      .sort({ updatedAt: -1 })
                      .lean()
                : null) ||
            (await Settings.findOne({ hotelId })
                .select("companyName")
                .sort({ updatedAt: -1 })
                .lean());

        if (settings?.companyName && String(settings.companyName).trim()) {
            effectiveHotelName = String(settings.companyName).trim();
        }

        // 2. Fallback to Hotels collection if settings not created yet
        if (!effectiveHotelName) {
            const hotel = await Hotels.findById(hotelId).select("hotelName hotelCode").lean();
            if (hotel?.hotelName && String(hotel.hotelName).trim()) {
                effectiveHotelName = String(hotel.hotelName).trim();
            } else if (hotel?.hotelCode && String(hotel.hotelCode).trim()) {
                return String(hotel.hotelCode).trim().toUpperCase();
            }
        }

        if (!effectiveHotelName) {
            effectiveHotelName = "HOTEL";
        }

        const baseCode = generateHotelCode(effectiveHotelName);

        log.info(
            `[Invoice] Dynamic hotel code resolved from Settings: ${baseCode} (Hotel/Company Name: "${effectiveHotelName}")`
        );

        return baseCode;
    } catch (err) {
        log.error(`[Invoice] Error resolving hotelCode from settings: ${err.message}`);
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
// INV-[HOTEL_CODE]-[BRANCH_CODE_IF_NOT_MAIN]-[YYYYMMDD]-[SEQUENCE]
//
// Example:
// INV-JAYAM-20261007-0001
// INV-GRAND-BR1-20261007-0001
//
// ============================================================

const generateInvoiceNumber = async (
    hotelId,
    branchId
) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateFormatted = `${year}${month}${day}`; // YYYYMMDD e.g. 20261007

    log.info(
        `[Invoice] Starting invoice number generation. ` +
        `hotelId=${hotelId}, ` +
        `branchId=${branchId}, ` +
        `year=${year}, ` +
        `dateFormatted=${dateFormatted}`
    );

    const hotelCode = await resolveHotelCode(hotelId, branchId);
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

    // Format: INV-[HOTEL_FIRST_3_LETTERS]-[SEQUENCE]
    const firstThreeLetters = hotelCode ? hotelCode.substring(0, 3).toUpperCase() : "HTL";
    const invoiceNo =
        `INV-${firstThreeLetters}-${String(
            invoiceSequence
        ).padStart(4, "0")}`;

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

const normalizeFoodServices = (
    foodServices,
    fallbackRoomNumber = ""
) => {
    if (!Array.isArray(foodServices)) {
        return [];
    }

    return foodServices.map(
        (food) => ({
            roomNumber: normalizeString(
                food?.roomNumber ||
                food?.room ||
                fallbackRoomNumber
            ),

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
    services,
    fallbackRoomNumber = ""
) => {
    if (!Array.isArray(services)) {
        return [];
    }

    return services.map(
        (service) => ({
            roomNumber: normalizeString(
                service?.roomNumber ||
                service?.room ||
                fallbackRoomNumber
            ),

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
            financials: reqFinancials,
            extraCharges: reqExtraCharges,
            staySummary: reqStaySummary,
            items: reqItems,
            billing: reqBilling,
            uiExtraDetails = {},
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
                                    booking.checkIn ||
                                    null,

                                checkInTime:
                                    normalizeString(
                                        room.checkInTime ||
                                        booking.checkInTime ||
                                        ""
                                    ),

                                checkOut:
                                    room.checkOut ||
                                    booking.checkOut ||
                                    null,

                                checkOutTime:
                                    normalizeString(
                                        room.checkOutTime ||
                                        booking.checkOutTime ||
                                        ""
                                    ),

                                actualCheckoutDate:
                                    normalizeString(
                                        room.actualCheckoutDate ||
                                        booking.actualCheckoutDate ||
                                        ""
                                    ),

                                actualCheckoutTime:
                                    normalizeString(
                                        room.actualCheckoutTime ||
                                        booking.actualCheckoutTime ||
                                        ""
                                    ),

                                foodServicesDetails: normalizeFoodServices(
                                    room.foodServices,
                                    room.roomNumber
                                ),

                                roomServicesDetails: normalizeRoomServices(
                                    room.roomServices,
                                    room.roomNumber
                                ),
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
        // CHECKED OUT ROOMS (Prioritize req.body.rooms / selectedRooms)
        // ========================================================

        const requestedRooms = Array.isArray(req.body.rooms) && req.body.rooms.length > 0
            ? req.body.rooms
            : Array.isArray(req.body.selectedRooms) && req.body.selectedRooms.length > 0
                ? req.body.selectedRooms
                : Array.isArray(req.body.billing?.rooms) && req.body.billing.rooms.length > 0
                    ? req.body.billing.rooms
                    : null;

        let effectiveRooms = [];

        if (requestedRooms && requestedRooms.length > 0) {
            effectiveRooms = requestedRooms.map((r, idx) => {
                const dbMatch = bookingRooms.find(
                    (br) =>
                        (r.roomNumber && String(br.roomNumber).trim() === String(r.roomNumber).trim()) ||
                        (r.roomId && String(br.roomId) === String(r.roomId)) ||
                        (r._id && String(br.roomId || br._id) === String(r._id))
                );

                const bookedNights = Math.max(1, Math.floor(normalizeNumber(r.bookedNights ?? r.nights ?? dbMatch?.bookedNights ?? 1)));
                const perNightRoomPrice = roundMoney(r.perNightRoomPrice ?? r.pricePerNight ?? r.rate ?? dbMatch?.perNightRoomPrice ?? 0);
                const extraFullDays = Math.max(0, Math.floor(normalizeNumber(r.extraFullDays ?? r.extraNightsStayed ?? r.extraStay?.extraDays ?? 0)));
                const extraFullDayCharge = roundMoney(r.extraFullDayCharge ?? r.extraDayCharge ?? (extraFullDays * perNightRoomPrice));
                const checkoutPolicyCharge = roundMoney(r.checkoutPolicyCharge ?? r.extraTimeCharge ?? r.extraStay?.timeCharge ?? 0);

                const dbBooking = bookings.find(
                    (b) =>
                        (r.bookingId && String(b._id) === String(r.bookingId)) ||
                        (dbMatch?.bookingId && String(b._id) === String(dbMatch.bookingId))
                );

                return {
                    bookingId: r.bookingId || dbMatch?.bookingId || primaryBooking._id,
                    roomId: r.roomId || r._id || dbMatch?.roomId || null,
                    roomNumber: normalizeString(r.roomNumber || dbMatch?.roomNumber || `Room ${idx + 1}`),
                    roomType: normalizeString(r.roomType || dbMatch?.roomType || "Standard"),
                    bedType: normalizeString(r.bedType || dbMatch?.bedType || "Single"),
                    perNightRoomPrice,
                    adults: Math.max(0, Math.floor(normalizeNumber(r.adults ?? dbMatch?.adults ?? 1))),
                    children: Math.max(0, Math.floor(normalizeNumber(r.children ?? dbMatch?.children ?? 0))),
                    bookedNights,
                    roomRent: roundMoney(
                        r.roomSubtotal ??
                        r.roomRent ??
                        (perNightRoomPrice * bookedNights)
                    ),
                    extraFullDays,
                    extraFullDayCharge,
                    checkoutPolicyCharge,
                    checkoutPolicyType: normalizeString(r.checkoutPolicyType || r.extraStay?.timePolicyType || checkoutPolicyType),
                    checkoutPolicyValue: normalizeNumber(r.checkoutPolicyValue ?? r.extraStay?.timePolicyValue ?? checkoutPolicyValue),
                    checkIn: r.checkIn || dbMatch?.checkIn || dbBooking?.checkIn || null,
                    checkInTime: normalizeString(r.checkInTime || dbMatch?.checkInTime || dbBooking?.checkInTime || ""),
                    checkOut: r.checkOut || dbMatch?.checkOut || dbBooking?.checkOut || null,
                    checkOutTime: normalizeString(r.checkOutTime || dbMatch?.checkOutTime || dbBooking?.checkOutTime || ""),
                    actualCheckoutDate: normalizeString(r.actualCheckoutDate || dbMatch?.actualCheckoutDate || dbBooking?.actualCheckoutDate || ""),
                    actualCheckoutTime: normalizeString(r.actualCheckoutTime || dbMatch?.actualCheckoutTime || dbBooking?.actualCheckoutTime || ""),
                    foodServicesDetails: Array.isArray(r.foodServices)
                        ? normalizeFoodServices(r.foodServices, r.roomNumber)
                        : (dbMatch?.foodServicesDetails || []),
                    roomServicesDetails: Array.isArray(r.roomServices)
                        ? normalizeRoomServices(r.roomServices, r.roomNumber)
                        : (dbMatch?.roomServicesDetails || []),
                };
            });
        } else {
            effectiveRooms = bookingRooms;
        }

        const formattedRooms = effectiveRooms;

        // ========================================================
        // INVOICE ITEMS
        // ========================================================

        const invoiceItems = [];

        if (Array.isArray(reqItems) && reqItems.length > 0) {
            reqItems.forEach((item) => {
                invoiceItems.push({
                    roomNumber: normalizeString(item.roomNumber || item.room || ""),
                    description: normalizeString(item.description || "Item"),
                    unitPrice: roundMoney(item.unitPrice || 0),
                    quantity: Math.max(1, normalizeNumber(item.quantity || 1)),
                    total: roundMoney(item.total || (roundMoney(item.unitPrice || 0) * Math.max(1, normalizeNumber(item.quantity || 1)))),
                });
            });
        } else {
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
                            `Room Rent - ${room.roomNumber ||
                            index + 1
                            } (${room.roomType ||
                            "Room"
                            } - ${nights} ${nights === 1
                                ? "Night"
                                : "Nights"
                            })`,

                        unitPrice,

                        quantity:
                            nights,

                        total,
                    });

                    let roomPolicyLabel = "Extra Time Stay Charge";

                    if (room.extraFullDays > 0 && room.extraFullDayCharge > 0) {
                        invoiceItems.push({
                            description: `Extra Night Stay - Room ${room.roomNumber} (${room.extraFullDays} ${room.extraFullDays === 1 ? "Night" : "Nights"})`,
                            unitPrice: unitPrice,
                            quantity: room.extraFullDays,
                            total: room.extraFullDayCharge,
                        });
                    }

                    if (room.checkoutPolicyCharge > 0) {
                        invoiceItems.push({
                            description: `${roomPolicyLabel} - Room ${room.roomNumber}`,
                            unitPrice: room.checkoutPolicyCharge,
                            quantity: 1,
                            total: room.checkoutPolicyCharge,
                        });
                    }
                }
            );
        }

        // Fallback global extra charges only if not already added room-wise
        const hasRoomWiseExtraFullDays = formattedRooms.some((r) => (r.extraFullDays > 0 && r.extraFullDayCharge > 0));
        const hasRoomWiseCheckoutPolicy = formattedRooms.some((r) => (r.checkoutPolicyCharge > 0));

        if (!hasRoomWiseExtraFullDays && extraFullDays > 0 && extraFullDayCharge > 0) {
            invoiceItems.push({
                description: "Extra Night Stay",
                unitPrice: roundMoney(extraFullDayCharge / extraFullDays),
                quantity: extraFullDays,
                total: extraFullDayCharge,
            });
        }

        if (!hasRoomWiseCheckoutPolicy && checkoutPolicyCharge > 0) {
            invoiceItems.push({
                description: "Extra Time Stay Charge",
                unitPrice: checkoutPolicyCharge,
                quantity: 1,
                total: checkoutPolicyCharge,
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

            bookedNights: Number(reqStaySummary?.bookedNights ?? reqBilling?.bookedNights ?? bookedNights),

            extraNights:
                Number(reqStaySummary?.extraNights ?? reqBilling?.extraNightsStayed ?? extraFullDays),

            extraHours: Number(reqStaySummary?.extraHours ?? reqBilling?.extraHoursStayed ?? uiDetails.extraHours ?? 0),

            extraMinutes: Number(reqStaySummary?.extraMinutes ?? reqBilling?.extraMinutesStayed ?? uiDetails.extraMinutes ?? 0),

            extraTime: reqStaySummary?.extraTime || ((uiDetails.extraHours || uiDetails.extraMinutes || reqBilling?.extraHoursStayed || reqBilling?.extraMinutesStayed) ? `${reqBilling?.extraHoursStayed ?? uiDetails.extraHours ?? 0}h ${reqBilling?.extraMinutesStayed ?? uiDetails.extraMinutes ?? 0}m` : ""),

            totalExtraStayMinutes: Number(reqStaySummary?.totalExtraStayMinutes ?? reqBilling?.totalExtraStayMinutes ?? uiDetails.totalExtraStayMinutes ?? 0),

            totalNightsStayed:
                Number(reqStaySummary?.totalNightsStayed ?? (bookedNights + extraFullDays)),

            overstayDescription:
                extraFullDays > 0
                    ? `${extraFullDays} extra full day${extraFullDays >
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
                Math.max(0, Math.floor(normalizeNumber(reqExtraCharges?.extraNightsStayed ?? reqBilling?.extraNightsStayed ?? extraFullDays))),

            extraNightRate:
                roundMoney(
                    reqExtraCharges?.extraNightRate ?? (
                        extraFullDays > 0
                            ? roundMoney(extraFullDayCharge / extraFullDays)
                            : 0
                    )
                ),

            extraNightCharge:
                roundMoney(reqExtraCharges?.extraNightCharge ?? reqBilling?.extraDayCharge ?? extraFullDayCharge),

            extraHoursStayed: Number(reqExtraCharges?.extraHoursStayed ?? reqBilling?.extraHoursStayed ?? uiDetails.extraHours ?? 0),

            extraMinutesStayed: Number(reqExtraCharges?.extraMinutesStayed ?? reqBilling?.extraMinutesStayed ?? uiDetails.extraMinutes ?? 0),

            extraHoursCharge: 0,

            extraTimeCharge: roundMoney(reqExtraCharges?.extraTimeCharge ?? reqBilling?.extraTimeCharge ?? uiDetails.extraTimeCharge ?? 0),

            extraTimeChargeType:
                "No extra time charge",

            extraTimeRatePercentage:
                0,

            lateCheckoutCharge:
                roundMoney(reqExtraCharges?.lateCheckoutCharge ?? reqBilling?.extraTimeCharge ?? checkoutPolicyCharge),

            checkoutPolicyType:
                reqExtraCharges?.checkoutPolicyType || checkoutPolicyType,

            checkoutPolicyValue:
                reqExtraCharges?.checkoutPolicyValue ?? checkoutPolicyValue,

            damageCharge: 0,

            otherCharges: 0,

            otherChargesDescription:
                "",

            total:
                roundMoney(reqExtraCharges?.total ?? reqBilling?.extraChargeTotal ?? totalExtraStayCharges),
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
                roundMoney(reqFinancials?.roomRent ?? reqBilling?.roomTotal ?? reqBilling?.roomSubtotal ?? baseRoomRent),

            roomRentPerNight:
                roundMoney(
                    reqFinancials?.roomRentPerNight ??
                    firstRoom?.perNightRoomPrice ??
                    0
                ),

            foodServices:
                roundMoney(reqFinancials?.foodServices ?? reqBilling?.foodTotal ?? foodTotal),

            roomServices:
                roundMoney(reqFinancials?.roomServices ?? reqBilling?.roomServiceTotal ?? roomServiceTotal),

            extraNightCharge:
                roundMoney(reqFinancials?.extraNightCharge ?? reqBilling?.extraDayCharge ?? extraFullDayCharge),

            checkoutPolicyCharge:
                roundMoney(reqFinancials?.checkoutPolicyCharge ?? reqBilling?.extraTimeCharge ?? checkoutPolicyCharge),

            extraTimeCharge:
                roundMoney(reqFinancials?.extraTimeCharge ?? reqBilling?.extraTimeCharge ?? checkoutPolicyCharge ?? (uiDetails.extraTimeCharge || 0)),

            totalExtraStayCharges:
                roundMoney(reqFinancials?.totalExtraStayCharges ?? reqBilling?.extraChargeTotal ?? totalExtraStayCharges),

            subTotal:
                roundMoney(reqFinancials?.subTotal ?? reqBilling?.subtotal ?? subtotal),

            gstPercentage:
                roundMoney(reqFinancials?.gstPercentage ?? reqBilling?.gstPercentage ?? gstPercentage),

            gstAmount:
                roundMoney(reqFinancials?.gstAmount ?? reqBilling?.gstAmount ?? gstAmount),

            grandTotal:
                roundMoney(reqFinancials?.grandTotal ?? reqBilling?.grandTotal ?? grandTotal),

            advancePaid:
                roundMoney(reqFinancials?.advancePaid ?? reqBilling?.advancePaid ?? Math.min(initialPaid, grandTotal)),

            advancePaidVia:
                normalizeString(
                    reqFinancials?.advancePaidVia || primaryBooking?.initialPaidVia,
                    "Cash"
                ),

            currentPayment:
                roundMoney(reqFinancials?.currentPayment ?? reqBilling?.balanceDue ?? currentPayment),

            totalPaid:
                roundMoney(
                    reqFinancials?.totalPaid ??
                    (roundMoney(reqFinancials?.advancePaid ?? reqBilling?.advancePaid ?? Math.min(initialPaid, grandTotal)) +
                     roundMoney(reqFinancials?.currentPayment ?? reqBilling?.balanceDue ?? currentPayment)) ??
                    totalPaid
                ),

            balanceDue:
                roundMoney(reqFinancials?.balanceDue ?? (Math.max(0, roundMoney(reqFinancials?.grandTotal ?? reqBilling?.grandTotal ?? grandTotal) - roundMoney(reqFinancials?.totalPaid ?? totalPaid)))),
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
            normalizeString(req.body?.paymentInfo?.paymentStatus || req.body?.paymentStatus) ||
            "PAID";

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
                    paymentStatus === "PAID" || balanceDue <= 0
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

// ============================================================
// ADMIN – GET ALL INVOICES (across all hotels)
// ============================================================
// Used by SaaS Admin "Hotel Bills & Revenue" page.
// No hotel/branch scoping – returns all invoices.
// Protected by permissionVerify("hotels") in the route.
// ============================================================

export const getAllInvoicesAdmin = async (req, res) => {
    try {
        const invoices = await Invoice.find({})
            .sort({ createdAt: -1 })
            .select(
                "invoiceNo hotelId branchId financials paymentInfo " +
                "invoiceDate invoiceYear createdAt customer"
            )
            .lean();

        return res.status(200).json({
            success: true,
            data: {
                invoices,
                total: invoices.length,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch invoices.",
        });
    }
};



// ============================================================
// SEND ALREADY-GENERATED INVOICE PDF TO CUSTOMER
// ============================================================

export const sendInvoiceEmail = async (req, res) => {
    try {
        const {
            email,
            customerName,
            invoiceNo,
            amount,
            paymentMethod,
        } = req.body;

        // ------------------------------------------
        // VALIDATE EMAIL
        // ------------------------------------------

        if (!email || !String(email).trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer email address is required.",
            });
        }

        // ------------------------------------------
        // GENERATE PDF
        // ------------------------------------------

        const invoiceData = await Invoice.findOne({ invoiceNo }).populate('hotelId').lean();
        if (!invoiceData) {
            return res.status(404).json({
                success: false,
                message: "Invoice not found for the given Invoice No.",
            });
        }

        // Fetch dynamic hotel name
        let dynamicHotelName = invoiceData.hotelId?.hotelName || "StayLio";
        try {
            const SettingsModel = mongoose.model("Settings");
            const settings = await SettingsModel.findOne({ hotelId: invoiceData.hotelId?._id }).select("companyName").lean();
            if (settings && settings.companyName) {
                dynamicHotelName = settings.companyName;
            }
        } catch (e) {
            console.error("Failed to fetch settings for hotel name", e);
        }
        invoiceData.dynamicHotelName = dynamicHotelName;


        let generatedPdfBuffer;
        try {
            generatedPdfBuffer = await generateInvoicePdfBuffer(invoiceData);
        } catch (err) {
            console.error("Failed to generate PDF backend:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to generate professional PDF.",
            });
        }

        const safeEmail = String(email).trim();

        const safeCustomerName =
            String(customerName || "Guest").trim();

        const safeInvoiceNo =
            String(invoiceNo || "Invoice").trim();

        const safeAmount =
            String(amount || "0.00").trim();

        const safePaymentMethod =
            String(paymentMethod || "CASH")
                .trim()
                .toUpperCase();

        // ------------------------------------------
        // EMAIL SUBJECT
        // ------------------------------------------

        const subject =
            `Invoice ${safeInvoiceNo} - Checkout Complete`;

        // ------------------------------------------
        // EMAIL
        // ------------------------------------------

        const mailOptions = {
            from: `"${dynamicHotelName}" <${process.env.SMTP_USER}>`,

            to: safeEmail,

            subject,

            text: `
Dear ${safeCustomerName},

Your checkout has been completed successfully.

Invoice No: ${safeInvoiceNo}
Total Invoice Amount: ₹${safeAmount}
Payment Method: ${safePaymentMethod}

Please find your invoice PDF attached to this email.

Thank you for choosing us.
We hope to welcome you back soon!

Warm regards,
${dynamicHotelName} Team
            `.trim(),

            html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    />
    <title>Invoice ${safeInvoiceNo}</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#f4f8fc;
        font-family:Arial,Helvetica,sans-serif;
        color:#1f2937;
    "
>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    style="padding:40px 15px;background:#f4f8fc;"
>
    <tr>
        <td align="center">

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                    max-width:600px;
                    background:#ffffff;
                    border:1px solid #dce8f6;
                    border-radius:14px;
                    overflow:hidden;
                "
            >

                <!-- HEADER -->

                <tr>
                    <td
                        style="
                            background:#0e2a4a;
                            padding:25px 30px;
                        "
                    >
                        <div
                            style="
                                font-size:22px;
                                font-weight:700;
                                color:#ffffff;
                            "
                        >
                            ${dynamicHotelName}
                        </div>

                        <div
                            style="
                                margin-top:5px;
                                font-size:13px;
                                color:#cbd5e1;
                            "
                        >
                            Hotel Management
                        </div>
                    </td>
                </tr>

                <!-- BODY -->

                <tr>
                    <td style="padding:30px;">

                        <div
                            style="
                                font-size:22px;
                                font-weight:700;
                                color:#0e2a4a;
                                margin-bottom:10px;
                            "
                        >
                            Checkout Completed
                        </div>

                        <p
                            style="
                                margin:0 0 20px;
                                font-size:14px;
                                line-height:22px;
                                color:#64748b;
                            "
                        >
                            Dear ${safeCustomerName},
                        </p>

                        <p
                            style="
                                margin:0 0 20px;
                                font-size:14px;
                                line-height:22px;
                                color:#475569;
                            "
                        >
                            Your checkout has been completed
                            successfully. Please find your invoice
                            PDF attached to this email.
                        </p>

                        <!-- INVOICE DETAILS -->

                        <table
                            width="100%"
                            cellpadding="0"
                            cellspacing="0"
                            style="
                                border:1px solid #dce8f6;
                                border-radius:10px;
                                overflow:hidden;
                                margin-bottom:24px;
                            "
                        >

                            <tr>
                                <td
                                    style="
                                        padding:12px 15px;
                                        background:#f4f8fc;
                                        font-size:13px;
                                        font-weight:600;
                                        color:#64748b;
                                    "
                                >
                                    Invoice No
                                </td>

                                <td
                                    align="right"
                                    style="
                                        padding:12px 15px;
                                        background:#f4f8fc;
                                        font-size:13px;
                                        font-weight:700;
                                        color:#0e2a4a;
                                    "
                                >
                                    ${safeInvoiceNo}
                                </td>
                            </tr>

                           <tr>
    <td
        style="
            padding:12px 15px;
            font-size:13px;
            color:#64748b;
        "
    >
        Total Invoice Amount
    </td>

    <td
        align="right"
        style="
            padding:12px 15px;
            font-size:13px;
            font-weight:700;
            color:#0e2a4a;
        "
    >
        ₹${safeAmount}
    </td>
</tr>

                            <tr>
                                <td
                                    style="
                                        padding:12px 15px;
                                        font-size:13px;
                                        color:#64748b;
                                    "
                                >
                                    Payment Method
                                </td>

                                <td
                                    align="right"
                                    style="
                                        padding:12px 15px;
                                        font-size:13px;
                                        font-weight:700;
                                        color:#0e2a4a;
                                    "
                                >
                                    ${safePaymentMethod}
                                </td>
                            </tr>

                        </table>

                        <p
                            style="
                                margin:0;
                                font-size:14px;
                                line-height:22px;
                                color:#475569;
                            "
                        >
                            Thank you for choosing us.
                            We hope to welcome you back soon!
                        </p>

                        <p
                            style="
                                margin:20px 0 0;
                                font-size:14px;
                                line-height:22px;
                                color:#475569;
                            "
                        >
                            Warm regards,<br />
                            <strong>
                                ${dynamicHotelName} Team
                            </strong>
                        </p>

                    </td>
                </tr>

                <!-- FOOTER -->

                <tr>
                    <td
                        align="center"
                        style="
                            padding:18px 30px;
                            border-top:1px solid #e5edf6;
                            background:#f8fbff;
                            font-size:11px;
                            color:#94a3b8;
                        "
                    >
                        This is an automated email.
                        Please do not reply.
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>
            `,

            // ======================================
            // THIS IS THE IMPORTANT PART
            // Attach the PDF received from frontend
            // ======================================

            attachments: [
                {
                    filename:
                        safeInvoiceNo.endsWith(".pdf")
                            ? safeInvoiceNo
                            : `${safeInvoiceNo}.pdf`,

                    content: generatedPdfBuffer,

                    contentType:
                        "application/pdf",
                },
            ],
        };

        // ------------------------------------------
        // SEND EMAIL
        // ------------------------------------------

        const info =
            await invoiceEmailTransporter.sendMail(
                mailOptions
            );

        console.log(
            `[Invoice Email] Invoice ${safeInvoiceNo} sent to ${safeEmail}. Message ID: ${info.messageId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Invoice PDF sent successfully to customer email.",
            data: {
                invoiceNo: safeInvoiceNo,
                email: safeEmail,
                messageId: info.messageId,
            },
        });

    } catch (error) {
        console.error(
            "[Invoice Email] Failed:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                error?.message ||
                "Failed to send invoice email.",
        });
    }
};
