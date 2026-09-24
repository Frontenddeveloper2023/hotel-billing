import BranchHotels from "../models/BranchHotels.js";
import Subscription from "../models/subscription.js";
import Hotels from "../models/hotels.js";
import Room from "../models/room.js";
import Booking from "../models/booking.js";
import User from "../models/users.js";
import { log } from "../util/logger.js";

/**
 * ============================================================
 * HELPER - GET ACTIVE SUBSCRIPTION FOR HOTEL
 * ============================================================
 */
const getActiveSubscription = async (hotelId) => {
  const now = new Date();

  return await Subscription.findOne({
    hotelId,
    status: {
      $in: ["trial", "active", "expiring_soon", "grace_period"],
    },
    endDate: {
      $gt: now,
    },
  })
    .populate("planId", "planName")
    .sort({
      endDate: -1,
    })
    .lean();
};

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

/**
 * ============================================================
 * GET BRANCH USAGE & SUBSCRIPTION LIMIT
 * ============================================================
 */
export const getBranchUsage = async (req, res) => {
  try {
    let hotelId = req.user?.hotelId;

    if (req.user?.role === "admin" && !hotelId) {
      hotelId = req.query?.hotelId;
    }

    if (!hotelId) {
      return res.status(400).json({
        success: false,
        message: "Hotel ID is required to fetch branch usage.",
      });
    }

    const subscription = await getActiveSubscription(hotelId);

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message:
          "Your hotel does not have an active subscription. Please renew or upgrade your plan.",
      });
    }

    const branchLimit = Number(subscription.limits?.branches ?? 0);
    const currentCount = await BranchHotels.countDocuments({ hotelId });

    return res.status(200).json({
      success: true,
      message: "Branch usage retrieved successfully.",
      data: {
        hotelId,
        planName: subscription.planId?.planName || "Active Plan",
        limit: branchLimit,
        used: currentCount,
        remaining: Math.max(0, branchLimit - currentCount),
        canCreate: currentCount < branchLimit,
      },
    });
  } catch (error) {
    log.error(`[Branch Controller] Error fetching branch usage: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve branch usage right now.",
    });
  }
};

/**
 * ============================================================
 * CREATE BRANCH / SUB-BRANCH
 * ============================================================
 */
export const createBranch = async (req, res) => {
  try {
    // --------------------------------------------------------
    // 1. Resolve Hotel ID (Tenant Isolation)
    // --------------------------------------------------------
    let hotelId = req.user?.hotelId;

    if (req.user?.role === "admin") {
      hotelId = req.body?.hotelId || hotelId;
    }

    if (!hotelId) {
      return res.status(400).json({
        success: false,
        message: "Hotel ID is required to create a branch.",
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(hotelId.toString())) {
      return res.status(400).json({
        success: false,
        message: "Invalid hotel ID.",
      });
    }

    // Guard: Only Main Branch or Admin can create sub-branches
    if (req.user?.role === "hotelOwner" && req.user?.branchId) {
      const requesterBranch = await BranchHotels.findById(req.user.branchId).lean();
      if (requesterBranch && !requesterBranch.isMainBranch && requesterBranch.branchCode !== "MAIN") {
        return res.status(403).json({
          success: false,
          message: "Only the primary Main Branch owner can create sub-branches.",
        });
      }
    }

    // --------------------------------------------------------
    // 2. Verify Subscription Plan Limit
    // --------------------------------------------------------
    let subscription = req.subscription;
    if (!subscription) {
      subscription = await getActiveSubscription(hotelId);
    }

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message:
          "Your subscription has expired or is not active. Please renew or upgrade your plan to create branches.",
      });
    }

    const branchLimit = Number(subscription.limits?.branches ?? 0);
    const currentCount = await BranchHotels.countDocuments({ hotelId });

    if (currentCount >= branchLimit) {
      return res.status(403).json({
        success: false,
        message: `Branch limit reached. Your current plan allows a maximum of ${branchLimit} branch${
          branchLimit === 1 ? "" : "es"
        } (you currently have ${currentCount}). Please upgrade your subscription to add more sub-branches.`,
        limit: branchLimit,
        currentCount,
        upgradeRequired: true,
      });
    }

    const {
      branchName,
      branchCode,
      phone,
      email,
      address,
      status,
    } = req.body;

    // --------------------------------------------------------
    // 3. Validate Branch Name
    // --------------------------------------------------------
    if (!branchName || !branchName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Branch name is required.",
      });
    }

    if (branchName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Branch name must contain at least 2 characters.",
      });
    }

    // --------------------------------------------------------
    // 4. Validate Branch Code
    // --------------------------------------------------------
    let normalizedCode = "";
    if (branchCode && branchCode.trim()) {
      normalizedCode = branchCode.trim().toUpperCase();

      if (normalizedCode === "MAIN") {
        return res.status(400).json({
          success: false,
          message:
            "Branch code 'MAIN' is reserved for the primary branch. Please choose a different branch code.",
        });
      }
    }

    // --------------------------------------------------------
    // 5. Validate Phone
    // --------------------------------------------------------
    let normalizedPhone = "";
    if (phone !== undefined && phone !== null && phone !== "") {
      normalizedPhone = phone.trim();

      if (!/^[0-9]{10}$/.test(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must contain exactly 10 digits.",
        });
      }
    }

    // --------------------------------------------------------
    // 6. Validate Email
    // --------------------------------------------------------
    let normalizedEmail = "";
    if (email !== undefined && email !== null && email !== "") {
      normalizedEmail = email.trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid branch email address.",
        });
      }
    }

    // --------------------------------------------------------
    // 7. Validate Status
    // --------------------------------------------------------
    const allowedStatuses = ["active", "inactive"];
    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch status. Please use active or inactive.",
      });
    }

    // --------------------------------------------------------
    // 8. Check Duplicate Branch Name for this Hotel
    // --------------------------------------------------------
    const existingBranch = await BranchHotels.findOne({
      hotelId,
      branchName: branchName.trim(),
    });

    if (existingBranch) {
      return res.status(409).json({
        success: false,
        message:
          "A branch with this name already exists in this hotel. Please use a different branch name.",
      });
    }

    // --------------------------------------------------------
    // 9. Check Duplicate Branch Code for this Hotel
    // --------------------------------------------------------
    if (normalizedCode) {
      const existingBranchCode = await BranchHotels.findOne({
        hotelId,
        branchCode: normalizedCode,
      });

      if (existingBranchCode) {
        return res.status(409).json({
          success: false,
          message:
            "This branch code is already in use by another branch in this hotel.",
        });
      }
    }

    // --------------------------------------------------------
    // 10. Check Duplicate Email for this Hotel
    // --------------------------------------------------------
    if (normalizedEmail) {
      const existingEmail = await BranchHotels.findOne({
        hotelId,
        email: normalizedEmail,
      });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message:
            "This email address is already used by another branch in this hotel.",
        });
      }
    }


    // 10.1 Check Duplicate User Email
if (normalizedEmail) {
  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "This email already exists. Please use another email.",
    });
  }
}

    // --------------------------------------------------------
    // 11. Create Sub-Branch
    // --------------------------------------------------------
    const branch = await BranchHotels.create({
      hotelId,
      branchName: branchName.trim(),
      branchCode: normalizedCode,
      phone: normalizedPhone,
      email: normalizedEmail,
      address: {
        street: address?.street?.trim() || "",
        city: address?.city?.trim() || "",
        state: address?.state?.trim() || "",
        country: address?.country?.trim() || "",
        pincode: address?.pincode?.trim() || "",
      },
      status: status || "active",
      isMainBranch: false,
    });

    // --------------------------------------------------------
    // 12. Auto-Sync User Account for Sub-Branch Login
    // --------------------------------------------------------
   // --------------------------------------------------------
// 12. Create User Account for Sub-Branch Login
// --------------------------------------------------------
if (normalizedEmail) {
  const branchPermissions = buildBranchPermissions(subscription);

  await User.create({
    name: branch.branchName,
    email: normalizedEmail,
    role: "hotelOwner",
    hotelId: branch.hotelId,
    branchId: branch._id,
    status: branch.status,
    permission: branchPermissions,
  });

  log.info(
    `[Branch Controller] Auto-created User account for branch: ${branch.branchName} (${normalizedEmail})`
  );
}

log.info(
  `[Branch Controller] Sub-branch created: ${branch._id} for hotel: ${hotelId}`
);

return res.status(201).json({
  success: true,
  message: "Sub-branch created successfully.",
  data: branch,
});
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This branch information is already registered. Please check the branch name, code, or email.",
      });
    }

    log.error(`[Branch Controller] Error creating branch: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to create the branch right now. Please try again later.",
    });
  }
};

/**
 * ============================================================
 * GET ALL BRANCHES
 * ============================================================
 */
export const getAllBranches = async (req, res) => {
  try {
    const filter = {};

    if (req.user?.role !== "admin") {
      filter.hotelId = req.user?.hotelId;

      // Strict sub-branch scoping: sub-branch users can only see their own branch details
      if (req.user?.branchId) {
        const requesterBranch = await BranchHotels.findById(req.user.branchId).lean();
        if (requesterBranch && !requesterBranch.isMainBranch && requesterBranch.branchCode !== "MAIN") {
          filter._id = req.user.branchId;
        }
      }
    } else if (req.query?.hotelId) {
      if (!/^[0-9a-fA-F]{24}$/.test(req.query.hotelId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid hotel ID.",
        });
      }
      filter.hotelId = req.query.hotelId;
    }

    const branches = await BranchHotels.find(filter)
      .sort({
        isMainBranch: -1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: "Branches retrieved successfully.",
      count: branches.length,
      data: branches,
    });
  } catch (error) {
    log.error(`[Branch Controller] Error fetching branches: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to load branches right now. Please try again later.",
    });
  }
};

/**
 * ============================================================
 * GET BRANCH BY ID
 * ============================================================
 */
export const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const branch = await BranchHotels.findById(id).lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    if (
      req.user?.role !== "admin" &&
      branch.hotelId?.toString() !== req.user?.hotelId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this branch.",
      });
    }

    // Strict sub-branch check: sub-branch users can only access their own branch
    if (req.user?.role !== "admin" && req.user?.branchId) {
      const requesterBranch = await BranchHotels.findById(req.user.branchId).lean();
      if (requesterBranch && !requesterBranch.isMainBranch && requesterBranch.branchCode !== "MAIN") {
        if (branch._id.toString() !== req.user.branchId.toString()) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to view other branch details.",
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Branch details retrieved successfully.",
      data: branch,
    });
  } catch (error) {
    log.error(`[Branch Controller] Error fetching branch: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve branch details right now.",
    });
  }
};

/**
 * ============================================================
 * UPDATE BRANCH
 * ============================================================
 */
export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const branch = await BranchHotels.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    if (
      req.user?.role !== "admin" &&
      branch.hotelId?.toString() !== req.user?.hotelId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this branch.",
      });
    }

    // Guard: Sub-branch users can only update their own branch, never main or other branches
    if (req.user?.role !== "admin" && req.user?.branchId) {
      const requesterBranch = await BranchHotels.findById(req.user.branchId).lean();
      if (requesterBranch && !requesterBranch.isMainBranch && requesterBranch.branchCode !== "MAIN") {
        if (branch._id.toString() !== req.user.branchId.toString()) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to update other branch details.",
          });
        }
      }
    }

    const {
      branchName,
      branchCode,
      phone,
      email,
      address,
      status,
    } = req.body;

    const oldEmail = branch.email;

    // Validate branch name
    if (branchName !== undefined) {
      if (!branchName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Branch name cannot be empty.",
        });
      }

      if (branchName.trim().length < 2) {
        return res.status(400).json({
          success: false,
          message: "Branch name must contain at least 2 characters.",
        });
      }

      const duplicateBranch = await BranchHotels.findOne({
        hotelId: branch.hotelId,
        branchName: branchName.trim(),
        _id: { $ne: id },
      });

      if (duplicateBranch) {
        return res.status(409).json({
          success: false,
          message: "Another branch in this hotel is already using this name.",
        });
      }

      branch.branchName = branchName.trim();
    }

    // Validate branch code
    if (branchCode !== undefined) {
      const trimmedCode = branchCode.trim().toUpperCase();

      if (branch.isMainBranch || branch.branchCode === "MAIN") {
        if (trimmedCode !== "MAIN") {
          return res.status(400).json({
            success: false,
            message: "Cannot change the branch code of the primary MAIN branch.",
          });
        }
      } else if (trimmedCode === "MAIN") {
        return res.status(400).json({
          success: false,
          message: "Branch code 'MAIN' is reserved for the primary branch.",
        });
      }

      if (trimmedCode) {
        const duplicateCode = await BranchHotels.findOne({
          hotelId: branch.hotelId,
          branchCode: trimmedCode,
          _id: { $ne: id },
        });

        if (duplicateCode) {
          return res.status(409).json({
            success: false,
            message:
              "Another branch in this hotel is already using this branch code.",
          });
        }
      }

      branch.branchCode = trimmedCode;
    }

    // Validate phone
    if (phone !== undefined) {
      const trimmedPhone = phone.trim();
      if (trimmedPhone && !/^[0-9]{10}$/.test(trimmedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Phone number must contain exactly 10 digits.",
        });
      }
      branch.phone = trimmedPhone;
    }

    // --------------------------------------------------------
// Validate Email
// --------------------------------------------------------
let normalizedEmail = branch.email || "";

// Sub-branch owner cannot change branch email
if (
  email !== undefined &&
  req.user?.role === "hotelOwner" &&
  req.user?.branchId &&
  branch._id.toString() === req.user.branchId.toString()
) {
  const requestedEmail = email.trim().toLowerCase();

  if (requestedEmail !== branch.email) {
    return res.status(403).json({
      success: false,
      message: "Branch email cannot be changed.",
    });
  }
}

// Main branch owner / admin can still update email
if (
  email !== undefined &&
  !(
    req.user?.role === "hotelOwner" &&
    req.user?.branchId &&
    branch._id.toString() === req.user.branchId.toString()
  )
) {
  normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid branch email address.",
      });
    }

    const duplicateEmail = await BranchHotels.findOne({
      hotelId: branch.hotelId,
      email: normalizedEmail,
      _id: { $ne: id },
    });

    if (duplicateEmail) {
      return res.status(409).json({
        success: false,
        message:
          "Another branch in this hotel is already using this email address.",
      });
    }

    branch.email = normalizedEmail;
  }
}

    // Validate address
    if (address !== undefined) {
      branch.address = {
        street: address.street !== undefined ? address.street.trim() : branch.address?.street || "",
        city: address.city !== undefined ? address.city.trim() : branch.address?.city || "",
        state: address.state !== undefined ? address.state.trim() : branch.address?.state || "",
        country: address.country !== undefined ? address.country.trim() : branch.address?.country || "",
        pincode: address.pincode !== undefined ? address.pincode.trim() : branch.address?.pincode || "",
      };
    }

    // Validate status
    if (status !== undefined) {
      const allowedStatuses = ["active", "inactive"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch status. Please use active or inactive.",
        });
      }
      branch.status = status;
    }

    const updatedBranch = await branch.save();

    // Sync linked User document if email or status or name changed
    if (normalizedEmail || branch.status) {
      const searchEmail = oldEmail || normalizedEmail;
      if (searchEmail) {
        await User.findOneAndUpdate(
          { email: searchEmail },
          {
            email: normalizedEmail || oldEmail,
            name: branch.branchName,
            status: branch.status,
          }
        );
      }
    }

    log.info(`[Branch Controller] Branch updated: ${updatedBranch._id}`);

    return res.status(200).json({
      success: true,
      message: "Branch details updated successfully.",
      data: updatedBranch,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This branch information is already in use.",
      });
    }

    log.error(`[Branch Controller] Error updating branch: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to update branch details right now.",
    });
  }
};

/**
 * ============================================================
 * DELETE BRANCH
 * ============================================================
 */
export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid branch ID.",
      });
    }

    const branch = await BranchHotels.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found.",
      });
    }

    // Tenant isolation check
    if (
      req.user?.role !== "admin" &&
      branch.hotelId?.toString() !== req.user?.hotelId?.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this branch.",
      });
    }

    // Guard: Only Main Branch or Admin can delete sub-branches
    if (req.user?.role === "hotelOwner" && req.user?.branchId) {
      const requesterBranch = await BranchHotels.findById(req.user.branchId).lean();
      if (requesterBranch && !requesterBranch.isMainBranch && requesterBranch.branchCode !== "MAIN") {
        return res.status(403).json({
          success: false,
          message: "Only the primary Main Branch owner can delete sub-branches.",
        });
      }
    }

    // 1. Guard against deleting Main Branch
    if (branch.isMainBranch || branch.branchCode === "MAIN") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete the primary Main Branch of the hotel.",
      });
    }

    // 2. Guard against deleting branch with existing rooms
    const roomCount = await Room.countDocuments({ branchId: id });
    if (roomCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete branch because it has ${roomCount} registered room${
          roomCount === 1 ? "" : "s"
        }. Please reassign or remove rooms first.`,
      });
    }

    // 3. Guard against deleting branch with active bookings
    const activeBookingCount = await Booking.countDocuments({
      branchId: id,
      status: { $in: ["checkIn", "reserved"] },
    });
    if (activeBookingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete branch because it has ${activeBookingCount} active stay/reservation(s).`,
      });
    }

    // 4. Remove linked sub-branch user account if any
    if (branch.email) {
      await User.deleteMany({ email: branch.email, branchId: id });
    }

    await BranchHotels.findByIdAndDelete(id);

    log.info(`[Branch Controller] Branch deleted: ${id}`);

    return res.status(200).json({
      success: true,
      message: "Branch deleted successfully.",
    });
  } catch (error) {
    log.error(`[Branch Controller] Error deleting branch: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Unable to delete branch right now. Please try again later.",
    });
  }
};