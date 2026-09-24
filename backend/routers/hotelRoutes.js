import express from "express";

import {
  createHotel,
  getAllHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
} from "../controllers/hotelController.js";

import {
  authVerify,
  permissionVerify,
} from "../middleware/userVerify.js";

const router = express.Router();


// ==========================================
// HOTEL ROUTES
// ==========================================

// Get all hotels
router.get(
  "/list-hotels",
  authVerify,
  permissionVerify("hotels"),
  getAllHotels
);


// Create new hotel
router.post(
  "/add-hotel",
  authVerify,
  permissionVerify("hotels"),
  createHotel
);


// Get hotel by ID
router.get(
  "/:id",
  authVerify,
  permissionVerify("hotels"),
  getHotelById
);


// Update hotel
router.put(
  "/update-hotel/:id",
  authVerify,
  permissionVerify("hotels"),
  updateHotel
);


// Delete hotel
router.delete(
  "/delete-hotel/:id",
  authVerify,
  permissionVerify("hotels"),
  deleteHotel
);

export default router;