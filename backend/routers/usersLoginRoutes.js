import express from "express";

import {
    sendOTPForLogin,
    verifyOTP,
    sendHotelOTP,
    logout,
    getUser,
    verifyHotelOTP,
} from "../controllers/usersLoginController.js";

import { authVerify } from "../middleware/userVerify.js";

const router = express.Router();

router.post("/send-otp", sendOTPForLogin);
router.post("/verify-otp", verifyOTP);

router.get("/get-user", authVerify, getUser);
router.post("/logout", authVerify, logout);

// Hotel login
router.post("/hotel-send-otp", sendHotelOTP);
router.post("/hotel-verify-otp", verifyHotelOTP);

export default router;
