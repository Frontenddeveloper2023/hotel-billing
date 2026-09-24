import mongoose from "mongoose";

import Invoice from "../models/invoice.js";
import InvoiceCounter from "../models/InvoiceCounter.js";
import Customer from "../models/customers.js";
import BranchHotels from "../models/BranchHotels.js";

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
//
// Sequence is scoped by:
// hotelId + branchId + year
//
// Example:
// INV-MAIN-2026-000001
// INV-MAIN-2026-000002
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

    let branchCode = "MAIN";

    try {
        const branch = await BranchHotels.findById(
            branchId
        )
            .select("branchCode")
            .lean();

        if (
            branch?.branchCode &&
            String(branch.branchCode).trim()
        ) {
            branchCode = String(
                branch.branchCode
            )
                .trim()
                .toUpperCase();
        }

        log.info(
            `[Invoice] Branch code resolved. ` +
            `branchId=${branchId}, ` +
            `branchCode=${branchCode}`
        );
    } catch (error) {
        log.warn(
            `[Invoice] Unable to resolve branch code. ` +
            `branchId=${branchId}, ` +
            `error=${error.message}`
        );
    }

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

    const invoiceNo =
        `INV-${branchCode}-${year}-${String(
            invoiceSequence
        ).padStart(6, "0")}`;

    log.info(
        `[Invoice] Invoice number generated successfully. ` +
        `invoiceNo=${invoiceNo}, ` +
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

export const createInvoice = async (
    req,
    res
) => {
    let tenant = null;

    try {
        log.info(
            `[Invoice] Create invoice request received. ` +
            `userId=${req.user?._id || "unknown"}`
        );

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
            `[Invoice] Tenant verified for invoice creation. ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}, ` +
            `userId=${req.user?._id || "unknown"}`
        );

        const {
            customer,
            room,
            rooms,
            staySummary,
            foodServicesDetails,
            roomServicesDetails,
            extraCharges,
            financials,
            billingDetails,
            paymentInfo,
        } = req.body;

        // ========================================================
        // CUSTOMER VALIDATION
        // ========================================================

        if (
            !customer ||
            !normalizeString(
                customer.customerName
            )
        ) {
            log.warn(
                `[Invoice] Invoice creation rejected. ` +
                `Customer name is missing. ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Customer name is required.",
            });
        }

        if (
            !normalizeString(
                customer.phoneNumber
            )
        ) {
            log.warn(
                `[Invoice] Invoice creation rejected. ` +
                `Customer phone number is missing. ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Customer phone number is required.",
            });
        }

        const customerId =
            customer.customerId || null;

        // ========================================================
        // CUSTOMER TENANT VALIDATION
        // ========================================================

        if (customerId) {
            if (
                !isValidObjectId(
                    customerId
                )
            ) {
                log.warn(
                    `[Invoice] Invalid customer ID received. ` +
                    `customerId=${customerId}, ` +
                    `hotelId=${hotelId}, ` +
                    `branchId=${branchId}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "The customer ID is invalid. Please select the customer again.",
                });
            }

            log.info(
                `[Invoice] Verifying customer ownership. ` +
                `customerId=${customerId}, ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            const existingCustomer =
                await Customer.findOne({
                    _id: customerId,
                    hotelId,
                    branchId,
                })
                    .select("_id")
                    .lean();

            if (!existingCustomer) {
                log.warn(
                    `[Invoice] Customer ownership verification failed. ` +
                    `customerId=${customerId}, ` +
                    `hotelId=${hotelId}, ` +
                    `branchId=${branchId}`
                );

                return res.status(404).json({
                    success: false,
                    message:
                        "The selected customer was not found in your branch.",
                });
            }

            log.info(
                `[Invoice] Customer ownership verified. ` +
                `customerId=${customerId}`
            );
        }

        // ========================================================
        // ROOM VALIDATION
        // ========================================================

        let processedRooms =
            Array.isArray(rooms)
                ? rooms
                : [];

        // Backward compatibility for old single-room payload.
        if (
            processedRooms.length === 0 &&
            room &&
            (
                room.roomNumber ||
                customer.roomNumber
            )
        ) {
            processedRooms = [
                {
                    roomNumber:
                        room.roomNumber ||
                        customer.roomNumber,

                    roomType:
                        room.roomType ||
                        customer.roomType,

                    bedType:
                        room.bedType ||
                        customer.bedType,

                    perNightRoomPrice:
                        room.perNightRoomPrice ??
                        customer.perNightRoomPrice ??
                        0,

                    adults:
                        room.adults ??
                        customer.adults ??
                        0,

                    children:
                        room.children ??
                        customer.children ??
                        0,

                    bookedNights:
                        room.bookedNights ??
                        room.nights ??
                        0,

                    roomRent:
                        room.roomRent ??
                        0,

                    checkoutPolicyCharge:
                        room.checkoutPolicyCharge ??
                        room.checkoutPolicyAmount ??
                        0,
                },
            ];
        }

        if (
            processedRooms.length === 0
        ) {
            log.warn(
                `[Invoice] Invoice creation rejected. ` +
                `No room information was provided. ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}, ` +
                `customerId=${customerId || "unknown"}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "At least one room is required for the invoice.",
            });
        }

        // ========================================================
        // FINANCIAL VALIDATION
        // ========================================================

        if (!financials) {
            log.warn(
                `[Invoice] Invoice creation rejected. ` +
                `Financial information is missing. ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Financial details are required.",
            });
        }

        if (
            financials.grandTotal ===
                undefined ||
            financials.grandTotal ===
                null
        ) {
            log.warn(
                `[Invoice] Invoice creation rejected. ` +
                `Grand total is missing. ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Financial grand total is required.",
            });
        }

        // ========================================================
        // PAYMENT VALIDATION
        // ========================================================

        if (!paymentInfo) {
            log.warn(
                `[Invoice] Invoice creation rejected. ` +
                `Payment information is missing. ` +
                `hotelId=${hotelId}, ` +
                `branchId=${branchId}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Payment information is required.",
            });
        }

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

        // ========================================================
        // ROOM SNAPSHOT
        // ========================================================

        const formattedRooms =
            processedRooms.map(
                normalizeRoom
            );

        log.info(
            `[Invoice] Room snapshot prepared. ` +
            `invoiceNo=${invoiceNo}, ` +
            `roomCount=${formattedRooms.length}`
        );

        // ========================================================
        // SERVICE SNAPSHOTS
        // ========================================================

        const normalizedFoodServices =
            normalizeFoodServices(
                foodServicesDetails
            );

        const normalizedRoomServices =
            normalizeRoomServices(
                roomServicesDetails
            );

        // ========================================================
        // CHECKOUT BILLING
        // ========================================================
        //
        // The CheckoutBill backend is the source of truth.
        //
        // IMPORTANT:
        //
        // If financials.roomRent is ₹875:
        //
        //   ₹750 base room rent
        //   ₹125 checkout policy
        //
        // then we must NOT add another ₹125 to subtotal.
        //
        // ========================================================

       // ========================================================
// BASE ROOM RENT
// ========================================================
//
// Do NOT use roomSubtotal here.
//
// roomSubtotal already includes extra charges.
//
// Base room rent:
// ₹250 × 2 nights = ₹500
//
// ========================================================

const calculatedBaseRoomRent = formattedRooms.reduce(
    (total, roomData) => {
        const nights = Math.max(
            0,
            Number(roomData.bookedNights || 0)
        );

        const rate = roundMoney(
            roomData.perNightRoomPrice || 0
        );

        return total + rate * nights;
    },
    0
);

const roomRent = roundMoney(
    calculatedBaseRoomRent
);

log.info(
    `[Invoice] Base room rent calculated. ` +
    `roomRent=${roomRent}, ` +
    `roomCount=${formattedRooms.length}`
);

        const foodTotal =
            roundMoney(
                financials.foodServices ??
                    financials.foodTotal ??
                    0
            );

        const roomServiceTotal =
            roundMoney(
                financials.roomServices ??
                    financials.roomServiceTotal ??
                    0
            );

        // ========================================================
        // CHECKOUT POLICY CHARGE
        // ========================================================

        const checkoutPolicyCharge =
            roundMoney(
                extraCharges?.checkoutPolicyCharge ??
                    extraCharges?.checkoutPolicyAmount ??
                    financials?.checkoutPolicyCharge ??
                    financials?.checkoutPolicyAmount ??
                    extraCharges?.lateCheckoutCharge ??
                    0
            );

        // ========================================================
        // EXTRA NIGHT CHARGE
        // ========================================================
        //
        // This is a real additional full-night charge.
        //
        // Do not use the legacy extraNightCharge field for the
        // before/after 12 PM checkout policy.
        //
        // ========================================================

       // ========================================================
// EXTRA FULL DAY CHARGE
// ========================================================
//
// This is a real additional full-day charge.
//
// Example:
// Extra full day = ₹250
// Checkout policy = ₹125
//
// Both charges MUST be kept.
//
// ========================================================

const extraNightCharge = roundMoney(
    extraCharges?.extraNightCharge ??
        extraCharges?.extraFullDayCharge ??
        financials?.extraNightCharge ??
        financials?.extraFullDayCharge ??
        0
);

const extraNightsStayed = Math.max(
    0,
    Math.floor(
        normalizeNumber(
            extraCharges?.extraNightsStayed ??
                extraCharges?.extraFullDays ??
                staySummary?.extraNights ??
                0
        )
    )
);

log.info(
    `[Invoice] Extra stay charges resolved. ` +
    `extraNightsStayed=${extraNightsStayed}, ` +
    `extraFullDayCharge=${extraNightCharge}, ` +
    `checkoutPolicyCharge=${checkoutPolicyCharge}`
);

     // ========================================================
// EXTRA TIME CHARGE
// ========================================================

const extraTimeCharge = roundMoney(
    extraCharges?.extraTimeCharge ??
        extraCharges?.extraHoursCharge ??
        0
);

// ========================================================
// OTHER CHARGES
// ========================================================

const damageCharge = roundMoney(
    extraCharges?.damageCharge ?? 0
);

const otherCharges = roundMoney(
    extraCharges?.otherCharges ?? 0
);

// ========================================================
// TOTAL EXTRA STAY CHARGES
// ========================================================
//
// ₹250 extra full day
// + ₹125 checkout policy
// = ₹375
//
// ========================================================

const totalExtraStayCharges = roundMoney(
    extraNightCharge +
        checkoutPolicyCharge +
        extraTimeCharge +
        damageCharge +
        otherCharges
);

log.info(
    `[Invoice] Total extra stay charges calculated. ` +
    `extraFullDay=${extraNightCharge}, ` +
    `checkoutPolicy=${checkoutPolicyCharge}, ` +
    `extraTime=${extraTimeCharge}, ` +
    `damage=${damageCharge}, ` +
    `other=${otherCharges}, ` +
    `total=${totalExtraStayCharges}`
);

        // ========================================================
        // SUBTOTAL
        // ========================================================
        //
        // Prefer backend subtotal.
        //
        // Fallback:
        //
        // roomRent + food + roomService
        //
        // Do NOT add checkoutPolicyCharge here because the
        // backend roomRent already contains it when using the
        // current CheckoutBill calculation.
        //
        // ========================================================

        const subtotal = roundMoney(
    financials.subTotal ??
        financials.subtotal ??
        (
            roomRent +
            totalExtraStayCharges +
            foodTotal +
            roomServiceTotal
        )
);

        // ========================================================
        // GST
        // ========================================================

        const gstPercentage =
            Math.max(
                0,
                normalizeNumber(
                    financials.gstPercentage ??
                        financials.gst?.rate ??
                        0
                )
            );

        const gstAmount =
            roundMoney(
                financials.gstAmount ??
                    financials.gst?.amount ??
                    (
                        subtotal *
                        gstPercentage /
                        100
                    )
            );

        // ========================================================
        // GRAND TOTAL
        // ========================================================

        const grandTotal =
            roundMoney(
                financials.grandTotal ??
                    (
                        subtotal +
                        gstAmount
                    )
            );

        // ========================================================
        // ADVANCE PAYMENT
        // ========================================================

        const advancePaid =
            Math.max(
                0,
                roundMoney(
                    financials.advancePaid ??
                        financials.initialPaidAmount ??
                        0
                )
            );

        // ========================================================
        // CURRENT PAYMENT
        // ========================================================

        const currentPayment =
            Math.max(
                0,
                roundMoney(
                    financials.currentPayment ??
                        financials.balanceDue ??
                        0
                )
            );

        // ========================================================
        // TOTAL PAID
        // ========================================================

        const totalPaid =
            roundMoney(
                advancePaid +
                    currentPayment
            );

        // ========================================================
        // BALANCE DUE
        // ========================================================
        //
        // NEVER trust an old frontend balance value.
        //
        // Always derive:
        //
        // grandTotal - totalPaid
        //
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
        // STAY SUMMARY
        // ========================================================

        const bookedNights =
            Math.max(
                0,
                Math.floor(
                    normalizeNumber(
                        staySummary?.bookedNights
                    )
                )
            );

        const actualTotalNights =
            Math.max(
                bookedNights,
                Math.floor(
                    normalizeNumber(
                        staySummary?.totalNightsStayed
                    )
                )
            );

        const calculatedExtraNights =
            Math.max(
                0,
                actualTotalNights -
                    bookedNights
            );

        const finalExtraNights =
            Math.max(
                extraNightsStayed,
                calculatedExtraNights
            );

let overstayDescription =
    normalizeString(
        staySummary?.overstayDescription
    );

if (
    !overstayDescription &&
    finalExtraNights > 0
) {
    overstayDescription =
        `${finalExtraNights} extra night${
            finalExtraNights > 1
                ? "s"
                : ""
        }`;
}

const checkoutPolicyText =
    "checkout time policy charge";

if (
    checkoutPolicyCharge > 0 &&
    !overstayDescription
        .toLowerCase()
        .includes(checkoutPolicyText)
) {
    overstayDescription =
        overstayDescription
            ? `${overstayDescription} + ${checkoutPolicyText}`
            : "Checkout time policy charge";
}

        // ========================================================
        // INVOICE ROOM ITEMS
        // ========================================================
        //
        // The item represents BASE ROOM RENT only.
        //
        // Example:
        //
        // ₹250 × 3 = ₹750
        //
        // Checkout policy ₹125 is stored separately.
        //
        // ========================================================

        // ========================================================
// INVOICE ITEMS
// ========================================================
//
// 1. Normal room rent
// 2. Extra full day
// 3. Checkout time policy
//
// ========================================================

const invoiceItems = formattedRooms.map(
    (roomData, index) => {
        const nights = Math.max(
            0,
            Math.floor(
                Number(
                    roomData.bookedNights || 0
                )
            )
        );

        const unitPrice = roundMoney(
            roomData.perNightRoomPrice || 0
        );

        const total = roundMoney(
            unitPrice * nights
        );

        return {
            description:
                `Room Rent - ${
                    roomData.roomNumber ||
                    index + 1
                } (${
                    roomData.roomType ||
                    "Room"
                } - ${nights} ${
                    nights === 1
                        ? "Night"
                        : "Nights"
                })`,

            unitPrice,

            quantity: nights,

            total,
        };
    }
);

// ========================================================
// EXTRA FULL DAY ITEM
// ========================================================

if (
    extraNightsStayed > 0 &&
    extraNightCharge > 0
) {
    invoiceItems.push({
        description:
            extraNightsStayed === 1
                ? "Extra Full Day Stay"
                : "Extra Full Day Stay",

        unitPrice: roundMoney(
            extraNightCharge /
                extraNightsStayed
        ),

        quantity: extraNightsStayed,

        total: roundMoney(
            extraNightCharge
        ),
    });
}

// ========================================================
// CHECKOUT POLICY ITEM
// ========================================================

if (checkoutPolicyCharge > 0) {
    const checkoutPolicyType =
        normalizeString(
            extraCharges?.checkoutPolicyType
        );

    const checkoutPolicyLabel =
        checkoutPolicyType ===
        "before12PM"
            ? "Checkout Time Policy - Before 12 PM"
            : checkoutPolicyType ===
              "after12PM"
            ? "Checkout Time Policy - After 12 PM"
            : "Checkout Time Policy";

    invoiceItems.push({
        description:
            checkoutPolicyLabel,

        unitPrice:
            checkoutPolicyCharge,

        quantity: 1,

        total:
            checkoutPolicyCharge,
    });
}

log.info(
    `[Invoice] Invoice items prepared. ` +
    `roomItems=${formattedRooms.length}, ` +
    `extraFullDay=${extraNightCharge}, ` +
    `checkoutPolicy=${checkoutPolicyCharge}, ` +
    `itemCount=${invoiceItems.length}`
);

        log.info(
            `[Invoice] Checkout billing normalized. ` +
            `invoiceNo=${invoiceNo}, ` +
            `roomRent=${roomRent}, ` +
            `checkoutPolicyCharge=${checkoutPolicyCharge}, ` +
            `foodTotal=${foodTotal}, ` +
            `roomServiceTotal=${roomServiceTotal}, ` +
            `subtotal=${subtotal}, ` +
            `gst=${gstAmount}, ` +
            `grandTotal=${grandTotal}, ` +
            `advancePaid=${advancePaid}, ` +
            `currentPayment=${currentPayment}, ` +
            `totalPaid=${totalPaid}, ` +
            `balanceDue=${balanceDue}`
        );

        // ========================================================
        // CREATE INVOICE DOCUMENT
        // ========================================================

        log.info(
            `[Invoice] Creating invoice document. ` +
            `invoiceNo=${invoiceNo}, ` +
            `hotelId=${hotelId}, ` +
            `branchId=${branchId}, ` +
            `customerId=${customerId || "none"}`
        );

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
                    normalizeString(
                        req.body.invoiceDate
                    ) ||
                    formatInvoiceDate(),

                // ==================================================
                // CUSTOMER
                // ==================================================

                customerId:
                    customerId || null,

                customer: {
                    customerId:
                        customerId || null,

                    customerName:
                        normalizeString(
                            customer.customerName
                        ),

                    phoneNumber:
                        normalizeString(
                            customer.phoneNumber
                        ),

                    alternativePhone:
                        normalizeString(
                            customer.alternativePhone ??
                                customer.altPhone
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
                            customer.idProofType ??
                                customer.idProof
                        ),

                    idProofNumber:
                        normalizeString(
                            customer.idProofNumber
                        ),

                    rooms:
                        formattedRooms,

                    // Backward compatibility.
                    roomNumber:
                        formattedRooms[0]
                            ?.roomNumber || "",

                    roomType:
                        formattedRooms[0]
                            ?.roomType || "",

                    bedType:
                        formattedRooms[0]
                            ?.bedType || "",

                    adults:
                        formattedRooms[0]
                            ?.adults || 0,

                    children:
                        formattedRooms[0]
                            ?.children || 0,
                },

                // ==================================================
                // ROOMS
                // ==================================================

                rooms:
                    formattedRooms,

                room:
                    formattedRooms[0] || {},

                // ==================================================
                // STAY SUMMARY
                // ==================================================

                staySummary: {
                    bookedCheckIn:
                        staySummary?.bookedCheckIn ||
                        "",

                    bookedCheckInTime:
                        staySummary?.bookedCheckInTime ||
                        "",

                    bookedCheckOut:
                        staySummary?.bookedCheckOut ||
                        "",

                    bookedCheckOutTime:
                        staySummary?.bookedCheckOutTime ||
                        "",

                    actualCheckOut:
                        staySummary?.actualCheckOut ||
                        "",

                    actualCheckOutDate:
                        staySummary?.actualCheckOutDate ||
                        "",

                    actualCheckOutTime:
                        staySummary?.actualCheckOutTime ||
                        "",

                    bookedNights,

                    extraNights:
                        finalExtraNights,

                    extraHours:
                        Math.max(
                            0,
                            Math.floor(
                                normalizeNumber(
                                    staySummary?.extraHours
                                )
                            )
                        ),

                    extraMinutes:
                        Math.max(
                            0,
                            Math.floor(
                                normalizeNumber(
                                    staySummary?.extraMinutes
                                )
                            )
                        ),

                    extraTime:
                        normalizeString(
                            staySummary?.extraTime
                        ),

                    totalExtraStayMinutes:
                        Math.max(
                            0,
                            Math.floor(
                                normalizeNumber(
                                    staySummary?.totalExtraStayMinutes
                                )
                            )
                        ),

                    totalNightsStayed:
                        actualTotalNights,

                    overstayDescription,
                },

                // ==================================================
                // ITEMS
                // ==================================================

                items:
                    invoiceItems,

                // ==================================================
                // FOOD SERVICES
                // ==================================================

                foodServicesDetails:
                    normalizedFoodServices,

                // ==================================================
                // ROOM SERVICES
                // ==================================================

                roomServicesDetails:
                    normalizedRoomServices,

               extraCharges: {
    // Extra full-day stay
    extraNightsStayed:
        extraNightsStayed,

    extraNightRate:
        roundMoney(
            extraCharges?.extraNightRate ??
                formattedRooms[0]
                    ?.perNightRoomPrice ??
                0
        ),

    // IMPORTANT:
    // This is the actual extra full-day amount.
    extraNightCharge:
        extraNightCharge,

    extraHoursStayed:
        Math.max(
            0,
            Math.floor(
                normalizeNumber(
                    extraCharges?.extraHoursStayed ??
                        staySummary?.extraHours ??
                        0
                )
            )
        ),

    extraMinutesStayed:
        Math.max(
            0,
            Math.floor(
                normalizeNumber(
                    extraCharges?.extraMinutesStayed ??
                        staySummary?.extraMinutes ??
                        0
                )
            )
        ),

    extraHoursCharge:
        extraTimeCharge,

    extraTimeCharge:
        extraTimeCharge,

    extraTimeChargeType:
        extraTimeCharge > 0
            ? normalizeString(
                  extraCharges?.extraTimeChargeType
              ) ||
              "Extra time charge"
            : "No extra time charge",

    extraTimeRatePercentage:
        normalizeNumber(
            extraCharges?.extraTimeRatePercentage
        ),

    // Checkout time policy.
    // This is SEPARATE from extraNightCharge.
    lateCheckoutCharge:
        checkoutPolicyCharge,

    damageCharge:
        damageCharge,

    otherCharges:
        otherCharges,

    otherChargesDescription:
        normalizeString(
            extraCharges?.otherChargesDescription
        ),

    // ₹250 + ₹125 = ₹375
    total:
        totalExtraStayCharges,
},
                // ==================================================
                // FINANCIALS
                // ==================================================

              financials: {
    // ONLY base room rent
    roomRent:
        roomRent,

    roomRentPerNight:
        roundMoney(
            financials.roomRentPerNight ??
                formattedRooms[0]
                    ?.perNightRoomPrice ??
                0
        ),

    foodServices:
        foodTotal,

    roomServices:
        roomServiceTotal,

    // Extra full-day charge
    extraNightCharge:
        extraNightCharge,

    extraTimeCharge:
        extraTimeCharge,

    // ₹250 + ₹125
    totalExtraStayCharges:
        totalExtraStayCharges,

    // ₹875
    subTotal:
        subtotal,

    gstPercentage:
        gstPercentage,

    gstAmount:
        gstAmount,

    // ₹945
    grandTotal:
        grandTotal,

    advancePaid:
        advancePaid,

    advancePaidVia:
        normalizeString(
            financials.advancePaidVia,
            "cash"
        ),

    currentPayment:
        currentPayment,

    totalPaid:
        totalPaid,

    balanceDue:
        balanceDue,
},

                // ==================================================
                // BILLING DETAILS
                // ==================================================

                billingDetails:
                    billingDetails &&
                    typeof billingDetails ===
                        "object"
                        ? billingDetails
                        : {},

                // ==================================================
                // PAYMENT INFORMATION
                // ==================================================

                paymentInfo: {
                    paymentMode:
                        normalizeString(
                            paymentInfo.paymentMode,
                            "Cash"
                        ),

                    paymentStatus:
                        normalizeString(
                            paymentInfo.paymentStatus,
                            "PAID"
                        ),

                    paidAt:
                        paymentInfo.paidAt ||
                        "",

                    transactionId:
                        normalizeString(
                            paymentInfo.transactionId
                        ),
                },

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

        log.info(
            `[Invoice] Invoice created successfully. ` +
            `invoiceId=${newInvoice._id}, ` +
            `invoiceNo=${newInvoice.invoiceNo}, ` +
            `grandTotal=${grandTotal}, ` +
            `totalPaid=${totalPaid}, ` +
            `balanceDue=${balanceDue}`
        );

        return res.status(201).json({
            success: true,
            message:
                "Invoice stored successfully.",
            data: newInvoice,
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

                customerId:
                    req.body?.customer?.customerId ||
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