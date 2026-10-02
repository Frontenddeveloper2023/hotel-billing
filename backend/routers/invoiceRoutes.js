import express from "express";
import multer from "multer";

import {
    createInvoice,
    getAllInvoices,
    getInvoiceById,
    deleteInvoice,
    getAllInvoicesAdmin,
    sendInvoiceEmail,
} from "../controllers/invoiceController.js";

import {
    authVerify,
    permissionVerify,
    permissionVerifyAny,
} from "../middleware/userVerify.js";

const router = express.Router();


// ==========================================
// MULTER
// Receive the already-generated invoice PDF
// ==========================================
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});


// ==========================================
// SEND INVOICE PDF TO CUSTOMER EMAIL
// Invoice or Rooms Booking permission
// ==========================================
router.post(
    "/send-email",
    authVerify,
    permissionVerifyAny("invoice", "roomsBooking"),
    upload.single("pdf"),
    sendInvoiceEmail
);


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
// GET ALL INVOICES – ADMIN (all hotels)
// ==========================================
router.get(
    "/admin/all",
    authVerify,
    permissionVerify("hotels"),
    getAllInvoicesAdmin
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