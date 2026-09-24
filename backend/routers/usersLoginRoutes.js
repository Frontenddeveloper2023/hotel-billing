import express from "express";

import {
    sendOTPForLogin,
    verifyOTP,
    logout,
    getUser,
} from "../controllers/usersLoginController.js";

import { authVerify } from "../middleware/userVerify.js";

const router = express.Router();

router.post("/send-otp", sendOTPForLogin);
router.post("/verify-otp", verifyOTP);

router.get("/get-user", authVerify, getUser);
router.post("/logout", authVerify, logout);

export default router;
