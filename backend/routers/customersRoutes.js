import express from "express";

import {
    createCustomer,
    getAllCustomers,
    getCustomerById,
    updateCustomer,
    deleteCustomer,
} from "../controllers/customersController.js";

import {
    authVerify,
    permissionVerify,
    permissionVerifyAny,
} from "../middleware/userVerify.js";

const router = express.Router();


// ==========================================
// CREATE CUSTOMER
// Only users with customer permission
// ==========================================
router.post(
    "/create-customer",
    authVerify,
    permissionVerify("customer"),
    createCustomer
);


// ==========================================
// GET ALL CUSTOMERS
// Customer Management OR Reports
// ==========================================
router.get(
    "/get-customer",
    authVerify,
    permissionVerifyAny("customer", "reports", "dashboard"),
    getAllCustomers
);


// ==========================================
// GET CUSTOMER BY ID
// Customer Management OR Reports
// ==========================================
router.get(
    "/get-customer/:id",
    authVerify,
    permissionVerifyAny("customer", "reports", "dashboard"),
    getCustomerById
);


// ==========================================
// UPDATE CUSTOMER
// Only users with customer permission
// ==========================================
router.put(
    "/update-customer/:id",
    authVerify,
    permissionVerify("customer"),
    updateCustomer
);


// ==========================================
// DELETE CUSTOMER
// Only users with customer permission
// ==========================================
router.delete(
    "/delete-customer/:id",
    authVerify,
    permissionVerify("customer"),
    deleteCustomer
);

export default router;