import express from "express";

import {
    createInvoice,
    getAllInvoices,
    getInvoiceById,
    deleteInvoice,
} from "../controllers/invoiceController.js";

import {
    authVerify,
    permissionVerify,
    permissionVerifyAny,
} from "../middleware/userVerify.js";

const router = express.Router();


// ==========================================
// CREATE INVOICE
// Invoice or Rooms Booking permission
// ==========================================
router.post(
    "/",
    authVerify,
    permissionVerifyAny("invoice", "roomsBooking"),
    createInvoice
);


// ==========================================
// GET ALL INVOICES
// Invoice permission
// ==========================================
router.get(
    "/",
    authVerify,
    permissionVerify("invoice"),
    getAllInvoices
);


// ==========================================
// GET SINGLE INVOICE
// Invoice or Rooms Booking permission
// ==========================================
router.get(
    "/:id",
    authVerify,
    permissionVerifyAny("invoice", "roomsBooking"),
    getInvoiceById
);


// ==========================================
// DELETE INVOICE
// Invoice permission
// ==========================================
router.delete(
    "/:id",
    authVerify,
    permissionVerify("invoice"),
    deleteInvoice
);

export default router;