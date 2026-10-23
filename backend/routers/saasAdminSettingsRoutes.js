import express from "express";
import {
    getAllAdminsAndSubAdmins,
    createSubAdmin,
    updateSubAdmin,
    toggleBlockSubAdmin,
    deleteSubAdmin,
    updateAdminProfile,
} from "../controllers/saasAdminSettingsController.js";
import { authVerify } from "../middleware/userVerify.js";

const router = express.Router();

// All routes require auth
router.use(authVerify);

// GET all admins & sub-admins (both admin and sub-admin can read)
router.get("/admins", getAllAdminsAndSubAdmins);

// CREATE sub-admin (enforced inside controller: main admin only)
router.post("/admins", createSubAdmin);

// UPDATE sub-admin (main admin only)
router.put("/admins/:id", updateSubAdmin);

// BLOCK / UNBLOCK sub-admin (main admin only)
router.put("/admins/:id/block", toggleBlockSubAdmin);

// DELETE sub-admin (main admin only)
router.delete("/admins/:id", deleteSubAdmin);

// UPDATE OWN PROFILE (email & name - main admin only)
router.put("/profile", updateAdminProfile);

export default router;
