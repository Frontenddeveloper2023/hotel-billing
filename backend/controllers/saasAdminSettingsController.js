import Users from "../models/users.js";
import { log } from "../util/logger.js";

// Helper for validating email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// =========================================================================
// 1. GET ALL ADMINS & SUB-ADMINS (Admin or Sub-Admin can view)
// =========================================================================
export const getAllAdminsAndSubAdmins = async (req, res) => {
    try {
        const users = await Users.find({
            role: { $in: ["admin", "sub_admin"] },
        })
            .select("-otp -otpExpiresAt")
            .sort({ role: 1, createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            data: users,
        });
    } catch (error) {
        log(`[SaaSAdminSettings] Error fetching admins: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch admin users. Please try again.",
            error: error.message,
        });
    }
};

// =========================================================================
// 2. CREATE SUB-ADMIN (MAIN ADMIN ONLY)
// =========================================================================
export const createSubAdmin = async (req, res) => {
    try {
        // Enforce: only Main Admin can create sub-admins
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only the main admin can create sub-admins.",
            });
        }

        const { name, email } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Sub-admin name is required.",
            });
        }

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email address is required.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        // Check if email already exists
        const existingUser = await Users.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "A user with this email already exists.",
            });
        }

        const newSubAdmin = await Users.create({
            name: name.trim(),
            email: normalizedEmail,
            role: "sub_admin",
            hotelId: null,
            branchId: null,
            status: "active",
            permission: {
                saasAdmin: true,
                hotels: true,
                plans: true,
                hotelRegistrations: true,
                subscriptions: true,
                settings: true,
            },
        });

        log(`[SaaSAdminSettings] Main admin created sub-admin: ${newSubAdmin.email}`);

        const sanitized = newSubAdmin.toObject();
        delete sanitized.otp;
        delete sanitized.otpExpiresAt;

        return res.status(201).json({
            success: true,
            message: "Sub-admin created successfully.",
            data: sanitized,
        });
    } catch (error) {
        log(`[SaaSAdminSettings] Error creating sub-admin: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Failed to create sub-admin. Please try again.",
            error: error.message,
        });
    }
};

// =========================================================================
// 3. UPDATE SUB-ADMIN (MAIN ADMIN ONLY)
// =========================================================================
export const updateSubAdmin = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only the main admin can edit sub-admins.",
            });
        }

        const { id } = req.params;
        const { name, email, status } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        const targetUser = await Users.findById(id);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "Sub-admin not found.",
            });
        }

        // Target must be a sub_admin
        if (targetUser.role !== "sub_admin") {
            return res.status(400).json({
                success: false,
                message: "Only sub-admins can be edited via this endpoint.",
            });
        }

        const updates = {};

        if (name && name.trim()) {
            updates.name = name.trim();
        }

        if (email && email.trim()) {
            const normalizedEmail = email.trim().toLowerCase();
            if (!isValidEmail(normalizedEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid email address.",
                });
            }

            if (normalizedEmail !== targetUser.email) {
                const emailConflict = await Users.findOne({
                    email: normalizedEmail,
                    _id: { $ne: id },
                });
                if (emailConflict) {
                    return res.status(409).json({
                        success: false,
                        message: "This email address is already in use.",
                    });
                }
                updates.email = normalizedEmail;
            }
        }

        if (status && ["active", "inactive"].includes(status)) {
            updates.status = status;
        }

        const updatedUser = await Users.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-otp -otpExpiresAt");

        log(`[SaaSAdminSettings] Main admin updated sub-admin: ${updatedUser.email}`);

        return res.status(200).json({
            success: true,
            message: "Sub-admin updated successfully.",
            data: updatedUser,
        });
    } catch (error) {
        log(`[SaaSAdminSettings] Error updating sub-admin: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Failed to update sub-admin. Please try again.",
            error: error.message,
        });
    }
};

// =========================================================================
// 4. BLOCK / UNBLOCK SUB-ADMIN (MAIN ADMIN ONLY)
// =========================================================================
export const toggleBlockSubAdmin = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only the main admin can block or unblock sub-admins.",
            });
        }

        const { id } = req.params;
        const { status } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        if (!status || !["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be either 'active' or 'inactive'.",
            });
        }

        const targetUser = await Users.findById(id);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (targetUser.role !== "sub_admin") {
            return res.status(400).json({
                success: false,
                message: "Cannot block/unblock a main admin.",
            });
        }

        targetUser.status = status;
        await targetUser.save();

        log(`[SaaSAdminSettings] Sub-admin status toggled: ${targetUser.email} -> ${status}`);

        return res.status(200).json({
            success: true,
            message: `Sub-admin successfully ${status === "active" ? "unblocked" : "blocked"}.`,
            data: {
                _id: targetUser._id,
                status: targetUser.status,
            },
        });
    } catch (error) {
        log(`[SaaSAdminSettings] Error toggling sub-admin status: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Failed to change sub-admin status. Please try again.",
            error: error.message,
        });
    }
};

// =========================================================================
// 5. DELETE SUB-ADMIN (MAIN ADMIN ONLY)
// =========================================================================
export const deleteSubAdmin = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only the main admin can delete sub-admins.",
            });
        }

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "User ID is required.",
            });
        }

        const targetUser = await Users.findById(id);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        if (targetUser.role !== "sub_admin") {
            return res.status(400).json({
                success: false,
                message: "Cannot delete a main admin.",
            });
        }

        await Users.findByIdAndDelete(id);

        log(`[SaaSAdminSettings] Main admin deleted sub-admin: ${targetUser.email}`);

        return res.status(200).json({
            success: true,
            message: "Sub-admin deleted successfully.",
            data: { id },
        });
    } catch (error) {
        log(`[SaaSAdminSettings] Error deleting sub-admin: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Failed to delete sub-admin. Please try again.",
            error: error.message,
        });
    }
};

// =========================================================================
// 6. MAIN ADMIN UPDATE OWN EMAIL & NAME (MAIN ADMIN ONLY)
// =========================================================================
export const updateAdminProfile = async (req, res) => {
    try {
        // Enforce: only Main Admin can edit their email/profile
        if (req.user?.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Sub-admins cannot edit profile or email.",
            });
        }

        const { name, email } = req.body;
        const adminId = req.user._id;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email address is required.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address.",
            });
        }

        // Check if email already used by someone else
        const conflict = await Users.findOne({
            email: normalizedEmail,
            _id: { $ne: adminId },
        });
        if (conflict) {
            return res.status(409).json({
                success: false,
                message: "This email address is already in use by another account.",
            });
        }

        const updates = { email: normalizedEmail };
        if (name && name.trim()) {
            updates.name = name.trim();
        }

        const updatedAdmin = await Users.findByIdAndUpdate(
            adminId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select("-otp -otpExpiresAt");

        log(`[SaaSAdminSettings] Main admin updated profile: ${updatedAdmin.email}`);

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully.",
            data: updatedAdmin,
        });
    } catch (error) {
        log(`[SaaSAdminSettings] Error updating admin profile: ${error.message}`);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile. Please try again.",
            error: error.message,
        });
    }
};
