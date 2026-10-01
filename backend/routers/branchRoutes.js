import express from "express";

import {
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,
  getBranchUsage,
} from "../controllers/branchController.js";

import BranchHotels from "../models/branchHotels.js";
import { authVerify } from "../middleware/userVerify.js";
import { branchLimitVerify } from "../middleware/branchLimitVerify.js";

const router = express.Router();

/**
 * ============================================================
 * BRANCH READ VERIFY
 * ============================================================
 */
const branchReadVerify = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please log in.",
    });
  }
  return next();
};

/**
 * ============================================================
 * BRANCH MANAGE VERIFY
 * ============================================================
 * Strictly allows only SaaS Admin or Primary Main Branch owner
 * to add, edit, or delete branches.
 * ============================================================
 */
const branchManageVerify = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    if (req.user.role === "admin") {
      return next();
    }

    if (req.user.role === "hotelOwner" && req.user.branchId) {
      const branch = await BranchHotels.findById(req.user.branchId)
        .select("isMainBranch branchCode")
        .lean();

      if (branch && (branch.isMainBranch || branch.branchCode === "MAIN")) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Only the primary Main Branch owner can create or manage branches.",
      });
    }

    return res.status(403).json({
      success: false,
      message: "Forbidden: You do not have permission to manage branches.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error verifying branch management permissions.",
    });
  }
};



/**
 * ============================================================
 * BRANCH UPDATE VERIFY
 * ============================================================
 * Allows:
 * - SaaS Admin
 * - Main Branch owner
 * - Sub-branch owner updating ONLY their own branch
 */
const branchUpdateVerify = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please log in.",
      });
    }

    // SaaS admin
    if (req.user.role === "admin") {
      return next();
    }

    // Must be hotel owner for branch profile update
    if (req.user.role !== "hotelOwner") {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You are not allowed to update branch details.",
      });
    }

    // User must belong to a branch
    if (!req.user.branchId) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: Your account is not connected to a branch.",
      });
    }

    // --------------------------------------------------------
    // Get requested branch
    // --------------------------------------------------------

    const requestedBranch =
      await BranchHotels.findById(req.params.id)
        .select("_id hotelId isMainBranch branchCode")
        .lean();

    if (!requestedBranch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    // --------------------------------------------------------
    // Hotel isolation
    // --------------------------------------------------------

    if (
      requestedBranch.hotelId?.toString() !==
      req.user.hotelId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not authorized to update this branch.",
      });
    }

    // --------------------------------------------------------
    // User's own branch
    // --------------------------------------------------------

    const isOwnBranch =
      requestedBranch._id.toString() ===
      req.user.branchId.toString();

    if (isOwnBranch) {
      return next();
    }

    // --------------------------------------------------------
    // Main branch owner can update other branches
    // --------------------------------------------------------

    const requesterBranch =
      await BranchHotels.findById(req.user.branchId)
        .select("isMainBranch branchCode")
        .lean();

    const isMainBranchOwner =
      requesterBranch &&
      (
        requesterBranch.isMainBranch ||
        requesterBranch.branchCode === "MAIN"
      );

    if (isMainBranchOwner) {
      return next();
    }

    // --------------------------------------------------------
    // Sub-branch cannot update another branch
    // --------------------------------------------------------

    return res.status(403).json({
      success: false,
      message:
        "Forbidden: You can only update your own branch.",
    });
  } catch (error) {
    console.error(
      "[Branch Update Verify] Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Error verifying branch update permissions.",
    });
  }
};


// ============================================================
// BRANCH ROUTES
// ============================================================

// 1. Get branch subscription limits and usage statistics
router.get(
  "/usage",
  authVerify,
  branchReadVerify,
  getBranchUsage
);

// 2. Get all branches (isolated to user's hotel)
router.get(
  "/list-branches",
  authVerify,
  branchReadVerify,
  getAllBranches
);

// 3. Create new sub-branch (strictly Main Branch owner + within subscription limit)
router.post(
  "/add-branch",
  authVerify,
  branchManageVerify,
  branchLimitVerify,
  createBranch
);

// 4. Get branch by ID
router.get(
  "/:id",
  authVerify,
  branchReadVerify,
  getBranchById
);

// 5. Update branch details (Main Branch owner or Admin)
router.put(
  "/update-branch/:id",
  authVerify,
  branchUpdateVerify,
  updateBranch
);

// 6. Delete branch (Main Branch owner or Admin)
router.delete(
  "/delete-branch/:id",
  authVerify,
  branchManageVerify,
  deleteBranch
);

export default router;