import express from "express";
import { getCustomerManagementData } from "../controllers/customersManagementController.js";
import { authVerify, permissionVerify } from "../middleware/userVerify.js";

const router = express.Router();

// GET /customers/management-data
// Permission required: customer
router.get(
    "/management-data",
    authVerify,
    permissionVerify("customer"),
    getCustomerManagementData
);

export default router;
