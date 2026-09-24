import User from "../models/users.js";
import Hotels from "../models/hotels.js";
import Subscription from "../models/subscription.js";
import BranchHotels from "../models/BranchHotels.js";
import { sendOTP } from "../util/email.js";
import jwt from "jsonwebtoken";
import { log } from "../util/logger.js";

/**
 * Helper to build sub-branch permissions based on parent hotel's subscription features
 */
const buildBranchPermissions = (subscription) => {
    return {
        dashboard: true,
        roomsBooking: true,
        foodManagement: subscription?.features?.foodService === true,
        serviceManagement: subscription?.features?.roomService === true,
        reports: true,
        customer: true,
        invoice: true,
        settings: true,
        users: true,
        branches: false, // sub-branches cannot manage branches
    };
};

// =====================================================
// SEND OTP FOR LOGIN
// =====================================================

const sendOTPForLogin = async (req, res) => {
    try {
        const { email } = req.body;

        log.info(`[LOGIN] Login request received for email: ${email}`);

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------
        if (!email) {
            return res.status(400).json({
                message: "Email is required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // -------------------------------------------------
        // 1. FIND USER IN USER COLLECTION
        // -------------------------------------------------
        let user = await User.findOne({
            email: normalizedEmail,
        });

        // -------------------------------------------------
        // 2. IF NOT IN USER DB, CHECK BRANCHHOTELS DB
        // -------------------------------------------------
        if (!user) {
            log.info(
                `[LOGIN] User not found in users collection. Checking BranchHotels for: ${normalizedEmail}`
            );

            const branch = await BranchHotels.findOne({
                email: normalizedEmail,
            });

            if (!branch) {
                return res.status(404).json({
                    message: "User or branch account not found with this email.",
                });
            }

            // Check branch status
            if (branch.status !== "active") {
                return res.status(401).json({
                    message: "This branch account is inactive. Please contact the administrator.",
                });
            }

            // Check parent hotel
            const hotel = await Hotels.findById(branch.hotelId);
            if (!hotel || hotel.status !== "active") {
                return res.status(403).json({
                    message: "The hotel account associated with this branch is inactive.",
                });
            }

            // Check parent hotel's active subscription
            const subscription = await Subscription.findOne({
                hotelId: branch.hotelId,
                status: {
                    $in: ["trial", "active", "expiring_soon", "grace_period"],
                },
                endDate: {
                    $gt: new Date(),
                },
            });

            if (!subscription) {
                return res.status(403).json({
                    message: "The subscription for this hotel has expired or is inactive. Please contact the hotel owner.",
                });
            }

            // Ensure a User account exists for this branch with subscription-synced permissions
            const branchPermissions = buildBranchPermissions(subscription);

            user = await User.findOne({ email: normalizedEmail });

            if (!user) {
                user = await User.create({
                    name: branch.branchName,
                    email: normalizedEmail,
                    role: "hotelOwner",
                    hotelId: branch.hotelId,
                    branchId: branch._id,
                    status: branch.status,
                    permission: branchPermissions,
                });

                log.info(
                    `[LOGIN] Created sub-branch user account: ${user._id} for branch: ${branch._id}`
                );
            } else {
                user.name = branch.branchName;
                user.hotelId = branch.hotelId;
                user.branchId = branch._id;
                user.status = branch.status;
                user.permission = {
                    ...user.permission,
                    ...branchPermissions,
                };
                await user.save();
            }
        }

        // -------------------------------------------------
        // 3. USER STATUS CHECK
        // -------------------------------------------------
        if (user.status !== "active") {
            return res.status(401).json({
                message: "User account is inactive.",
            });
        }

        // -------------------------------------------------
        // 4. HOTEL OWNER / BRANCH OWNER VALIDATION
        // -------------------------------------------------
        if (user.role === "hotelOwner") {
            if (!user.hotelId) {
                return res.status(403).json({
                    message: "Your account is not connected to a hotel.",
                });
            }

            const hotel = await Hotels.findById(user.hotelId);
            if (!hotel) {
                return res.status(404).json({
                    message: "Hotel account was not found.",
                });
            }

            if (hotel.status !== "active") {
                return res.status(403).json({
                    message: "Your hotel account is not active. Please contact the administrator.",
                });
            }

            // Check active subscription
            const subscription = await Subscription.findOne({
                hotelId: user.hotelId,
                status: {
                    $in: ["trial", "active", "expiring_soon", "grace_period"],
                },
                endDate: {
                    $gt: new Date(),
                },
            });

            if (!subscription) {
                return res.status(403).json({
                    message: "Your subscription is inactive or expired. Please contact the administrator.",
                });
            }

            // If this is a sub-branch user, sync permissions from active subscription features
            if (user.branchId) {
                const branchDoc = await BranchHotels.findById(user.branchId).lean();
                if (branchDoc && !branchDoc.isMainBranch && branchDoc.branchCode !== "MAIN") {
                    user.permission = {
                        ...user.permission,
                        ...buildBranchPermissions(subscription),
                    };
                    await user.save();
                }
            }
        }

        // -------------------------------------------------
        // 5. GENERATE OTP
        // -------------------------------------------------
        const otp = Math.floor(
            100000 + Math.random() * 900000
        ).toString();

        // OTP expires after 5 minutes
        const otpExpiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        user.otp = otp;
        user.otpExpiresAt = otpExpiresAt;

        await user.save();

        // Also store OTP in BranchHotels document for sub-branch accounts
        const branchDoc = await BranchHotels.findOne({ email: normalizedEmail });
        if (branchDoc) {
            branchDoc.otp = otp;
            branchDoc.otpExpiresAt = otpExpiresAt;
            await branchDoc.save();
        }

        // -------------------------------------------------
        // 6. SEND OTP
        // -------------------------------------------------
        await sendOTP(normalizedEmail, otp);

        log.info(
            `[LOGIN] OTP sent successfully to ${normalizedEmail}`
        );

        return res.status(200).json({
            message: "OTP sent successfully",
        });

    } catch (error) {
        console.error("[Send OTP] Error:", error);
        log.error(`[Send OTP] Error: ${error.message}`);

        return res.status(500).json({
            message: "Unable to send OTP right now. Please try again later.",
        });
    }
};

// =====================================================
// VERIFY OTP
// =====================================================

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        // -------------------------------------------------
        // VALIDATION
        // -------------------------------------------------
        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // -------------------------------------------------
        // 1. FIND USER OR BRANCH
        // -------------------------------------------------
        let user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            // Check in BranchHotels
            const branch = await BranchHotels.findOne({
                email: normalizedEmail,
            });

            if (!branch) {
                return res.status(404).json({
                    message: "User account not found.",
                });
            }

            const subscription = await Subscription.findOne({
                hotelId: branch.hotelId,
                status: {
                    $in: ["trial", "active", "expiring_soon", "grace_period"],
                },
                endDate: {
                    $gt: new Date(),
                },
            });

            user = await User.create({
                name: branch.branchName,
                email: normalizedEmail,
                role: "hotelOwner",
                hotelId: branch.hotelId,
                branchId: branch._id,
                status: branch.status,
                permission: buildBranchPermissions(subscription),
            });
        }

        // -------------------------------------------------
        // 2. USER STATUS CHECK
        // -------------------------------------------------
        if (user.status !== "active") {
            return res.status(401).json({
                message: "User account is inactive",
            });
        }

        // -------------------------------------------------
        // 3. HOTEL OWNER / BRANCH OWNER VALIDATION
        // -------------------------------------------------
        if (user.role === "hotelOwner") {
            if (!user.hotelId) {
                return res.status(403).json({
                    message: "Your account is not connected to a hotel.",
                });
            }

            const hotel = await Hotels.findById(user.hotelId);
            if (!hotel || hotel.status !== "active") {
                return res.status(403).json({
                    message: "Your hotel account is not active. Please contact the administrator.",
                });
            }

            const subscription = await Subscription.findOne({
                hotelId: user.hotelId,
                status: {
                    $in: ["trial", "active", "expiring_soon", "grace_period"],
                },
                endDate: {
                    $gt: new Date(),
                },
            });

            if (!subscription) {
                return res.status(403).json({
                    message: "Your subscription is inactive or expired. Please contact the administrator.",
                });
            }
        }

        // -------------------------------------------------
        // 4. OTP EXPIRY CHECK
        // -------------------------------------------------
        if (
            !user.otpExpiresAt ||
            new Date() > new Date(user.otpExpiresAt)
        ) {
            return res.status(401).json({
                message: "OTP has expired. Please request a new one.",
            });
        }

        // -------------------------------------------------
        // 5. OTP MATCH CHECK
        // -------------------------------------------------
        if (String(user.otp) !== String(otp)) {
            return res.status(401).json({
                message: "Invalid OTP",
            });
        }

        // -------------------------------------------------
        // 6. JWT SECRET CHECK
        // -------------------------------------------------
        if (!process.env.JWT_SECRET) {
            throw new Error(
                "JWT_SECRET is not defined in environment variables"
            );
        }

        // -------------------------------------------------
        // 7. CREATE JWT WITH TENANT SCOPE
        // -------------------------------------------------
        const token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                role: user.role,
                hotelId: user.hotelId || null,
                branchId: user.branchId || null, // Sub-branch ID!
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "24h",
            }
        );

        // -------------------------------------------------
        // 8. HTTP-ONLY COOKIE
        // -------------------------------------------------
        res.cookie("hotelbilling", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
            path: "/",
        });

        // -------------------------------------------------
        // 9. CLEAR OTP
        // -------------------------------------------------
        user.otp = null;
        user.otpExpiresAt = null;
        await user.save();

        log.info(
            `[LOGIN] OTP verified successfully. User: ${user.email}, Role: ${user.role}, Hotel: ${user.hotelId || "N/A"}, Branch: ${user.branchId || "N/A"}`
        );

        // -------------------------------------------------
        // 10. LOAD BRANCH METADATA
        // -------------------------------------------------
        let isMainBranch = true;
        let branchName = "";
        let branchCode = "";

        if (user.branchId) {
            const branchDoc = await BranchHotels.findById(user.branchId)
                .select("branchName branchCode isMainBranch")
                .lean();

            if (branchDoc) {
                isMainBranch = branchDoc.isMainBranch ?? (branchDoc.branchCode === "MAIN");
                branchName = branchDoc.branchName;
                branchCode = branchDoc.branchCode;
            }
        }

        // -------------------------------------------------
        // 11. RESPONSE
        // -------------------------------------------------
        return res.status(200).json({
            message: "OTP verified successfully",
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                hotelId: user.hotelId,
                branchId: user.branchId,
                status: user.status,
                permission: user.permission,
                isMainBranch,
                branchName,
                branchCode,
            },
        });

    } catch (error) {
        console.error("[Verify OTP] Error:", error);
        log.error(`[Verify OTP] Error: ${error.message}`);

        return res.status(500).json({
            message: "Unable to verify OTP right now. Please try again later.",
        });
    }
};

// =====================================================
// LOGOUT
// =====================================================

const logout = async (req, res) => {
    try {
        res.clearCookie("hotelbilling", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            path: "/",
        });

        log.info(
            `User logged out: ${req.user?.name || "Unknown"}`
        );

        return res.status(200).json({
            message: "Logout successful",
        });

    } catch (error) {
        console.error("[Logout] Error:", error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// =====================================================
// GET CURRENT USER
// =====================================================

const getUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-otp -otpExpiresAt")
            .lean();

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        let isMainBranch = true;
        let branchName = "";
        let branchCode = "";

        if (user.branchId) {
            const branchDoc = await BranchHotels.findById(user.branchId)
                .select("branchName branchCode isMainBranch")
                .lean();

            if (branchDoc) {
                isMainBranch = branchDoc.isMainBranch ?? (branchDoc.branchCode === "MAIN");
                branchName = branchDoc.branchName;
                branchCode = branchDoc.branchCode;
            }
        }

        return res.status(200).json({
            user: {
                ...user,
                isMainBranch,
                branchName,
                branchCode,
            },
        });

    } catch (error) {
        console.error("[Get User] Error:", error);
        log.error(`[Get User] Error: ${error.message}`);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

// =====================================================
// EXPORT
// =====================================================

export {
    sendOTPForLogin,
    verifyOTP,
    logout,
    getUser,
};