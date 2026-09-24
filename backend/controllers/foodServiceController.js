import mongoose from "mongoose";
import Booking from "../models/booking.js";
import Food from "../models/food.js";
import { log } from "../util/logger.js";

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

/**
 * Check whether an ID is a valid MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Get authenticated tenant IDs.
 *
 * IMPORTANT:
 * Never take hotelId or branchId from req.body / frontend.
 * Always use the authenticated user's tenant information.
 */
const getTenantIds = (req, res) => {
  const hotelId = req.user?.hotelId;
  const branchId = req.user?.branchId;

  if (!hotelId) {
    res.status(403).json({
      success: false,
      message:
        "Your account is not connected to a hotel.",
    });

    return null;
  }

  if (!branchId) {
    res.status(403).json({
      success: false,
      message:
        "Your account is not connected to a hotel branch.",
    });

    return null;
  }

  if (!isValidObjectId(hotelId)) {
    res.status(403).json({
      success: false,
      message:
        "Your hotel account information is invalid.",
    });

    return null;
  }

  if (!isValidObjectId(branchId)) {
    res.status(403).json({
      success: false,
      message:
        "Your hotel branch information is invalid.",
    });

    return null;
  }

  return {
    hotelId,
    branchId,
  };
};

/**
 * Find booking + room inside the authenticated tenant.
 *
 * This prevents a user from using another hotel's bookingId
 * or roomId.
 */
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

/**
 * Recalculate total food amount for the entire booking.
 */
const recalculateFoodTotal = (booking) => {
  let foodTotal = 0;

  booking.rooms.forEach((bookingRoom) => {
    (bookingRoom.foodServices || []).forEach((food) => {
      foodTotal += Number(food.total || 0);
    });
  });

  if (!booking.financials) {
    booking.financials = {};
  }

  booking.financials.foodTotal = foodTotal;

  return foodTotal;
};


/**
 * ============================================================
 * 1. ADD FOOD SERVICE TO BOOKING ROOM
 * ============================================================
 *
 * POST
 * /api/bookings/:bookingId/rooms/:roomId/food
 *
 * Body:
 * {
 *   foodId,
 *   name,
 *   price,
 *   quantity,
 *   total,
 *   paymentStatus
 * }
 *
 * ============================================================
 */

export const createFoodService = async (req, res) => {
  try {
    /**
     * ----------------------------------------------------------
     * TENANT
     * ----------------------------------------------------------
     */

    const tenant = getTenantIds(req, res);

    if (!tenant) {
      return;
    }

    const { hotelId, branchId } = tenant;

    /**
     * ----------------------------------------------------------
     * PARAMS
     * ----------------------------------------------------------
     */

    const { bookingId, roomId } = req.params;

    /**
     * ----------------------------------------------------------
     * BODY
     * ----------------------------------------------------------
     */

    const {
      foodId,
      quantity,
    } = req.body;

    log(
      `[FOOD SERVICE] Add request | Hotel: ${hotelId} | Branch: ${branchId} | Booking: ${bookingId} | Room: ${roomId} | Food: ${foodId}`
    );

    /**
     * ----------------------------------------------------------
     * VALIDATE BOOKING ID
     * ----------------------------------------------------------
     */

    if (
      !bookingId ||
      !isValidObjectId(bookingId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    /**
     * ----------------------------------------------------------
     * VALIDATE ROOM ID
     * ----------------------------------------------------------
     */

    if (
      !roomId ||
      !isValidObjectId(roomId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid room ID.",
      });
    }

    /**
     * ----------------------------------------------------------
     * VALIDATE FOOD ID
     * ----------------------------------------------------------
     */

    if (
      !foodId ||
      !isValidObjectId(foodId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid food ID is required.",
      });
    }

    /**
     * ----------------------------------------------------------
     * FIND BOOKING + ROOM
     * ----------------------------------------------------------
     *
     * IMPORTANT:
     * Booking is searched using hotelId + branchId.
     */

    const result = await getBookingRoom(
      bookingId,
      roomId,
      hotelId,
      branchId
    );

    if (!result) {
      /**
       * Do not expose another tenant's booking.
       */
      return res.status(404).json({
        success: false,
        message:
          "Booking or selected room was not found.",
      });
    }

    const {
      booking,
      room,
    } = result;

    /**
     * ----------------------------------------------------------
     * DON'T ADD FOOD TO CHECKED-OUT ROOM
     * ----------------------------------------------------------
     */

    if (
      room.checkoutStatus ===
      "Checked Out"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot add food to a checked-out room.",
      });
    }

    /**
     * ----------------------------------------------------------
     * FIND FOOD FROM CURRENT TENANT'S CATALOG
     * ----------------------------------------------------------
     *
     * IMPORTANT:
     * Food must belong to the same hotel + branch.
     */

    const foodItem = await Food.findOne({
      _id: foodId,
      hotelId,
      branchId,
    });

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message:
          "Selected food item was not found in this branch's catalog.",
      });
    }

    /**
     * ----------------------------------------------------------
     * QUANTITY
     * ----------------------------------------------------------
     */

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

    /**
     * ----------------------------------------------------------
     * ALWAYS USE MASTER FOOD PRICE
     * ----------------------------------------------------------
     */

    const foodPrice = Number(
      foodItem.foodPrice
    );

    if (
      !Number.isFinite(foodPrice) ||
      foodPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Food price is invalid.",
      });
    }

    /**
     * ----------------------------------------------------------
     * CALCULATE TOTAL
     * ----------------------------------------------------------
     */

    const calculatedTotal =
      foodPrice * parsedQuantity;

    /**
     * ----------------------------------------------------------
     * ADD EMBEDDED FOOD SERVICE
     * ----------------------------------------------------------
     */

    room.foodServices.push({
      foodId: foodItem._id,
      name: foodItem.foodName,
      price: foodPrice,
      quantity: parsedQuantity,
      total: calculatedTotal,

      // Always Pending.
      // Final checkout changes it to Paid.
      paymentStatus: "Pending",
    });

    /**
     * ----------------------------------------------------------
     * RECALCULATE BOOKING FOOD TOTAL
     * ----------------------------------------------------------
     */

    recalculateFoodTotal(booking);

    /**
     * ----------------------------------------------------------
     * SAVE BOOKING
     * ----------------------------------------------------------
     */

    await booking.save();

    /**
     * ----------------------------------------------------------
     * GET ADDED FOOD
     * ----------------------------------------------------------
     */

    const addedFood =
      room.foodServices[
        room.foodServices.length - 1
      ];

    log(
      `[FOOD SERVICE] Added | Hotel: ${hotelId} | Branch: ${branchId} | Booking: ${bookingId} | Room: ${room.roomNumber} | Food: ${addedFood.name} | Qty: ${addedFood.quantity} | Total: ${addedFood.total}`
    );

    return res.status(201).json({
      success: true,
      message:
        "Food item added successfully.",
      data: addedFood,
      booking,
    });
  } catch (error) {
    log(
      `[FOOD SERVICE] Error in createFoodService: ${error.message}`
    );

    if (
      error.name ===
      "ValidationError"
    ) {
      const messages = Object.values(
        error.errors
      ).map(
        (err) => err.message
      );

      return res.status(400).json({
        success: false,
        message:
          `Validation failed: ${messages.join(", ")}`,
      });
    }

    if (
      error.name ===
      "CastError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid booking, room, or food ID.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to add food item. Please try again.",
    });
  }
};


/**
 * ============================================================
 * 2. GET ALL FOOD SERVICES
 * ============================================================
 *
 * GET
 * /api/food-services
 *
 * ============================================================
 */

export const getAllFoodServices = async (
  req,
  res
) => {
  try {
    /**
     * ----------------------------------------------------------
     * TENANT
     * ----------------------------------------------------------
     */

    const tenant = getTenantIds(req, res);

    if (!tenant) {
      return;
    }

    const {
      hotelId,
      branchId,
    } = tenant;

    /**
     * ----------------------------------------------------------
     * FIND ONLY CURRENT TENANT BOOKINGS
     * ----------------------------------------------------------
     */

    const bookings =
      await Booking.find({
        hotelId,
        branchId,
        "rooms.foodServices.0": {
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

    const foodServices = [];

    /**
     * ----------------------------------------------------------
     * FLATTEN FOOD SERVICES
     * ----------------------------------------------------------
     */

    bookings.forEach(
      (booking) => {
        booking.rooms.forEach(
          (room) => {
            (
              room.foodServices ||
              []
            ).forEach(
              (food) => {
                foodServices.push({
                  _id: food._id,

                  bookingId:
                    booking._id,

                  customerId:
                    booking.customerId,

                  roomId:
                    room._id,

                  roomNumber:
                    room.roomNumber,

                  foodId:
                    food.foodId,

                  foodName:
                    food.name,

                  foodPrice:
                    food.price,

                  quantity:
                    food.quantity,

                  totalPrice:
                    food.total,

                  paymentStatus:
                    food.paymentStatus,

                  bookingStatus:
                    booking.bookingStatus,
                });
              }
            );
          }
        );
      }
    );

    log(
      `[FOOD SERVICE] Get all | Hotel: ${hotelId} | Branch: ${branchId} | Count: ${foodServices.length}`
    );

    return res.status(200).json({
      success: true,
      count:
        foodServices.length,
      data:
        foodServices,
    });
  } catch (error) {
    log(
      `[FOOD SERVICE] Error in getAllFoodServices: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch food services. Please try again.",
    });
  }
};


/**
 * ============================================================
 * 3. GET FOOD SERVICES BY BOOKING
 * ============================================================
 *
 * GET
 * /api/bookings/:bookingId/food-services
 *
 * ============================================================
 */

export const getFoodServicesByBooking =
  async (req, res) => {
    try {
      /**
       * --------------------------------------------------------
       * TENANT
       * --------------------------------------------------------
       */

      const tenant =
        getTenantIds(req, res);

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * --------------------------------------------------------
       * BOOKING ID
       * --------------------------------------------------------
       */

      const {
        bookingId,
      } = req.params;

      if (
        !bookingId ||
        !isValidObjectId(
          bookingId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * FIND BOOKING ONLY IN CURRENT TENANT
       * --------------------------------------------------------
       */

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
            "Booking not found.",
        });
      }

      /**
       * --------------------------------------------------------
       * FLATTEN FOOD SERVICES
       * --------------------------------------------------------
       */

      const foodServices = [];

      booking.rooms.forEach(
        (room) => {
          (
            room.foodServices ||
            []
          ).forEach(
            (food) => {
              foodServices.push({
                _id:
                  food._id,

                bookingId:
                  booking._id,

                customerId:
                  booking.customerId,

                roomId:
                  room._id,

                roomNumber:
                  room.roomNumber,

                foodId:
                  food.foodId,

                foodName:
                  food.name,

                foodPrice:
                  food.price,

                quantity:
                  food.quantity,

                totalPrice:
                  food.total,

                paymentStatus:
                  food.paymentStatus,
              });
            }
          );
        }
      );

      log(
        `[FOOD SERVICE] Get by booking | Hotel: ${hotelId} | Branch: ${branchId} | Booking: ${bookingId} | Count: ${foodServices.length}`
      );

      return res.status(200).json({
        success: true,
        count:
          foodServices.length,
        data:
          foodServices,
      });
    } catch (error) {
      log(
        `[FOOD SERVICE] Error in getFoodServicesByBooking: ${error.message}`
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking ID.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch booking food services. Please try again.",
      });
    }
  };


/**
 * ============================================================
 * 4. UPDATE EMBEDDED FOOD SERVICE
 * ============================================================
 *
 * PUT
 * /api/bookings/:bookingId/rooms/:roomId/food/:foodServiceId
 *
 * Body:
 * {
 *   quantity,
 *   paymentStatus
 * }
 *
 * ============================================================
 */

export const updateFoodService =
  async (req, res) => {
    try {
      /**
       * --------------------------------------------------------
       * TENANT
       * --------------------------------------------------------
       */

      const tenant =
        getTenantIds(req, res);

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * --------------------------------------------------------
       * PARAMS
       * --------------------------------------------------------
       */

      const {
        bookingId,
        roomId,
        foodServiceId,
      } = req.params;

      /**
       * --------------------------------------------------------
       * VALIDATE BOOKING ID
       * --------------------------------------------------------
       */

      if (
        !bookingId ||
        !isValidObjectId(
          bookingId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * VALIDATE ROOM ID
       * --------------------------------------------------------
       */

      if (
        !roomId ||
        !isValidObjectId(
          roomId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid room ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * VALIDATE FOOD SERVICE ID
       * --------------------------------------------------------
       */

      if (
        !foodServiceId ||
        !isValidObjectId(
          foodServiceId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid food service ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * FIND TENANT BOOKING + ROOM
       * --------------------------------------------------------
       */

      const result =
        await getBookingRoom(
          bookingId,
          roomId,
          hotelId,
          branchId
        );

      if (!result) {
        return res.status(404).json({
          success: false,
          message:
            "Booking or room not found.",
        });
      }

      const {
        booking,
        room,
      } = result;

      /**
       * --------------------------------------------------------
       * FIND FOOD SERVICE
       * --------------------------------------------------------
       */

      const food =
        room.foodServices.id(
          foodServiceId
        );

      if (!food) {
        return res.status(404).json({
          success: false,
          message:
            "Food service not found.",
        });
      }

      const {
        quantity,
        paymentStatus,
      } = req.body;

      /**
       * --------------------------------------------------------
       * DON'T MODIFY CHECKED-OUT ROOM
       * --------------------------------------------------------
       */

      if (
        room.checkoutStatus ===
        "Checked Out"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot update food service for a checked-out room.",
        });
      }

      /**
       * --------------------------------------------------------
       * QUANTITY
       * --------------------------------------------------------
       */

      if (
        quantity !== undefined
      ) {
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

        food.quantity =
          parsedQuantity;

        food.total =
          Number(
            food.price || 0
          ) *
          parsedQuantity;
      }

      /**
       * --------------------------------------------------------
       * PAYMENT STATUS
       * --------------------------------------------------------
       */

      if (
        paymentStatus !==
        undefined
      ) {
        if (
          ![
            "Pending",
            "Paid",
          ].includes(
            paymentStatus
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Payment status must be either Pending or Paid.",
          });
        }

        food.paymentStatus =
          paymentStatus;
      }

      /**
       * --------------------------------------------------------
       * RECALCULATE FOOD TOTAL
       * --------------------------------------------------------
       */

      recalculateFoodTotal(
        booking
      );

      /**
       * --------------------------------------------------------
       * SAVE
       * --------------------------------------------------------
       */

      await booking.save();

      log(
        `[FOOD SERVICE] Updated | Hotel: ${hotelId} | Branch: ${branchId} | Booking: ${bookingId} | Room: ${roomId} | Food Service: ${foodServiceId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Food service updated successfully.",
        data: food,
      });
    } catch (error) {
      log(
        `[FOOD SERVICE] Error in updateFoodService: ${error.message}`
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking, room, or food service ID.",
        });
      }

      if (
        error.name ===
        "ValidationError"
      ) {
        const messages =
          Object.values(
            error.errors
          ).map(
            (err) =>
              err.message
          );

        return res.status(400).json({
          success: false,
          message:
            `Validation failed: ${messages.join(", ")}`,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to update food service. Please try again.",
      });
    }
  };


/**
 * ============================================================
 * 5. DELETE EMBEDDED FOOD SERVICE
 * ============================================================
 *
 * DELETE
 * /api/bookings/:bookingId/rooms/:roomId/food/:foodServiceId
 *
 * ============================================================
 */

export const deleteFoodService =
  async (req, res) => {
    try {
      /**
       * --------------------------------------------------------
       * TENANT
       * --------------------------------------------------------
       */

      const tenant =
        getTenantIds(req, res);

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * --------------------------------------------------------
       * PARAMS
       * --------------------------------------------------------
       */

      const {
        bookingId,
        roomId,
        foodServiceId,
      } = req.params;

      /**
       * --------------------------------------------------------
       * VALIDATE BOOKING
       * --------------------------------------------------------
       */

      if (
        !bookingId ||
        !isValidObjectId(
          bookingId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * VALIDATE ROOM
       * --------------------------------------------------------
       */

      if (
        !roomId ||
        !isValidObjectId(
          roomId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid room ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * VALIDATE FOOD SERVICE
       * --------------------------------------------------------
       */

      if (
        !foodServiceId ||
        !isValidObjectId(
          foodServiceId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid food service ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * FIND TENANT BOOKING + ROOM
       * --------------------------------------------------------
       */

      const result =
        await getBookingRoom(
          bookingId,
          roomId,
          hotelId,
          branchId
        );

      if (!result) {
        return res.status(404).json({
          success: false,
          message:
            "Booking or room not found.",
        });
      }

      const {
        booking,
        room,
      } = result;

      /**
       * --------------------------------------------------------
       * FIND FOOD SERVICE
       * --------------------------------------------------------
       */

      const food =
        room.foodServices.id(
          foodServiceId
        );

      if (!food) {
        return res.status(404).json({
          success: false,
          message:
            "Food service not found.",
        });
      }

      /**
       * --------------------------------------------------------
       * DON'T DELETE PAID FOOD
       * --------------------------------------------------------
       */

      if (
        food.paymentStatus ===
        "Paid"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Paid food item cannot be deleted.",
        });
      }

      /**
       * --------------------------------------------------------
       * DELETE FOOD SERVICE
       * --------------------------------------------------------
       */

      food.deleteOne();

      /**
       * --------------------------------------------------------
       * RECALCULATE FOOD TOTAL
       * --------------------------------------------------------
       */

      recalculateFoodTotal(
        booking
      );

      /**
       * --------------------------------------------------------
       * SAVE BOOKING
       * --------------------------------------------------------
       */

      await booking.save();

      log(
        `[FOOD SERVICE] Deleted | Hotel: ${hotelId} | Branch: ${branchId} | Booking: ${bookingId} | Room: ${roomId} | Food Service: ${foodServiceId}`
      );

      return res.status(200).json({
        success: true,
        message:
          "Food item deleted successfully.",
      });
    } catch (error) {
      log(
        `[FOOD SERVICE] Error in deleteFoodService: ${error.message}`
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking, room, or food service ID.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete food item. Please try again.",
      });
    }
  };


/**
 * ============================================================
 * 6. MARK ALL FOOD SERVICES FOR ONE ROOM AS PAID
 * ============================================================
 *
 * PATCH
 * /api/bookings/:bookingId/rooms/:roomId/food/paid
 *
 * ============================================================
 */

export const markFoodServicesPaid =
  async (req, res) => {
    try {
      /**
       * --------------------------------------------------------
       * TENANT
       * --------------------------------------------------------
       */

      const tenant =
        getTenantIds(req, res);

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * --------------------------------------------------------
       * PARAMS
       * --------------------------------------------------------
       */

      const {
        bookingId,
        roomId,
      } = req.params;

      /**
       * --------------------------------------------------------
       * VALIDATE BOOKING
       * --------------------------------------------------------
       */

      if (
        !bookingId ||
        !isValidObjectId(
          bookingId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * VALIDATE ROOM
       * --------------------------------------------------------
       */

      if (
        !roomId ||
        !isValidObjectId(
          roomId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid room ID.",
        });
      }

      /**
       * --------------------------------------------------------
       * FIND TENANT BOOKING + ROOM
       * --------------------------------------------------------
       */

      const result =
        await getBookingRoom(
          bookingId,
          roomId,
          hotelId,
          branchId
        );

      if (!result) {
        return res.status(404).json({
          success: false,
          message:
            "Booking or room not found.",
        });
      }

      const {
        booking,
        room,
      } = result;

      /**
       * --------------------------------------------------------
       * MARK PENDING FOOD AS PAID
       * --------------------------------------------------------
       */

      let changedCount = 0;

      (
        room.foodServices ||
        []
      ).forEach(
        (food) => {
          if (
            food.paymentStatus ===
            "Pending"
          ) {
            food.paymentStatus =
              "Paid";

            changedCount++;
          }
        }
      );

      /**
       * --------------------------------------------------------
       * SAVE BOOKING
       * --------------------------------------------------------
       */

      await booking.save();

      log(
        `[FOOD SERVICE] Marked paid | Hotel: ${hotelId} | Branch: ${branchId} | Booking: ${bookingId} | Room: ${roomId} | Changed: ${changedCount}`
      );

      return res.status(200).json({
        success: true,
        message:
          `${changedCount} food item(s) marked as Paid.`,
        changedCount,
        data:
          room.foodServices,
      });
    } catch (error) {
      log(
        `[FOOD SERVICE] Error in markFoodServicesPaid: ${error.message}`
      );

      if (
        error.name ===
        "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid booking or room ID.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to mark food services as paid. Please try again.",
      });
    }
  };