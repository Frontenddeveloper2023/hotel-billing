import jwt from "jsonwebtoken";
import { log } from "../util/logger.js";
import User from "../models/users.js";


// =====================================================
// AUTH VERIFY
// =====================================================

const authVerify = async (req, res, next) => {
    try {

        let token = null;
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        }

        if (!token) {
            const reqCookieName = req.headers["x-cookie-name"];
            if (reqCookieName && req.cookies[reqCookieName]) {
                token = req.cookies[reqCookieName];
            }
        }

        if (!token) {
            const portal = req.headers["x-portal"];
            const cookieMap = {
                admin: "hotelbilling_admin",
                owner: "hotelbilling_owner",
                staff: "hotelbilling_staff",
            };
            token = cookieMap[portal] ? req.cookies[cookieMap[portal]] : null;
            if (!token && (!portal || portal === "hotel")) {
                token = req.cookies.hotelbilling_owner || req.cookies.hotelbilling_staff || req.cookies.hotelbilling || req.cookies.hotelbilling_admin;
            }
        }

        // -------------------------------------------------
        // TOKEN NOT FOUND
        // -------------------------------------------------

        if (!token) {

            log(
                "[Auth Verify] Authentication token not found"
            );

            return res.status(401).json({
                message: "Unauthorized",
            });
        }


        // -------------------------------------------------
        // VERIFY JWT
        // -------------------------------------------------

        let decoded;

        try {

            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        } catch (error) {

            if (error instanceof jwt.TokenExpiredError) {

                return res.status(401).json({
                    message: "Session expired. Please login again.",
                });
            }

            if (error instanceof jwt.JsonWebTokenError) {

                return res.status(401).json({
                    message: "Invalid authentication token.",
                });
            }

            if (error instanceof jwt.NotBeforeError) {

                return res.status(401).json({
                    message: "Authentication token is not active.",
                });
            }

            log(
                `[Auth Verify] JWT verification error: ${error.message}`
            );

            return res.status(500).json({
                message: "Internal server error",
            });
        }


        // -------------------------------------------------
        // USER ID FROM JWT
        // -------------------------------------------------

        const userId =
            decoded.id ||
            decoded.userId ||
            decoded._id;


        if (!userId) {

            log(
                "[Auth Verify] User ID not found in token"
            );

            return res.status(401).json({
                message: "Invalid authentication token.",
            });
        }


        // -------------------------------------------------
        // GET LATEST USER FROM DATABASE
        // -------------------------------------------------

        const user = await User.findById(userId)
            .select("-otp -otpExpiresAt")
            .lean();


        if (!user) {

            log(
                `[Auth Verify] User not found: ${userId}`
            );

            return res.status(401).json({
                message: "User account not found.",
            });
        }


        // -------------------------------------------------
        // USER STATUS
        // -------------------------------------------------

        if (user.status !== "active") {

            log(
                `[Auth Verify] Inactive user: ${userId}`
            );

            return res.status(403).json({
                message: "Your account is inactive.",
            });
        }


        // -------------------------------------------------
        // STORE FRESH USER DATA
        // -------------------------------------------------

        req.user = user;

        next();

    } catch (error) {

        console.error(
            "[Auth Verify] Unexpected error:",
            error
        );

        log(
            `[Auth Verify] Unexpected error: ${error.message}`
        );

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};



// =====================================================
// ADMIN VERIFY
// =====================================================

const adminVerify = async (req, res, next) => {

    try {

        // If authVerify already ran,
        // req.user already contains fresh DB data.

        if (!req.user) {
            const reqCookieName = req.headers["x-cookie-name"];
            let token = reqCookieName ? req.cookies[reqCookieName] : null;
            
            if (!token) {
                const portal = req.headers["x-portal"];
                const cookieMap = {
                    admin: "hotelbilling_admin",
                    owner: "hotelbilling_owner",
                    staff: "hotelbilling_staff",
                };
                token = req.cookies.hotelbilling_admin || (cookieMap[portal] ? req.cookies[cookieMap[portal]] : null) || req.cookies.hotelbilling;
            }

            if (!token) {

                return res.status(401).json({
                    message: "Unauthorized",
                });
            }


            let decoded;

            try {

                decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

            } catch (error) {

                if (
                    error instanceof jwt.TokenExpiredError
                ) {

                    return res.status(401).json({
                        message:
                            "Session expired. Please login again.",
                    });
                }

                return res.status(401).json({
                    message:
                        "Invalid authentication token.",
                });
            }


            const userId =
                decoded.id ||
                decoded.userId ||
                decoded._id;


            const user =
                await User.findById(userId)
                    .select("-otp -otpExpiresAt")
                    .lean();


            if (!user) {

                return res.status(401).json({
                    message:
                        "User account not found.",
                });
            }


            req.user = user;
        }


        // -------------------------------------------------
        // ADMIN ROLE CHECK
        // -------------------------------------------------

        if (req.user.role !== "admin") {

            log(
                `[Admin Verify] Forbidden. User ID: ${
                    req.user._id
                }, Role: ${
                    req.user.role
                }`
            );

            return res.status(403).json({
                message: "Forbidden",
            });
        }


        next();

    } catch (error) {

        console.error(
            "[Admin Verify] Unexpected error:",
            error
        );

        log(
            `[Admin Verify] Unexpected error: ${error.message}`
        );

        return res.status(500).json({
            message: "Internal server error",
        });
    }
};



// =====================================================
// PERMISSION VERIFY
// =====================================================

const permissionVerify = (permissionName) => {

    return async (req, res, next) => {

        try {

            // -------------------------------------------------
            // AUTH CHECK
            // -------------------------------------------------

            if (!req.user) {

                return res.status(401).json({
                    message: "Unauthorized",
                });
            }


            // -------------------------------------------------
            // ADMIN
            // -------------------------------------------------
            // Admin can access everything.
            // -------------------------------------------------

            if (req.user.role === "admin") {

                return next();
            }


            // -------------------------------------------------
            // USER PERMISSION
            // -------------------------------------------------

            const permissions =
                req.user.permission || {};


            const allowed =
                permissions[permissionName] === true;


            // -------------------------------------------------
            // ALLOWED
            // -------------------------------------------------

            if (allowed) {

                log(
                    `[Permission Verify] Allowed. User: ${
                        req.user._id
                    }, Permission: ${
                        permissionName
                    }`
                );

                return next();
            }


            // -------------------------------------------------
            // FORBIDDEN
            // -------------------------------------------------

            log(
                `[Permission Verify] Forbidden. User: ${
                    req.user._id
                }, Role: ${
                    req.user.role
                }, Permission: ${
                    permissionName
                }`
            );

            return res.status(403).json({
                message: "Forbidden",
            });

        } catch (error) {

            console.error(
                "[Permission Verify] Error:",
                error
            );

            return res.status(500).json({
                message: "Internal server error",
            });
        }
    };
};




const permissionVerifyAny = (...permissionNames) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    message: "Unauthorized",
                });
            }

            // Admin can access everything
            if (req.user.role === "admin") {
                return next();
            }

            const permissions = req.user.permission || {};

            const hasPermission = permissionNames.some(
                (permissionName) =>
                    permissions[permissionName] === true
            );

            if (hasPermission) {
                return next();
            }

            log(
                `[Permission Verify Any] Forbidden. User: ${req.user._id}, Role: ${req.user.role}, Required: ${permissionNames.join(", ")}`
            );

            return res.status(403).json({
                message: "Forbidden",
            });
        } catch (error) {
            console.error("[Permission Verify Any] Error:", error);

            return res.status(500).json({
                message: "Internal server error",
            });
        }
    };
};




// =====================================================
// HOTEL / BRANCH VERIFY
// =====================================================

const hotelBranchVerify = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // =====================================================
    // MAIN ADMIN
    // =====================================================

    if (req.user.role === "admin") {
      // Main SaaS Admin does NOT need hotelId or branchId.
      return next();
    }

    // =====================================================
    // HOTEL OWNER / RECEPTIONIST
    // =====================================================

    if (
      req.user.role === "hotelOwner" ||
      req.user.role === "receptionist"
    ) {
      if (!req.user.hotelId) {
        return res.status(403).json({
          success: false,
          message: "Your account is not connected to a hotel.",
        });
      }

      if (!req.user.branchId) {
        return res.status(403).json({
          success: false,
          message: "Your account is not connected to a branch.",
        });
      }

      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You are not authorized to access this resource.",
    });
  } catch (error) {
    log(
      `[Hotel Branch Verify] Error: ${error.message}`
    );

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};



export {
  authVerify,
  adminVerify,
  permissionVerify,
  permissionVerifyAny,
  hotelBranchVerify,
};

