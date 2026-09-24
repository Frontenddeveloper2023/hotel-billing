import mongoose from "mongoose";
import User from "../models/users.js";
import Subscription from "../models/subscription.js";
import { log } from "../util/logger.js";

/**
 * ============================================================
 * DEFAULT PERMISSIONS
 * ============================================================
 */

const DEFAULT_PERMISSIONS = {
  dashboard: false,
  roomsBooking: false,
  foodManagement: false,
  serviceManagement: false,
  reports: false,
  customer: false,
  invoice: false,
  settings: false,
  users: false,
};


/**
 * ============================================================
 * HELPER - VALIDATE OBJECT ID
 * ============================================================
 */

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};


/**
 * ============================================================
 * HELPER - GET TENANT IDS
 * ============================================================
 *
 * hotelId and branchId always come from req.user.
 *
 * NEVER trust these values from req.body.
 * ============================================================
 */

const getTenantIds = (req, res) => {
  const hotelId = req.user?.hotelId;
  const branchId = req.user?.branchId;

  /**
   * ----------------------------------------------------------
   * HOTEL
   * ----------------------------------------------------------
   */

  if (!hotelId) {
    res.status(403).json({
      success: false,
      message:
        "Your account is not connected to a hotel. Please contact the administrator.",
    });

    return null;
  }

  /**
   * ----------------------------------------------------------
   * BRANCH
   * ----------------------------------------------------------
   */

  if (!branchId) {
    res.status(403).json({
      success: false,
      message:
        "Your account is not connected to a branch. Please contact the administrator.",
    });

    return null;
  }

  /**
   * ----------------------------------------------------------
   * VALIDATE HOTEL ID
   * ----------------------------------------------------------
   */

  if (!isValidObjectId(hotelId)) {
    res.status(400).json({
      success: false,
      message:
        "Your hotel information is invalid. Please contact the administrator.",
    });

    return null;
  }

  /**
   * ----------------------------------------------------------
   * VALIDATE BRANCH ID
   * ----------------------------------------------------------
   */

  if (!isValidObjectId(branchId)) {
    res.status(400).json({
      success: false,
      message:
        "Your branch information is invalid. Please contact the administrator.",
    });

    return null;
  }

  return {
    hotelId,
    branchId,
  };
};


/**
 * ============================================================
 * HELPER - GET ACTIVE SUBSCRIPTION
 * ============================================================
 *
 * Subscription is the runtime source of truth for:
 *
 * - limits
 * - features
 * - status
 * - expiry
 *
 * ============================================================
 */

const getActiveSubscription = async (
  hotelId
) => {
  const now = new Date();

  const subscription =
    await Subscription.findOne({
      hotelId,

      status: {
        $in: [
          "trial",
          "active",
          "expiring_soon",
        ],
      },

      endDate: {
        $gt: now,
      },
    })
      .sort({
        endDate: -1,
      })
      .lean();

  return subscription;
};


/**
 * ============================================================
 * HELPER - VERIFY SUBSCRIPTION
 * ============================================================
 */

const requireActiveSubscription =
  async (
    req,
    res,
    hotelId
  ) => {
    /**
     * If subscriptionVerify middleware already ran,
     * use req.subscription.
     */

    if (req.subscription) {
      return req.subscription;
    }

    /**
     * Otherwise load it here.
     */

    const subscription =
      await getActiveSubscription(
        hotelId
      );

    if (!subscription) {
      res.status(403).json({
        success: false,
        message:
          "Your subscription has expired or is not active. Please renew your plan.",
      });

      return null;
    }

    return subscription;
  };


/**
 * ============================================================
 * HELPER - GET RECEPTIONIST COUNT
 * ============================================================
 *
 * Receptionist limit is subscription-level / hotel-level.
 *
 * Therefore we count receptionists across the whole hotel,
 * not only the current branch.
 *
 * ============================================================
 */

const getReceptionistCount = async (
  hotelId
) => {
  return User.countDocuments({
    hotelId,
    role: "receptionist",
  });
};


/**
 * ============================================================
 * HELPER - CHECK RECEPTIONIST LIMIT
 * ============================================================
 */

const checkReceptionistLimit =
  async (
    hotelId,
    subscription
  ) => {
    const limit =
      Number(
        subscription?.limits
          ?.receptionists ?? 0
      );

    const currentCount =
      await getReceptionistCount(
        hotelId
      );

    /**
     * 0 means no receptionists allowed.
     */

    if (
      currentCount >= limit
    ) {
      return {
        allowed: false,
        limit,
        currentCount,
      };
    }

    return {
      allowed: true,
      limit,
      currentCount,
    };
  };


/**
 * ============================================================
 * HELPER - BUILD PERMISSIONS BASED ON SUBSCRIPTION
 * ============================================================
 *
 * Backend decides whether subscription-dependent features
 * can actually be enabled.
 *
 * ============================================================
 */

const buildPermissions = (
  permission,
  subscription
) => {
  const requestedPermission =
    permission || {};

  const finalPermission = {
    ...DEFAULT_PERMISSIONS,
    ...requestedPermission,
  };

  /**
   * ----------------------------------------------------------
   * FOOD SERVICE FEATURE
   * ----------------------------------------------------------
   *
   * If subscription does not include foodService,
   * user cannot receive foodManagement permission.
   */

  if (
    subscription?.features
      ?.foodService !== true
  ) {
    finalPermission.foodManagement =
      false;
  }

  /**
   * ----------------------------------------------------------
   * ROOM SERVICE FEATURE
   * ----------------------------------------------------------
   *
   * Your system calls the room-service feature
   * "roomService", while user permission is
   * "serviceManagement".
   */

  if (
    subscription?.features
      ?.roomService !== true
  ) {
    finalPermission.serviceManagement =
      false;
  }

  return finalPermission;
};


/**
 * ============================================================
 * 1. CREATE USER
 * ============================================================
 */

export const createUser =
  async (req, res) => {
    try {
      /**
       * --------------------------------------------------------
       * GET TENANT
       * --------------------------------------------------------
       */

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * --------------------------------------------------------
       * GET BODY
       * --------------------------------------------------------
       */

      const {
        name,
        email,
        role,
        status,
        permission,
      } = req.body;

      /**
       * --------------------------------------------------------
       * 1. VALIDATE NAME
       * --------------------------------------------------------
       */

      if (
        !name ||
        !String(name).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide a valid full name for the user.",
        });
      }

      if (
        String(name).trim()
          .length < 2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "User name must be at least 2 characters long.",
        });
      }

      /**
       * --------------------------------------------------------
       * 2. VALIDATE EMAIL
       * --------------------------------------------------------
       */

      if (
        !email ||
        !String(email).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "An email address is required to create a user account.",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const normalizedEmail =
        String(email)
          .toLowerCase()
          .trim();

      if (
        !emailRegex.test(
          normalizedEmail
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The email address format is invalid. Please check and try again.",
        });
      }

      /**
       * --------------------------------------------------------
       * 3. VALIDATE ROLE
       * --------------------------------------------------------
       */

      if (
        !role ||
        ![
          "admin",
          "receptionist",
        ].includes(
          String(role).toLowerCase()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select a valid user role: Admin or Receptionist.",
        });
      }

      const normalizedRole =
        String(role).toLowerCase();

      /**
       * --------------------------------------------------------
       * 4. VALIDATE STATUS
       * --------------------------------------------------------
       */

      const normalizedStatus =
        status || "active";

      if (
        ![
          "active",
          "inactive",
        ].includes(
          normalizedStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user status. Please select Active or Inactive.",
        });
      }

      /**
       * --------------------------------------------------------
       * 5. GET ACTIVE SUBSCRIPTION
       * --------------------------------------------------------
       */

      const subscription =
        await requireActiveSubscription(
          req,
          res,
          hotelId
        );

      if (!subscription) {
        return;
      }

      log.info(
        `[createUser] Subscription verified | Hotel: ${hotelId} | Subscription: ${subscription._id} | Status: ${subscription.status}`
      );

      /**
       * --------------------------------------------------------
       * 6. CHECK RECEPTIONIST LIMIT
       * --------------------------------------------------------
       *
       * Only receptionist users consume the
       * receptionist subscription limit.
       */

      if (
        normalizedRole ===
        "receptionist"
      ) {
        const receptionistLimit =
          await checkReceptionistLimit(
            hotelId,
            subscription
          );

        if (
          !receptionistLimit.allowed
        ) {
          return res.status(403).json({
            success: false,
            message:
              `Your current plan allows a maximum of ${receptionistLimit.limit} receptionist(s). You already have ${receptionistLimit.currentCount}. Please upgrade your plan to add another receptionist.`,
            limit:
              receptionistLimit.limit,
            currentCount:
              receptionistLimit.currentCount,
          });
        }

        log.info(
          `[createUser] Receptionist limit passed | Hotel: ${hotelId} | Current: ${receptionistLimit.currentCount} | Limit: ${receptionistLimit.limit}`
        );
      }

      /**
       * --------------------------------------------------------
       * 7. CHECK GLOBAL EMAIL
       * --------------------------------------------------------
       *
       * User email is globally unique according to
       * your User model.
       */

      const existingUser =
        await User.findOne({
          email:
            normalizedEmail,
        });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email address already exists.",
        });
      }

      /**
       * --------------------------------------------------------
       * 8. BUILD SUBSCRIPTION-AWARE PERMISSIONS
       * --------------------------------------------------------
       */

      const finalPermission =
        buildPermissions(
          permission,
          subscription
        );

      /**
       * --------------------------------------------------------
       * 9. CREATE USER
       * --------------------------------------------------------
       *
       * hotelId + branchId ALWAYS come from req.user.
       */

      const newUser =
        new User({
          name:
            String(name).trim(),

          email:
            normalizedEmail,

          role:
            normalizedRole,

          hotelId,
          branchId,

          status:
            normalizedStatus,

          permission:
            finalPermission,
        });

      const savedUser =
        await newUser.save();

      /**
       * --------------------------------------------------------
       * LOG
       * --------------------------------------------------------
       */

      log.info(
        `[createUser] User created successfully | User ID: ${savedUser._id} | Hotel ID: ${hotelId} | Branch ID: ${branchId} | Role: ${savedUser.role} | Subscription: ${subscription._id}`
      );

      /**
       * --------------------------------------------------------
       * RESPONSE
       * --------------------------------------------------------
       */

      return res.status(201).json({
        success: true,
        message:
          "User account has been successfully created.",
        data:
          savedUser,
      });
    } catch (error) {
      console.error(
        "[createUser Error]:",
        error
      );

      log.error(
        `[createUser Error] Failed to create user. Details: ${error.message}`
      );

      /**
       * --------------------------------------------------------
       * VALIDATION ERROR
       * --------------------------------------------------------
       */

      if (
        error.name ===
        "ValidationError"
      ) {
        const messages =
          Object.values(
            error.errors
          ).map(
            (err) =>
              err.message
          );

        return res.status(400).json({
          success: false,
          message:
            messages.join(", "),
        });
      }

      /**
       * --------------------------------------------------------
       * DUPLICATE KEY
       * --------------------------------------------------------
       */

      if (
        error.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this information already exists.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to create the user right now. Please try again later.",
      });
    }
  };


/**
 * ============================================================
 * 2. GET ALL USERS
 * ============================================================
 *
 * Only current hotel + current branch.
 *
 * ============================================================
 */

export const getAllUsers =
  async (req, res) => {
    try {
      /**
       * --------------------------------------------------------
       * TENANT
       * --------------------------------------------------------
       */

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * --------------------------------------------------------
       * SUBSCRIPTION
       * --------------------------------------------------------
       */

      const subscription =
        await requireActiveSubscription(
          req,
          res,
          hotelId
        );

      if (!subscription) {
        return;
      }

      /**
       * --------------------------------------------------------
       * USERS
       * --------------------------------------------------------
       */

      const users =
        await User.find({
          hotelId,
          branchId,
        })
          .select(
            "-otp -otpExpiresAt"
          )
          .sort({
            createdAt: -1,
          });

      /**
       * --------------------------------------------------------
       * LOG
       * --------------------------------------------------------
       */

      log.info(
        `[getAllUsers] Loaded ${users.length} users | Hotel ID: ${hotelId} | Branch ID: ${branchId} | Subscription: ${subscription._id}`
      );

      /**
       * --------------------------------------------------------
       * RESPONSE
       * --------------------------------------------------------
       */

      return res.status(200).json({
        success: true,
        count:
          users.length,
        users,
      });
    } catch (error) {
      console.error(
        "[getAllUsers Error]:",
        error
      );

      log.error(
        `[getAllUsers Error] Failed to fetch users. Details: ${error.message}`
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to load the users list right now. Please try again later.",
      });
    }
  };


/**
 * ============================================================
 * 3. UPDATE USER
 * ============================================================
 */

export const updateUser =
  async (req, res) => {
    try {
      /**
       * --------------------------------------------------------
       * TENANT
       * --------------------------------------------------------
       */

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * --------------------------------------------------------
       * PARAM
       * --------------------------------------------------------
       */

      const { id } =
        req.params;

      /**
       * --------------------------------------------------------
       * BODY
       * --------------------------------------------------------
       */

      const {
        name,
        email,
        role,
        status,
        permission,
      } = req.body;

      /**
       * --------------------------------------------------------
       * 1. VALIDATE ID
       * --------------------------------------------------------
       */

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "User ID is required.",
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The provided user ID is invalid.",
        });
      }

      /**
       * --------------------------------------------------------
       * 2. GET ACTIVE SUBSCRIPTION
       * --------------------------------------------------------
       */

      const subscription =
        await requireActiveSubscription(
          req,
          res,
          hotelId
        );

      if (!subscription) {
        return;
      }

      /**
       * --------------------------------------------------------
       * 3. VALIDATE NAME
       * --------------------------------------------------------
       */

      if (
        name !== undefined
      ) {
        if (
          !String(name).trim()
        ) {
          return res.status(400).json({
            success: false,
            message:
              "User name cannot be empty.",
          });
        }

        if (
          String(name).trim()
            .length < 2
        ) {
          return res.status(400).json({
            success: false,
            message:
              "User name must be at least 2 characters long.",
          });
        }
      }

      /**
       * --------------------------------------------------------
       * 4. VALIDATE EMAIL
       * --------------------------------------------------------
       */

      let normalizedEmail;

      if (
        email !== undefined
      ) {
        normalizedEmail =
          String(email)
            .toLowerCase()
            .trim();

        const emailRegex =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
          !normalizedEmail ||
          !emailRegex.test(
            normalizedEmail
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide a valid email address.",
          });
        }
      }

      /**
       * --------------------------------------------------------
       * 5. VALIDATE ROLE
       * --------------------------------------------------------
       */

      let normalizedRole;

      if (
        role !== undefined
      ) {
        normalizedRole =
          String(role).toLowerCase();

        if (
          ![
            "admin",
            "receptionist",
          ].includes(
            normalizedRole
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid role. Allowed roles are Admin or Receptionist.",
          });
        }
      }

      /**
       * --------------------------------------------------------
       * 6. VALIDATE STATUS
       * --------------------------------------------------------
       */

      if (
        status !== undefined &&
        ![
          "active",
          "inactive",
        ].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user status. Allowed values are Active or Inactive.",
        });
      }

      /**
       * --------------------------------------------------------
       * 7. FIND USER INSIDE TENANT
       * --------------------------------------------------------
       */

      const userToUpdate =
        await User.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!userToUpdate) {
        return res.status(404).json({
          success: false,
          message:
            "The user was not found in your hotel branch.",
        });
      }

      /**
       * --------------------------------------------------------
       * 8. PREVENT MAIN SAAS ADMIN MODIFICATION
       * --------------------------------------------------------
       */

      if (
        userToUpdate.role ===
          "admin" &&
        !userToUpdate.hotelId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "The main administrator account cannot be modified.",
        });
      }

      /**
       * --------------------------------------------------------
       * 9. CHECK EMAIL UNIQUENESS
       * --------------------------------------------------------
       */

      if (
        normalizedEmail &&
        normalizedEmail !==
          userToUpdate.email
      ) {
        const emailExists =
          await User.findOne({
            email:
              normalizedEmail,

            _id: {
              $ne: id,
            },
          });

        if (emailExists) {
          return res.status(409).json({
            success: false,
            message:
              "This email address is already associated with another account.",
          });
        }
      }

      /**
       * --------------------------------------------------------
       * 10. CHECK RECEPTIONIST LIMIT
       * --------------------------------------------------------
       *
       * Important:
       *
       * If the existing user is already receptionist,
       * updating other fields does not consume another slot.
       *
       * If changing:
       *
       * admin → receptionist
       *
       * then check the subscription limit.
       *
       * --------------------------------------------------------
       */

      if (
        normalizedRole ===
          "receptionist" &&
        userToUpdate.role !==
          "receptionist"
      ) {
        const receptionistLimit =
          await checkReceptionistLimit(
            hotelId,
            subscription
          );

        if (
          !receptionistLimit.allowed
        ) {
          return res.status(403).json({
            success: false,
            message:
              `Your current plan allows a maximum of ${receptionistLimit.limit} receptionist(s). You already have ${receptionistLimit.currentCount}. Please upgrade your plan to add another receptionist.`,
            limit:
              receptionistLimit.limit,
            currentCount:
              receptionistLimit.currentCount,
          });
        }
      }

      /**
       * --------------------------------------------------------
       * 11. BUILD UPDATE OBJECT
       * --------------------------------------------------------
       */

      const updateData = {};

      if (
        name !== undefined
      ) {
        updateData.name =
          String(name).trim();
      }

      if (
        normalizedEmail !==
        undefined
      ) {
        updateData.email =
          normalizedEmail;
      }

      if (
        normalizedRole !==
        undefined
      ) {
        updateData.role =
          normalizedRole;
      }

      if (
        status !== undefined
      ) {
        updateData.status =
          status;
      }

      /**
       * --------------------------------------------------------
       * 12. SUBSCRIPTION-AWARE PERMISSIONS
       * --------------------------------------------------------
       */

      if (
        permission !==
        undefined
      ) {
        updateData.permission =
          buildPermissions(
            permission,
            subscription
          );
      }

      /**
       * --------------------------------------------------------
       * 13. DON'T ALLOW TENANT CHANGES
       * --------------------------------------------------------
       *
       * We intentionally DO NOT accept:
       *
       * req.body.hotelId
       * req.body.branchId
       *
       * Tenant ownership cannot be changed here.
       *
       * --------------------------------------------------------
       */

      const updatedUser =
        await User.findOneAndUpdate(
          {
            _id: id,
            hotelId,
            branchId,
          },
          updateData,
          {
            new: true,
            runValidators: true,
          }
        ).select(
          "-otp -otpExpiresAt"
        );

      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          message:
            "The user could not be updated because the account was not found in your branch.",
        });
      }

      /**
       * --------------------------------------------------------
       * LOG
       * --------------------------------------------------------
       */

      log.info(
        `[updateUser] User updated successfully | User ID: ${id} | Hotel ID: ${hotelId} | Branch ID: ${branchId} | Subscription: ${subscription._id}`
      );

      /**
       * --------------------------------------------------------
       * RESPONSE
       * --------------------------------------------------------
       */

      return res.status(200).json({
        success: true,
        message:
          "User details have been successfully updated.",
        data:
          updatedUser,
      });
    } catch (error) {
      console.error(
        "[updateUser Error]:",
        error
      );

      log.error(
        `[updateUser Error] Failed to update user ID ${req.params?.id}. Details: ${error.message}`
      );

      /**
       * --------------------------------------------------------
       * VALIDATION ERROR
       * --------------------------------------------------------
       */

      if (
        error.name ===
        "ValidationError"
      ) {
        const messages =
          Object.values(
            error.errors
          ).map(
            (err) =>
              err.message
          );

        return res.status(400).json({
          success: false,
          message:
            messages.join(", "),
        });
      }

      /**
       * --------------------------------------------------------
       * DUPLICATE KEY
       * --------------------------------------------------------
       */

      if (
        error.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This email address is already associated with another account.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to update the user right now. Please try again later.",
      });
    }
  };


/**
 * ============================================================
 * 4. DELETE USER
 * ============================================================
 */

export const deleteUser =
  async (req, res) => {
    try {
      /**
       * --------------------------------------------------------
       * TENANT
       * --------------------------------------------------------
       */

      const tenant =
        getTenantIds(
          req,
          res
        );

      if (!tenant) {
        return;
      }

      const {
        hotelId,
        branchId,
      } = tenant;

      /**
       * --------------------------------------------------------
       * PARAM
       * --------------------------------------------------------
       */

      const { id } =
        req.params;

      /**
       * --------------------------------------------------------
       * VALIDATE ID
       * --------------------------------------------------------
       */

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "User ID is required for deletion.",
        });
      }

      if (
        !isValidObjectId(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The provided user ID is invalid.",
        });
      }

      /**
       * --------------------------------------------------------
       * FIND USER INSIDE TENANT
       * --------------------------------------------------------
       */

      const userToDelete =
        await User.findOne({
          _id: id,
          hotelId,
          branchId,
        });

      if (!userToDelete) {
        return res.status(404).json({
          success: false,
          message:
            "The user was not found in your hotel branch.",
        });
      }

      /**
       * --------------------------------------------------------
       * PREVENT DELETING SAAS MAIN ADMIN
       * --------------------------------------------------------
       */

      if (
        !userToDelete.hotelId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "The main administrator account cannot be deleted.",
        });
      }

      /**
       * --------------------------------------------------------
       * PREVENT SELF DELETE
       * --------------------------------------------------------
       */

      if (
        req.user?._id &&
        String(
          userToDelete._id
        ) ===
          String(
            req.user._id
          )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot delete your own account.",
        });
      }

      /**
       * --------------------------------------------------------
       * DELETE ONLY CURRENT TENANT USER
       * --------------------------------------------------------
       */

      await User.findOneAndDelete({
        _id: id,
        hotelId,
        branchId,
      });

      /**
       * --------------------------------------------------------
       * LOG
       * --------------------------------------------------------
       */

      log.info(
        `[deleteUser] User deleted successfully | User ID: ${id} | Hotel ID: ${hotelId} | Branch ID: ${branchId}`
      );

      /**
       * --------------------------------------------------------
       * RESPONSE
       * --------------------------------------------------------
       */

      return res.status(200).json({
        success: true,
        message:
          "User has been successfully deleted.",
      });
    } catch (error) {
      console.error(
        "[deleteUser Error]:",
        error
      );

      log.error(
        `[deleteUser Error] Failed to delete user ID ${req.params?.id}. Details: ${error.message}`
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to delete the user right now. Please try again later.",
      });
    }
  };