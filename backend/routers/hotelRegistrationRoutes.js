import express from "express";

import {
  createRegistration,
  getAllRegistrations,
  getRegistrationById,
  getRegistrationStatus,
  approveRegistration,
  rejectRegistration,
  confirmDummyPayment,
} from "../controllers/hotelRegistrationController.js";

import {
  authVerify,
  permissionVerify,
} from "../middleware/userVerify.js";

const router = express.Router();

// ==========================================
// PUBLIC REGISTRATION
// ==========================================

router.post(
  "/register",
  createRegistration
);

// ==========================================
// DUMMY PAYMENT
// ==========================================

// No login required
// Called after user confirms dummy payment

router.post(
  "/payment/:id",
  confirmDummyPayment
);

// ==========================================
// APPLICATION STATUS
// ==========================================

// No login required
// User can check registration status using registration ID

router.get(
  "/status/:id",
  getRegistrationStatus
);

// ==========================================
// ADMIN ROUTES
// ==========================================

// Get all hotel registrations

router.get(
  "/list-registrations",
  authVerify,
  permissionVerify("hotelRegistrations"),
  getAllRegistrations
);

// Get registration by ID

router.get(
  "/:id",
  authVerify,
  permissionVerify("hotelRegistrations"),
  getRegistrationById
);

// Approve hotel registration

router.put(
  "/approve/:id",
  authVerify,
  permissionVerify("hotelRegistrations"),
  approveRegistration
);

// Reject hotel registration

router.put(
  "/reject/:id",
  authVerify,
  permissionVerify("hotelRegistrations"),
  rejectRegistration
);

export default router;