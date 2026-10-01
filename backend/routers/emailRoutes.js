import express from "express";

import {
  sendEmailToUser,
  getEmailHistory,
} from "../controllers/emailController.js";

import {
  authVerify,
  adminVerify,
} from "../middleware/userVerify.js";

const router = express.Router();


// ==========================================================
// SEND EMAIL
// ==========================================================

router.post(
  "/send",
  authVerify,
  adminVerify,
  sendEmailToUser
);


// ==========================================================
// GET EMAIL HISTORY
// ==========================================================

router.get(
  "/history",
  authVerify,
  adminVerify,
  getEmailHistory
);


export default router;