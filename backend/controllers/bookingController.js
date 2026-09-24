import mongoose from "mongoose";

import Booking from "../models/booking.js";
import Customer from "../models/customers.js";
import Room from "../models/room.js";

import { log } from "../util/logger.js";

// ============================================================
// COMMON HELPERS
// ============================================================

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ------------------------------------------------------------
// GET TENANT FROM AUTHENTICATED USER
// IMPORTANT:
// Never take hotelId / branchId from req.body.
// Always take them from req.user.
// ------------------------------------------------------------

const getTenantIds = (req, res, operation = "booking operation") => {
  const hotelId = req.user?.hotelId;
  const branchId = req.user?.branchId;

  if (!hotelId) {
    log.error(
      `[Booking] ${operation} failed - hotelId missing from authenticated user. userId=${req.user?._id || "unknown"}`
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
      `[Booking] ${operation} failed - branchId missing from authenticated user. hotelId=${hotelId}, userId=${req.user?._id || "unknown"}`
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
      `[Booking] ${operation} failed - invalid hotelId. hotelId=${hotelId}, userId=${req.user?._id || "unknown"}`
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
      `[Booking] ${operation} failed - invalid branchId. branchId=${branchId}, hotelId=${hotelId}, userId=${req.user?._id || "unknown"}`
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

// ------------------------------------------------------------
// COMMON ERROR HANDLER
// ------------------------------------------------------------

const handleControllerError = (
  res,
  error,
  operation,
  context = {}
) => {
  log.error(
    `[Booking] ${operation} failed. ${JSON.stringify(
      context
    )}. error=${error?.message || error}`
  );

  // Mongo duplicate key
  if (error?.code === 11000) {
    log.error(
      `[Booking] ${operation} duplicate-key error. ${JSON.stringify(
        error?.keyValue || {}
      )}`
    );

    return res.status(409).json({
      success: false,
      message:
        "This booking information already exists. Please check the entered details.",
    });
  }

  // Mongoose validation error
  if (error?.name === "ValidationError") {
    const messages = Object.values(
      error.errors || {}
    )
      .map((item) => item.message)
      .filter(Boolean);

    return res.status(400).json({
      success: false,
      message:
        messages.length > 0
          ? messages.join(" ")
          : "Some booking information is invalid. Please check your details.",
    });
  }

  // Cast error
  if (error?.name === "CastError") {
    return res.status(400).json({
      success: false,
      message:
        "One of the provided IDs is invalid. Please refresh the page and try again.",
    });
  }

  return res.status(500).json({
    success: false,
    message:
      "Something went wrong while processing the booking. Please try again later.",
  });
};

// ------------------------------------------------------------
// ROOM ID NORMALIZER
// ------------------------------------------------------------

const normalizeRoomId = (room) => {
  return (
    room?.roomId ||
    room?._id ||
    room?.id ||
    null
  );
};

// ------------------------------------------------------------
// CALCULATE ROOM NIGHTS
// ------------------------------------------------------------

const calculateRoomNights = (
  checkIn,
  checkOut
) => {
  if (!checkIn || !checkOut) {
    return 1;
  }

  const start = new Date(checkIn);
  const end = new Date(checkOut);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.ceil(
      (end.getTime() - start.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
};

// ------------------------------------------------------------
// CALCULATE ROOM TOTAL
// ------------------------------------------------------------

const calculateRoomTotal = (rooms = []) => {
  return rooms.reduce((total, room) => {
    const price = Number(
      room.pricePerNight || 0
    );

    const nights = calculateRoomNights(
      room.checkIn,
      room.checkOut
    );

    return total + price * nights;
  }, 0);
};

// ------------------------------------------------------------
// CALCULATE FOOD TOTAL
// ------------------------------------------------------------

const calculateFoodTotal = (rooms = []) => {
  return rooms.reduce((total, room) => {
    const roomFoodTotal = (
      room.foodServices || []
    ).reduce((sum, food) => {
      const value =
        food.total !== undefined
          ? Number(food.total || 0)
          : Number(food.price || 0) *
            Number(food.quantity || 1);

      return sum + value;
    }, 0);

    return total + roomFoodTotal;
  }, 0);
};

// ------------------------------------------------------------
// CALCULATE ROOM SERVICE TOTAL
// ------------------------------------------------------------

const calculateRoomServiceTotal = (
  rooms = []
) => {
  return rooms.reduce((total, room) => {
    const roomServiceTotal = (
      room.roomServices || []
    ).reduce((sum, service) => {
      const value =
        service.total !== undefined
          ? Number(service.total || 0)
          : Number(service.fees || 0) *
            Number(service.quantity || 1);

      return sum + value;
    }, 0);

    return total + roomServiceTotal;
  }, 0);
};

// ------------------------------------------------------------
// CALCULATE TOTAL PAID
// ------------------------------------------------------------

const calculateTotalPaid = (booking) => {
  return (booking.payments || []).reduce(
    (total, payment) =>
      total + Number(payment.amount || 0),
    0
  );
};

// ------------------------------------------------------------
// CALCULATE FINANCIALS
// ------------------------------------------------------------

const calculateFinancials = (booking) => {
  const rooms = booking.rooms || [];

  const roomTotal =
    calculateRoomTotal(rooms);

  const foodTotal =
    calculateFoodTotal(rooms);

  const roomServiceTotal =
    calculateRoomServiceTotal(rooms);

  const extraChargeTotal = Number(
    booking.financials?.extraChargeTotal || 0
  );

  const gstAmount = Number(
    booking.financials?.gstAmount || 0
  );

  const grandTotal =
    roomTotal +
    foodTotal +
    roomServiceTotal +
    extraChargeTotal +
    gstAmount;

  const totalPaid =
    calculateTotalPaid(booking);

  const balanceDue = Math.max(
    0,
    grandTotal - totalPaid
  );

  return {
    roomTotal,
    foodTotal,
    roomServiceTotal,
    extraChargeTotal,
    gstAmount,
    grandTotal,
    totalPaid,
    balanceDue,
  };
};

// ============================================================
// CREATE BOOKING
// ============================================================

export const createBooking = async (
  req,
  res
) => {
  let tenant;

  try {
    log.info(
      `[Booking] Create booking started. userId=${req.user?._id || "unknown"}`
    );

    tenant = getTenantIds(
      req,
      res,
      "create booking"
    );

    if (!tenant) return;

    const { hotelId, branchId } =
      tenant;

    log.info(
      `[Booking] Create booking tenant resolved. hotelId=${hotelId}, branchId=${branchId}`
    );

    const {
      customerId,
      rooms = [],
      initialPaidAmount = 0,
      initialPaidVia = "Cash",
      gstAmount = 0,
      extraChargeTotal = 0,
    } = req.body;

    // --------------------------------------------------------
    // CUSTOMER VALIDATION
    // --------------------------------------------------------

    if (!customerId) {
      log.warn(
        `[Booking] Create booking rejected - customerId missing. hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "Please select a customer before creating the booking.",
      });
    }

    if (!isValidObjectId(customerId)) {
      log.warn(
        `[Booking] Create booking rejected - invalid customerId=${customerId}. hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "The selected customer is invalid. Please select the customer again.",
      });
    }

    log.info(
      `[Booking] Checking customer. customerId=${customerId}, hotelId=${hotelId}, branchId=${branchId}`
    );

    const customer =
      await Customer.findOne({
        _id: customerId,
        hotelId,
        branchId,
      });

    if (!customer) {
      log.warn(
        `[Booking] Customer not found in tenant. customerId=${customerId}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(404).json({
        success: false,
        message:
          "The selected customer was not found in your branch.",
      });
    }

    log.info(
      `[Booking] Customer validated. customerId=${customerId}, hotelId=${hotelId}, branchId=${branchId}`
    );

    // --------------------------------------------------------
    // ROOM VALIDATION
    // --------------------------------------------------------

    if (
      !Array.isArray(rooms) ||
      rooms.length === 0
    ) {
      log.warn(
        `[Booking] Create booking rejected - no rooms. hotelId=${hotelId}, branchId=${branchId}, customerId=${customerId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "Please select at least one room.",
      });
    }

    log.info(
      `[Booking] Validating ${rooms.length} room(s). hotelId=${hotelId}, branchId=${branchId}`
    );

    const formattedRooms = [];

    for (const inputRoom of rooms) {
      const roomId =
        normalizeRoomId(inputRoom);

      if (
        !roomId ||
        !isValidObjectId(roomId)
      ) {
        log.warn(
          `[Booking] Invalid roomId. roomId=${roomId}, roomNumber=${inputRoom?.roomNumber || "unknown"}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message: `The selected room ${
            inputRoom?.roomNumber || ""
          } is invalid. Please select the room again.`,
        });
      }

      log.info(
        `[Booking] Checking room. roomId=${roomId}, hotelId=${hotelId}, branchId=${branchId}`
      );

      const physicalRoom =
        await Room.findOne({
          _id: roomId,
          hotelId,
          branchId,
        });

      if (!physicalRoom) {
        log.warn(
          `[Booking] Room not found in tenant. roomId=${roomId}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(404).json({
          success: false,
          message:
            "The selected room was not found in your branch.",
        });
      }

      if (
        String(physicalRoom.status || "")
          .trim()
          .toLowerCase() !==
        "available"
      ) {
        log.warn(
          `[Booking] Room unavailable. roomId=${roomId}, roomNumber=${physicalRoom.roomNumber}, status=${physicalRoom.status}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message: `Room ${physicalRoom.roomNumber} is not available right now.`,
        });
      }

      formattedRooms.push({
        roomId: physicalRoom._id,

        roomNumber:
          physicalRoom.roomNumber,

        roomType:
          physicalRoom.roomType,

        bedType:
          physicalRoom.bedType,

        pricePerNight: Number(
          inputRoom.pricePerNight ??
            physicalRoom.pricePerNight ??
            0
        ),

        adults: Number(
          inputRoom.adults || 1
        ),

        children: Number(
          inputRoom.children || 0
        ),

        checkIn:
          inputRoom.checkIn || null,

        checkInTime:
          inputRoom.checkInTime || "",

        checkOut:
          inputRoom.checkOut || null,

        checkOutTime:
          inputRoom.checkOutTime || "",

        actualCheckoutDate: "",

        actualCheckoutTime: "",

        checkoutStatus: "Staying",

        foodServices:
          Array.isArray(
            inputRoom.foodServices
          )
            ? inputRoom.foodServices
            : [],

        roomServices:
          Array.isArray(
            inputRoom.roomServices
          )
            ? inputRoom.roomServices
            : [],
      });
    }

    log.info(
      `[Booking] All rooms validated. hotelId=${hotelId}, branchId=${branchId}, roomCount=${formattedRooms.length}`
    );

    // --------------------------------------------------------
    // INITIAL PAYMENT
    // --------------------------------------------------------

    const safeInitialPaidAmount =
      Math.max(
        0,
        Number(initialPaidAmount || 0)
      );

    if (
      !Number.isFinite(
        safeInitialPaidAmount
      )
    ) {
      log.warn(
        `[Booking] Invalid initial payment amount. value=${initialPaidAmount}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "The initial payment amount is invalid.",
      });
    }

    const safeInitialPaidVia =
      String(
        initialPaidVia || "Cash"
      ).trim();

    // --------------------------------------------------------
    // CREATE BOOKING
    // --------------------------------------------------------

    log.info(
      `[Booking] Creating booking document. hotelId=${hotelId}, branchId=${branchId}, customerId=${customerId}`
    );

    const booking = new Booking({
      hotelId,
      branchId,

      customerId,

      rooms: formattedRooms,

      bookingStatus: "Active",

      initialPaidAmount:
        safeInitialPaidAmount,

      initialPaidVia:
        safeInitialPaidVia,

      initialPaidUsedAmount: 0,

      payments:
        safeInitialPaidAmount > 0
          ? [
              {
                amount:
                  safeInitialPaidAmount,

                paymentType: "Initial",

                paymentVia:
                  safeInitialPaidVia,

                paidAt: new Date(),
              },
            ]
          : [],

      financials: {
        roomTotal: 0,
        foodTotal: 0,
        roomServiceTotal: 0,

        extraChargeTotal:
          Number(extraChargeTotal || 0),

        gstAmount:
          Number(gstAmount || 0),

        grandTotal: 0,

        totalPaid:
          safeInitialPaidAmount,

        balanceDue: 0,
      },
    });

    booking.financials =
      calculateFinancials(booking);

    await booking.save();

    log.info(
      `[Booking] Booking created successfully. bookingId=${booking._id}, hotelId=${hotelId}, branchId=${branchId}, customerId=${customerId}`
    );

    // --------------------------------------------------------
    // MARK ROOMS BOOKED
    // --------------------------------------------------------

    log.info(
      `[Booking] Updating physical rooms to booked. bookingId=${booking._id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    await Promise.all(
      formattedRooms.map((room) =>
        Room.findOneAndUpdate(
          {
            _id: room.roomId,
            hotelId,
            branchId,
          },
          {
            status: "booked",
          }
        )
      )
    );

    log.info(
      `[Booking] Physical rooms marked as booked. bookingId=${booking._id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    // --------------------------------------------------------
    // POPULATE RESPONSE
    // --------------------------------------------------------

    const populatedBooking =
      await Booking.findOne({
        _id: booking._id,
        hotelId,
        branchId,
      })
        .populate("customerId")
        .populate("rooms.roomId");

    log.info(
      `[Booking] Create booking completed. bookingId=${booking._id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    return res.status(201).json({
      success: true,
      message:
        "Booking created successfully.",
      booking: populatedBooking,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "create booking",
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
          req.body?.customerId ||
          "unknown",
      }
    );
  }
};

// ============================================================
// GET ALL BOOKINGS
// ============================================================

export const getAllBookings = async (
  req,
  res
) => {
  let tenant;

  try {
    tenant = getTenantIds(
      req,
      res,
      "get all bookings"
    );

    if (!tenant) return;

    const { hotelId, branchId } =
      tenant;

    log.info(
      `[Booking] Get all bookings started. hotelId=${hotelId}, branchId=${branchId}`
    );

    const bookings =
      await Booking.find({
        hotelId,
        branchId,
      })
        .populate("customerId")
        .populate("rooms.roomId")
        .sort({ createdAt: -1 });

    log.info(
      `[Booking] Get all bookings completed. hotelId=${hotelId}, branchId=${branchId}, count=${bookings.length}`
    );

    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "get all bookings",
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
// GET BOOKING BY ID
// ============================================================

export const getBookingById = async (
  req,
  res
) => {
  let tenant;

  try {
    tenant = getTenantIds(
      req,
      res,
      "get booking"
    );

    if (!tenant) return;

    const { hotelId, branchId } =
      tenant;

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      log.warn(
        `[Booking] Get booking rejected - invalid bookingId=${id}. hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "The booking ID is invalid. Please refresh and try again.",
      });
    }

    log.info(
      `[Booking] Finding booking. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    const booking =
      await Booking.findOne({
        _id: id,
        hotelId,
        branchId,
      })
        .populate("customerId")
        .populate("rooms.roomId");

    if (!booking) {
      log.warn(
        `[Booking] Booking not found in tenant. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(404).json({
        success: false,
        message:
          "Booking not found in your branch.",
      });
    }

    log.info(
      `[Booking] Booking retrieved. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "get booking",
      {
        hotelId:
          tenant?.hotelId ||
          req.user?.hotelId ||
          "unknown",
        branchId:
          tenant?.branchId ||
          req.user?.branchId ||
          "unknown",
        bookingId: req.params?.id,
      }
    );
  }
};

// ============================================================
// GET BOOKINGS BY CUSTOMER
// ============================================================

export const getBookingsByCustomer =
  async (req, res) => {
    let tenant;

    try {
      tenant = getTenantIds(
        req,
        res,
        "get customer bookings"
      );

      if (!tenant) return;

      const { hotelId, branchId } =
        tenant;

      const { customerId } =
        req.params;

      if (!isValidObjectId(customerId)) {
        log.warn(
          `[Booking] Customer bookings rejected - invalid customerId=${customerId}. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "The customer ID is invalid.",
        });
      }

      log.info(
        `[Booking] Checking customer for booking history. customerId=${customerId}, hotelId=${hotelId}, branchId=${branchId}`
      );

      const customer =
        await Customer.findOne({
          _id: customerId,
          hotelId,
          branchId,
        });

      if (!customer) {
        log.warn(
          `[Booking] Customer not found in tenant. customerId=${customerId}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(404).json({
          success: false,
          message:
            "Customer not found in your branch.",
        });
      }

      const bookings =
        await Booking.find({
          customerId,
          hotelId,
          branchId,
        })
          .populate("customerId")
          .populate("rooms.roomId")
          .sort({ createdAt: -1 });

      log.info(
        `[Booking] Customer bookings retrieved. customerId=${customerId}, hotelId=${hotelId}, branchId=${branchId}, count=${bookings.length}`
      );

      return res.status(200).json({
        success: true,
        count: bookings.length,
        bookings,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "get customer bookings",
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
            req.params?.customerId,
        }
      );
    }
  };

// ============================================================
// GET ACTIVE BOOKINGS
// ============================================================

export const getActiveBookings =
  async (req, res) => {
    let tenant;

    try {
      tenant = getTenantIds(
        req,
        res,
        "get active bookings"
      );

      if (!tenant) return;

      const { hotelId, branchId } =
        tenant;

      log.info(
        `[Booking] Get active bookings started. hotelId=${hotelId}, branchId=${branchId}`
      );

      const bookings =
        await Booking.find({
          hotelId,
          branchId,

          bookingStatus: {
            $in: [
              "Active",
              "Partially Checked Out",
            ],
          },

          rooms: {
            $elemMatch: {
              checkoutStatus: {
                $in: [
                  "Staying",
                  "Overstayed",
                ],
              },
            },
          },
        })
          .populate("customerId")
          .populate("rooms.roomId")
          .sort({ createdAt: -1 });

      log.info(
        `[Booking] Active bookings retrieved. hotelId=${hotelId}, branchId=${branchId}, count=${bookings.length}`
      );

      return res.status(200).json({
        success: true,
        count: bookings.length,
        bookings,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "get active bookings",
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
// UPDATE BOOKING
// ============================================================

export const updateBooking = async (
  req,
  res
) => {
  let tenant;

  try {
    tenant = getTenantIds(
      req,
      res,
      "update booking"
    );

    if (!tenant) return;

    const { hotelId, branchId } =
      tenant;

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      log.warn(
        `[Booking] Update rejected - invalid bookingId=${id}. hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "The booking ID is invalid.",
      });
    }

    log.info(
      `[Booking] Finding booking for update. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    const booking =
      await Booking.findOne({
        _id: id,
        hotelId,
        branchId,
      });

    if (!booking) {
      log.warn(
        `[Booking] Update rejected - booking not found. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(404).json({
        success: false,
        message:
          "Booking not found in your branch.",
      });
    }

    const {
      bookingStatus,
      rooms,
      financials,
    } = req.body;

    if (
      bookingStatus !== undefined
    ) {
      booking.bookingStatus =
        bookingStatus;
    }

    if (Array.isArray(rooms)) {
      booking.rooms = rooms;
    }

    if (financials) {
      booking.financials = {
        ...(booking.financials?.toObject?.() ||
          booking.financials ||
          {}),
        ...financials,
      };
    }

    const calculated =
      calculateFinancials(booking);

    booking.financials = {
      ...booking.financials.toObject(),
      ...calculated,
    };

    log.info(
      `[Booking] Saving booking update. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    await booking.save();

    const updatedBooking =
      await Booking.findOne({
        _id: id,
        hotelId,
        branchId,
      })
        .populate("customerId")
        .populate("rooms.roomId");

    log.info(
      `[Booking] Booking updated successfully. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    return res.status(200).json({
      success: true,
      message:
        "Booking updated successfully.",
      booking: updatedBooking,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "update booking",
      {
        hotelId:
          tenant?.hotelId ||
          req.user?.hotelId ||
          "unknown",
        branchId:
          tenant?.branchId ||
          req.user?.branchId ||
          "unknown",
        bookingId: req.params?.id,
      }
    );
  }
};

// ============================================================
// ADD BOOKING PAYMENT
// ============================================================

export const addBookingPayment =
  async (req, res) => {
    let tenant;

    try {
      tenant = getTenantIds(
        req,
        res,
        "add booking payment"
      );

      if (!tenant) return;

      const { hotelId, branchId } =
        tenant;

      const { id } = req.params;

      const {
        amount,
        paymentType = "Checkout",
        paymentVia = "Cash",
      } = req.body;

      if (!isValidObjectId(id)) {
        log.warn(
          `[Booking] Payment rejected - invalid bookingId=${id}. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "The booking ID is invalid.",
        });
      }

      const booking =
        await Booking.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!booking) {
        log.warn(
          `[Booking] Payment rejected - booking not found. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(404).json({
          success: false,
          message:
            "Booking not found in your branch.",
        });
      }

      const safeAmount =
        Number(amount || 0);

      if (
        !Number.isFinite(
          safeAmount
        ) ||
        safeAmount <= 0
      ) {
        log.warn(
          `[Booking] Payment rejected - invalid amount. bookingId=${id}, amount=${amount}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Payment amount must be greater than zero.",
        });
      }

      log.info(
        `[Booking] Adding payment. bookingId=${id}, amount=${safeAmount}, paymentType=${paymentType}, paymentVia=${paymentVia}, hotelId=${hotelId}, branchId=${branchId}`
      );

      booking.payments.push({
        amount: safeAmount,

        paymentType,

        paymentVia:
          String(
            paymentVia || "Cash"
          ).trim(),

        paidAt: new Date(),
      });

      booking.financials =
        calculateFinancials(booking);

      await booking.save();

      log.info(
        `[Booking] Payment added successfully. bookingId=${id}, amount=${safeAmount}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Payment added successfully.",
        booking,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "add booking payment",
        {
          hotelId:
            tenant?.hotelId ||
            req.user?.hotelId ||
            "unknown",
          branchId:
            tenant?.branchId ||
            req.user?.branchId ||
            "unknown",
          bookingId: req.params?.id,
        }
      );
    }
  };

// ============================================================
// CHECKOUT ROOMS
// ============================================================

export const checkoutRooms = async (
  req,
  res
) => {
  let tenant;

  try {
    tenant = getTenantIds(
      req,
      res,
      "checkout rooms"
    );

    if (!tenant) return;

    const { hotelId, branchId } =
      tenant;

    const { id } = req.params;

    const {
      roomIds,
      roomNumbers,
      actualCheckoutDate = "",
      actualCheckoutTime = "",
      checkoutPaymentAmount = 0,
      paymentVia = "Cash",
      extraChargeTotal = 0,
    } = req.body;

    if (!isValidObjectId(id)) {
      log.warn(
        `[Booking] Checkout rejected - invalid bookingId=${id}. hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "The booking ID is invalid.",
      });
    }

    log.info(
      `[Booking] Finding booking for checkout. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    const booking =
      await Booking.findOne({
        _id: id,
        hotelId,
        branchId,
      });

    if (!booking) {
      log.warn(
        `[Booking] Checkout rejected - booking not found. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(404).json({
        success: false,
        message:
          "Booking not found in your branch.",
      });
    }

    const selectedIds =
      Array.isArray(roomIds)
        ? roomIds.map(String)
        : [];

    const selectedNumbers =
      Array.isArray(roomNumbers)
        ? roomNumbers.map((number) =>
            String(number).trim()
          )
        : [];

    if (
      selectedIds.length === 0 &&
      selectedNumbers.length === 0
    ) {
      log.warn(
        `[Booking] Checkout rejected - no rooms selected. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "Please select at least one room for checkout.",
      });
    }

    const selectedRooms =
      booking.rooms.filter((room) => {
        const roomIdString =
          String(room.roomId);

        const roomNumber =
          String(
            room.roomNumber
          ).trim();

        const active =
          room.checkoutStatus ===
            "Staying" ||
          room.checkoutStatus ===
            "Overstayed";

        const selected =
          selectedIds.includes(
            roomIdString
          ) ||
          selectedNumbers.includes(
            roomNumber
          );

        return active && selected;
      });

    if (
      selectedRooms.length === 0
    ) {
      log.warn(
        `[Booking] Checkout rejected - no active selected rooms. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "No active selected rooms were found for checkout.",
      });
    }

    log.info(
      `[Booking] ${selectedRooms.length} room(s) selected for checkout. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    const availableInitialPayment =
      Math.max(
        0,
        Number(
          booking.initialPaidAmount || 0
        ) -
          Number(
            booking.initialPaidUsedAmount ||
              0
          )
      );

    // --------------------------------------------------------
    // MARK ROOMS CHECKED OUT
    // --------------------------------------------------------

    for (const room of selectedRooms) {
      room.checkoutStatus =
        "Checked Out";

      room.actualCheckoutDate =
        String(
          actualCheckoutDate || ""
        ).trim();

      room.actualCheckoutTime =
        String(
          actualCheckoutTime || ""
        ).trim();
    }

    // --------------------------------------------------------
    // INITIAL PAYMENT
    // --------------------------------------------------------

    const initialPaymentUsed =
      availableInitialPayment;

    booking.initialPaidUsedAmount =
      Number(
        booking.initialPaidUsedAmount || 0
      ) + initialPaymentUsed;

    // --------------------------------------------------------
    // CHECKOUT PAYMENT
    // --------------------------------------------------------

    const safeCheckoutPayment =
      Math.max(
        0,
        Number(
          checkoutPaymentAmount || 0
        )
      );

    if (
      !Number.isFinite(
        safeCheckoutPayment
      )
    ) {
      log.warn(
        `[Booking] Checkout payment invalid. bookingId=${id}, value=${checkoutPaymentAmount}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(400).json({
        success: false,
        message:
          "The checkout payment amount is invalid.",
      });
    }

    if (safeCheckoutPayment > 0) {
      booking.payments.push({
        amount:
          safeCheckoutPayment,

        paymentType: "Checkout",

        paymentVia:
          String(
            paymentVia || "Cash"
          ).trim(),

        paidAt: new Date(),
      });
    }

    // --------------------------------------------------------
    // EXTRA CHARGES
    // --------------------------------------------------------

    booking.financials.extraChargeTotal =
      Number(
        booking.financials
          ?.extraChargeTotal || 0
      ) +
      Math.max(
        0,
        Number(
          extraChargeTotal || 0
        )
      );

    // --------------------------------------------------------
    // BOOKING STATUS
    // --------------------------------------------------------

    const hasActiveRooms =
      booking.rooms.some(
        (room) =>
          room.checkoutStatus ===
            "Staying" ||
          room.checkoutStatus ===
            "Overstayed"
      );

    if (hasActiveRooms) {
      booking.bookingStatus =
        "Partially Checked Out";
    } else {
      booking.bookingStatus =
        "Completed";
    }

    booking.financials =
      calculateFinancials(booking);

    log.info(
      `[Booking] Saving checkout. bookingId=${id}, checkedOutRooms=${selectedRooms.length}, initialPaymentUsed=${initialPaymentUsed}, checkoutPayment=${safeCheckoutPayment}, hotelId=${hotelId}, branchId=${branchId}`
    );

    await booking.save();

    // --------------------------------------------------------
    // RELEASE PHYSICAL ROOMS
    // IMPORTANT: TENANT SCOPED
    // --------------------------------------------------------

    await Promise.all(
      selectedRooms.map((room) =>
        Room.findOneAndUpdate(
          {
            _id: room.roomId,
            hotelId,
            branchId,
          },
          {
            status: "available",
          }
        )
      )
    );

    log.info(
      `[Booking] Physical rooms released. bookingId=${id}, roomCount=${selectedRooms.length}, hotelId=${hotelId}, branchId=${branchId}`
    );

    const updatedBooking =
      await Booking.findOne({
        _id: id,
        hotelId,
        branchId,
      })
        .populate("customerId")
        .populate("rooms.roomId");

    log.info(
      `[Booking] Checkout completed. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
    );

    return res.status(200).json({
      success: true,

      message:
        "Selected rooms checked out successfully.",

      initialPaymentUsed,

      remainingInitialPayment:
        Math.max(
          0,
          Number(
            updatedBooking.initialPaidAmount ||
              0
          ) -
            Number(
              updatedBooking
                .initialPaidUsedAmount ||
                0
            )
        ),

      checkedOutRooms:
        selectedRooms.map(
          (room) => room.roomNumber
        ),

      booking:
        updatedBooking,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "checkout rooms",
      {
        hotelId:
          tenant?.hotelId ||
          req.user?.hotelId ||
          "unknown",
        branchId:
          tenant?.branchId ||
          req.user?.branchId ||
          "unknown",
        bookingId: req.params?.id,
      }
    );
  }
};

// ============================================================
// ADD FOOD SERVICE TO ROOM
// ============================================================

export const addFoodService =
  async (req, res) => {
    let tenant;

    try {
      tenant = getTenantIds(
        req,
        res,
        "add food service"
      );

      if (!tenant) return;

      const { hotelId, branchId } =
        tenant;

      const { id, roomId } =
        req.params;

      const {
        foodId = null,
        name = "",
        price = 0,
        quantity = 1,
      } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "The booking ID is invalid.",
        });
      }

      const booking =
        await Booking.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found in your branch.",
        });
      }

      const room =
        booking.rooms.id(roomId);

      if (!room) {
        log.warn(
          `[Booking] Food service rejected - room not found in booking. bookingId=${id}, roomId=${roomId}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(404).json({
          success: false,
          message:
            "The selected room was not found in this booking.",
        });
      }

      const safePrice =
        Number(price || 0);

      const safeQuantity =
        Number(quantity || 1);

      if (
        !Number.isFinite(
          safePrice
        ) ||
        safePrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Food price must be a valid amount.",
        });
      }

      if (
        !Number.isFinite(
          safeQuantity
        ) ||
        safeQuantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Food quantity must be at least 1.",
        });
      }

      room.foodServices.push({
        foodId:
          foodId &&
          isValidObjectId(foodId)
            ? foodId
            : null,

        name:
          String(name || "").trim(),

        price: safePrice,

        quantity: safeQuantity,

        total:
          safePrice * safeQuantity,

        paymentStatus: "Pending",
      });

      booking.financials =
        calculateFinancials(booking);

      await booking.save();

      log.info(
        `[Booking] Food service added. bookingId=${id}, roomId=${roomId}, foodId=${foodId || "none"}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Food service added successfully.",
        booking,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "add food service",
        {
          hotelId:
            tenant?.hotelId ||
            req.user?.hotelId ||
            "unknown",
          branchId:
            tenant?.branchId ||
            req.user?.branchId ||
            "unknown",
          bookingId: req.params?.id,
          roomId: req.params?.roomId,
        }
      );
    }
  };

// ============================================================
// ADD ROOM SERVICE TO ROOM
// ============================================================

export const addRoomService =
  async (req, res) => {
    let tenant;

    try {
      tenant = getTenantIds(
        req,
        res,
        "add room service"
      );

      if (!tenant) return;

      const { hotelId, branchId } =
        tenant;

      const { id, roomId } =
        req.params;

      const {
        serviceId = null,
        name = "",
        fees = 0,
        quantity = 1,
      } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "The booking ID is invalid.",
        });
      }

      const booking =
        await Booking.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found in your branch.",
        });
      }

      const room =
        booking.rooms.id(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          message:
            "The selected room was not found in this booking.",
        });
      }

      const safeFees =
        Number(fees || 0);

      const safeQuantity =
        Number(quantity || 1);

      if (
        !Number.isFinite(
          safeFees
        ) ||
        safeFees < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Service fee must be a valid amount.",
        });
      }

      if (
        !Number.isFinite(
          safeQuantity
        ) ||
        safeQuantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Service quantity must be at least 1.",
        });
      }

      room.roomServices.push({
        serviceId:
          serviceId &&
          isValidObjectId(serviceId)
            ? serviceId
            : null,

        name:
          String(name || "").trim(),

        fees: safeFees,

        quantity: safeQuantity,

        total:
          safeFees * safeQuantity,

        paymentStatus: "Pending",
      });

      booking.financials =
        calculateFinancials(booking);

      await booking.save();

      log.info(
        `[Booking] Room service added. bookingId=${id}, roomId=${roomId}, serviceId=${serviceId || "none"}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Room service added successfully.",
        booking,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "add room service",
        {
          hotelId:
            tenant?.hotelId ||
            req.user?.hotelId ||
            "unknown",
          branchId:
            tenant?.branchId ||
            req.user?.branchId ||
            "unknown",
          bookingId: req.params?.id,
          roomId: req.params?.roomId,
        }
      );
    }
  };

// ============================================================
// MARK ROOM SERVICES AS PAID
// ============================================================

export const markRoomServicesPaid =
  async (req, res) => {
    let tenant;

    try {
      tenant = getTenantIds(
        req,
        res,
        "mark room services paid"
      );

      if (!tenant) return;

      const { hotelId, branchId } =
        tenant;

      const { id, roomId } =
        req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "The booking ID is invalid.",
        });
      }

      const booking =
        await Booking.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found in your branch.",
        });
      }

      const room =
        booking.rooms.id(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          message:
            "The selected room was not found in this booking.",
        });
      }

      let updatedCount = 0;

      room.roomServices.forEach(
        (service) => {
          if (
            service.paymentStatus ===
            "Pending"
          ) {
            service.paymentStatus =
              "Paid";

            updatedCount += 1;
          }
        }
      );

      booking.financials =
        calculateFinancials(booking);

      await booking.save();

      log.info(
        `[Booking] Room services marked paid. bookingId=${id}, roomId=${roomId}, updatedCount=${updatedCount}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Room services marked as paid.",
        booking,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "mark room services paid",
        {
          hotelId:
            tenant?.hotelId ||
            req.user?.hotelId ||
            "unknown",
          branchId:
            tenant?.branchId ||
            req.user?.branchId ||
            "unknown",
          bookingId: req.params?.id,
          roomId: req.params?.roomId,
        }
      );
    }
  };

// ============================================================
// MARK FOOD SERVICES AS PAID
// ============================================================

export const markFoodServicesPaid =
  async (req, res) => {
    let tenant;

    try {
      tenant = getTenantIds(
        req,
        res,
        "mark food services paid"
      );

      if (!tenant) return;

      const { hotelId, branchId } =
        tenant;

      const { id, roomId } =
        req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "The booking ID is invalid.",
        });
      }

      const booking =
        await Booking.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message:
            "Booking not found in your branch.",
        });
      }

      const room =
        booking.rooms.id(roomId);

      if (!room) {
        return res.status(404).json({
          success: false,
          message:
            "The selected room was not found in this booking.",
        });
      }

      let updatedCount = 0;

      room.foodServices.forEach(
        (food) => {
          if (
            food.paymentStatus ===
            "Pending"
          ) {
            food.paymentStatus =
              "Paid";

            updatedCount += 1;
          }
        }
      );

      booking.financials =
        calculateFinancials(booking);

      await booking.save();

      log.info(
        `[Booking] Food services marked paid. bookingId=${id}, roomId=${roomId}, updatedCount=${updatedCount}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Food services marked as paid.",
        booking,
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "mark food services paid",
        {
          hotelId:
            tenant?.hotelId ||
            req.user?.hotelId ||
            "unknown",
          branchId:
            tenant?.branchId ||
            req.user?.branchId ||
            "unknown",
          bookingId: req.params?.id,
          roomId: req.params?.roomId,
        }
      );
    }
  };

// ============================================================
// DELETE BOOKING
// ============================================================

export const deleteBooking =
  async (req, res) => {
    let tenant;

    try {
      tenant = getTenantIds(
        req,
        res,
        "delete booking"
      );

      if (!tenant) return;

      const { hotelId, branchId } =
        tenant;

      const { id } = req.params;

      if (!isValidObjectId(id)) {
        log.warn(
          `[Booking] Delete rejected - invalid bookingId=${id}. hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "The booking ID is invalid.",
        });
      }

      log.info(
        `[Booking] Finding booking for deletion. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
      );

      const booking =
        await Booking.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!booking) {
        log.warn(
          `[Booking] Delete rejected - booking not found. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(404).json({
          success: false,
          message:
            "Booking not found in your branch.",
        });
      }

      const hasActiveRooms =
        booking.rooms.some(
          (room) =>
            room.checkoutStatus ===
              "Staying" ||
            room.checkoutStatus ===
              "Overstayed"
        );

      if (hasActiveRooms) {
        log.warn(
          `[Booking] Delete rejected - booking still has active rooms. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
        );

        return res.status(400).json({
          success: false,
          message:
            "Cannot delete an active booking. Please checkout all rooms first.",
        });
      }

      await Booking.findOneAndDelete({
        _id: id,
        hotelId,
        branchId,
      });

      log.info(
        `[Booking] Booking deleted successfully. bookingId=${id}, hotelId=${hotelId}, branchId=${branchId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Booking deleted successfully.",
      });
    } catch (error) {
      return handleControllerError(
        res,
        error,
        "delete booking",
        {
          hotelId:
            tenant?.hotelId ||
            req.user?.hotelId ||
            "unknown",
          branchId:
            tenant?.branchId ||
            req.user?.branchId ||
            "unknown",
          bookingId: req.params?.id,
        }
      );
    }
  };