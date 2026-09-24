import express from "express";

import {
  createFood,
  getAllFood,
  getFoodById,
  updateFood,
  deleteFood,
} from "../controllers/foodController.js";

import { uploadFoodImage } from "../middleware/uploadMiddleware.js";

import {
  authVerify,
  permissionVerify,
  permissionVerifyAny,
} from "../middleware/userVerify.js";

import { subscriptionVerify } from "../middleware/subscriptionVerify.js";
import { featureVerify } from "../middleware/featureVerify.js";

const router = express.Router();

// ==========================================
// CREATE FOOD
// Food Management permission
// Plan must include Food Service
// ==========================================

router.post(
  "/food-img-upload",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  uploadFoodImage,
  createFood
);

// ==========================================
// GET ALL FOODS
// Food Management OR Dashboard
// Plan must include Food Service
// ==========================================

router.get(
  "/get-foods",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerifyAny("foodManagement", "dashboard"),
  getAllFood
);

// ==========================================
// GET SINGLE FOOD
// Food Management OR Dashboard
// Plan must include Food Service
// ==========================================

router.get(
  "/get-food/:id",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerifyAny("foodManagement", "dashboard"),
  getFoodById
);

// ==========================================
// UPDATE FOOD
// Food Management permission
// Plan must include Food Service
// ==========================================

router.put(
  "/update-food/:id",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  uploadFoodImage,
  updateFood
);

// ==========================================
// DELETE FOOD
// Food Management permission
// Plan must include Food Service
// ==========================================

router.delete(
  "/delete-food/:id",
  authVerify,
  subscriptionVerify,
  featureVerify("foodService"),
  permissionVerify("foodManagement"),
  deleteFood
);

export default router;