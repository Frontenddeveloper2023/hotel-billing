import express from "express";
import { getDashboardSummary } from "../controllers/dashboardController.js";
import { authVerify, permissionVerify } from "../middleware/userVerify.js";

const router = express.Router();

// GET /dashboard/summary
// Permission required: dashboard
router.get(
    "/summary",
    authVerify,
    permissionVerify("dashboard"),
    getDashboardSummary
);

export default router;
