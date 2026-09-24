import express from "express";
import { getReportsSummary } from "../controllers/reportsController.js";
import { authVerify, permissionVerify } from "../middleware/userVerify.js";

const router = express.Router();

// GET /reports/summary
// Permission required: reports
router.get(
    "/summary",
    authVerify,
    permissionVerify("reports"),
    getReportsSummary
);

export default router;
