import express from "express";

import {
  createPlan,
  getAllPlans,
  getActivePlans,
  getPlanById,
  updatePlan,
  deletePlan,
  getFreeTrialConfig,
  updateFreeTrialConfig,
} from "../controllers/planController.js";

import {
  authVerify,
  permissionVerify,
} from "../middleware/userVerify.js";

const router = express.Router();

// ==========================================
// PUBLIC PLAN ROUTES
// ==========================================

// New hotel owners can view active plans
// No login required
router.get(
  "/public/active-plans",
  getActivePlans
);

// Public route to get current free trial configuration
router.get(
  "/public/free-trial-config",
  getFreeTrialConfig
);


// ==========================================
// ADMIN PLAN ROUTES
// ==========================================

// Get all plans
router.get(
  "/list-plans",
  authVerify,
  permissionVerify("plans"),
  getAllPlans
);

// Get active plans - Admin
router.get(
  "/active-plans",
  authVerify,
  permissionVerify("plans"),
  getActivePlans
);

// Get Free Trial Config - Admin
router.get(
  "/free-trial-config",
  authVerify,
  permissionVerify("plans"),
  getFreeTrialConfig
);

// Update Free Trial Config - Admin
router.put(
  "/free-trial-config",
  authVerify,
  permissionVerify("plans"),
  updateFreeTrialConfig
);

// Create new plan
router.post(
  "/add-plan",
  authVerify,
  permissionVerify("plans"),
  createPlan
);

router.get(
  "/:id",
  authVerify,
  getPlanById
);

// Update plan
router.put(
  "/update-plan/:id",
  authVerify,
  permissionVerify("plans"),
  updatePlan
);

// Delete plan
router.delete(
  "/delete-plan/:id",
  authVerify,
  permissionVerify("plans"),
  deletePlan
);

export default router;