import express from "express";

import {
  createPlan,
  getAllPlans,
  getActivePlans,
  getPlanById,
  updatePlan,
  deletePlan,
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