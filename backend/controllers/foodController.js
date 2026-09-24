import mongoose from "mongoose";
import Food from "../models/food.js";
import { log } from "../util/logger.js";
import fs from "fs";
import path from "path";

// ============================================================
// TENANT HELPER
// ============================================================

const getTenantIds = (req) => {
    return {
        hotelId: req.user?.hotelId,
        branchId: req.user?.branchId,
    };
};

// ============================================================
// 1. CREATE FOOD ITEM
// ============================================================

export const createFood = async (req, res) => {
    try {
        const { hotelId, branchId } = getTenantIds(req);

        // =====================================================
        // AUTHENTICATED TENANT VALIDATION
        // =====================================================

        if (!hotelId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a hotel.",
            });
        }

        if (!branchId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a branch.",
            });
        }

        // =====================================================
        // VALIDATE FOOD DATA
        // =====================================================

        const {
            foodName,
            description,
            foodPrice,
        } = req.body;

        if (!foodName || !String(foodName).trim()) {
            return res.status(400).json({
                success: false,
                message: "Food name is required.",
            });
        }

        if (
            foodPrice === undefined ||
            foodPrice === null ||
            foodPrice === ""
        ) {
            return res.status(400).json({
                success: false,
                message: "Food price is required.",
            });
        }

        const safeFoodPrice = Number(foodPrice);

        if (!Number.isFinite(safeFoodPrice)) {
            return res.status(400).json({
                success: false,
                message: "Food price must be a valid number.",
            });
        }

        if (safeFoodPrice < 0) {
            return res.status(400).json({
                success: false,
                message: "Food price cannot be negative.",
            });
        }

        // =====================================================
        // HANDLE IMAGE
        // =====================================================

        let imagePath = "";

        if (req.file) {
            imagePath = `uploads/foods/${req.file.filename}`;
        }

        // =====================================================
        // CHECK DUPLICATE FOOD NAME
        // Only inside this hotel + branch
        // =====================================================

        const existingFood = await Food.findOne({
            hotelId,
            branchId,
            foodName: String(foodName).trim(),
        });

        if (existingFood) {
            // If a new image was uploaded but food already exists,
            // remove the unused uploaded file.
            if (req.file) {
                const uploadedPath = path.join(
                    process.cwd(),
                    imagePath
                );

                if (fs.existsSync(uploadedPath)) {
                    fs.unlinkSync(uploadedPath);
                }
            }

            return res.status(409).json({
                success: false,
                message:
                    "A food item with this name already exists in your branch.",
            });
        }

        // =====================================================
        // CREATE FOOD
        // =====================================================

        const newFood = await Food.create({
            hotelId,
            branchId,

            foodName: String(foodName).trim(),

            description: description
                ? String(description).trim()
                : "",

            foodPrice: safeFoodPrice,

            foodImage: imagePath,
        });

        log.info(
            `Food item created successfully: ${newFood._id} - ${newFood.foodName} - hotel ${hotelId} - branch ${branchId}`
        );

        return res.status(201).json({
            success: true,
            message: "Food item added successfully.",
            data: newFood,
        });
    } catch (error) {
        console.error("CREATE FOOD ERROR:", error);

        log.error(
            `Error creating food item: ${error.message}`
        );

        // =====================================================
        // MONGOOSE VALIDATION ERROR
        // =====================================================

        if (error.name === "ValidationError") {
            const messages = Object.values(
                error.errors
            ).map((err) => err.message);

            return res.status(400).json({
                success: false,
                message: `Validation failed: ${messages.join(", ")}`,
            });
        }

        // =====================================================
        // DUPLICATE KEY
        // =====================================================

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    "A food item with this name already exists in your branch.",
            });
        }

        // =====================================================
        // SERVER ERROR
        // =====================================================

        return res.status(500).json({
            success: false,
            message:
                "An internal server error occurred while creating the food item. Please try again later.",
        });
    }
};

// ============================================================
// 2. GET ALL FOOD ITEMS
// ============================================================

export const getAllFood = async (req, res) => {
    try {
        const { hotelId, branchId } = getTenantIds(req);

        if (!hotelId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a hotel.",
            });
        }

        if (!branchId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a branch.",
            });
        }

        // IMPORTANT:
        // Only this hotel's branch data is returned.
        const foods = await Food.find({
            hotelId,
            branchId,
        }).sort({
            createdAt: -1,
        });

        return res.status(200).json({
            success: true,
            count: foods.length,
            data: foods,
        });
    } catch (error) {
        console.error("GET ALL FOOD ERROR:", error);

        log.error(
            `Error fetching food list: ${error.message}`
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch food items. Please try again later.",
        });
    }
};

// ============================================================
// 3. GET SINGLE FOOD ITEM BY ID
// ============================================================

export const getFoodById = async (req, res) => {
    try {
        const { hotelId, branchId } = getTenantIds(req);
        const { id } = req.params;

        if (!hotelId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a hotel.",
            });
        }

        if (!branchId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a branch.",
            });
        }

        // =====================================================
        // VALIDATE FOOD ID
        // =====================================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid food ID format provided.",
            });
        }

        // =====================================================
        // FIND FOOD ONLY INSIDE CURRENT TENANT
        // =====================================================

        const food = await Food.findOne({
            _id: id,
            hotelId,
            branchId,
        });

        if (!food) {
            return res.status(404).json({
                success: false,
                message: "Food item not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: food,
        });
    } catch (error) {
        console.error("GET FOOD BY ID ERROR:", error);

        log.error(
            `Error fetching food by ID (${req.params.id}): ${error.message}`
        );

        return res.status(500).json({
            success: false,
            message:
                "An internal server error occurred while retrieving the food item.",
        });
    }
};

// ============================================================
// 4. UPDATE FOOD ITEM
// ============================================================

export const updateFood = async (req, res) => {
    try {
        const { hotelId, branchId } = getTenantIds(req);
        const { id } = req.params;

        if (!hotelId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a hotel.",
            });
        }

        if (!branchId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a branch.",
            });
        }

        // =====================================================
        // VALIDATE FOOD ID
        // =====================================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid food ID format provided.",
            });
        }

        // =====================================================
        // FIND FOOD ONLY INSIDE CURRENT TENANT
        // =====================================================

        const existingFood = await Food.findOne({
            _id: id,
            hotelId,
            branchId,
        });

        if (!existingFood) {
            return res.status(404).json({
                success: false,
                message:
                    "Food item not found in your branch.",
            });
        }

        // =====================================================
        // GET UPDATE FIELDS
        // =====================================================

        const {
            foodName,
            description,
            foodPrice,
            removeImage,
        } = req.body;

        const updateData = {};

        // =====================================================
        // FOOD NAME
        // =====================================================

        if (foodName !== undefined) {
            const trimmedName =
                String(foodName).trim();

            if (!trimmedName) {
                return res.status(400).json({
                    success: false,
                    message: "Food name cannot be empty.",
                });
            }

            // Check duplicate name in same branch.
            const duplicateFood =
                await Food.findOne({
                    _id: { $ne: id },
                    hotelId,
                    branchId,
                    foodName: trimmedName,
                });

            if (duplicateFood) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Another food item with this name already exists in your branch.",
                });
            }

            updateData.foodName = trimmedName;
        }

        // =====================================================
        // DESCRIPTION
        // =====================================================

        if (description !== undefined) {
            updateData.description =
                String(description || "").trim();
        }

        // =====================================================
        // FOOD PRICE
        // =====================================================

        if (foodPrice !== undefined) {
            const safeFoodPrice =
                Number(foodPrice);

            if (!Number.isFinite(safeFoodPrice)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Food price must be a valid number.",
                });
            }

            if (safeFoodPrice < 0) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Food price cannot be negative.",
                });
            }

            updateData.foodPrice =
                safeFoodPrice;
        }

        // =====================================================
        // IMAGE REPLACEMENT
        // =====================================================

        let oldImagePath = null;
        let newImagePath = null;

        if (req.file) {
            newImagePath =
                `uploads/foods/${req.file.filename}`;

            updateData.foodImage =
                newImagePath;

            oldImagePath =
                existingFood.foodImage || null;
        }

        // =====================================================
        // IMAGE REMOVAL
        // =====================================================

        else if (
            removeImage === "true" ||
            removeImage === true
        ) {
            oldImagePath =
                existingFood.foodImage || null;

            updateData.foodImage = "";
        }

        // =====================================================
        // UPDATE DATABASE
        // =====================================================

        const updatedFood =
            await Food.findOneAndUpdate(
                {
                    _id: id,
                    hotelId,
                    branchId,
                },
                {
                    $set: updateData,
                },
                {
                    new: true,
                    runValidators: true,
                }
            );

        if (!updatedFood) {
            // If database update somehow failed and a new image
            // was uploaded, remove the unused new image.
            if (newImagePath) {
                const newFullPath =
                    path.join(
                        process.cwd(),
                        newImagePath
                    );

                if (fs.existsSync(newFullPath)) {
                    fs.unlinkSync(newFullPath);
                }
            }

            return res.status(404).json({
                success: false,
                message:
                    "Food item was not found in your branch.",
            });
        }

        // =====================================================
        // DELETE OLD IMAGE AFTER SUCCESSFUL UPDATE
        // =====================================================

        if (oldImagePath) {
            const oldFullPath =
                path.join(
                    process.cwd(),
                    oldImagePath
                );

            if (fs.existsSync(oldFullPath)) {
                fs.unlinkSync(oldFullPath);
            }
        }

        log.info(
            `Food item updated successfully: ${id} - hotel ${hotelId} - branch ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Food item updated successfully.",
            data: updatedFood,
        });
    } catch (error) {
        console.error("UPDATE FOOD ERROR:", error);

        log.error(
            `Error updating food item (${req.params.id}): ${error.message}`
        );

        // =====================================================
        // VALIDATION ERROR
        // =====================================================

        if (error.name === "ValidationError") {
            const messages = Object.values(
                error.errors
            ).map((err) => err.message);

            return res.status(400).json({
                success: false,
                message: `Validation failed: ${messages.join(", ")}`,
            });
        }

        // =====================================================
        // CAST ERROR
        // =====================================================

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid food ID format provided.",
            });
        }

        // =====================================================
        // DUPLICATE KEY
        // =====================================================

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    "A food item with this name already exists in your branch.",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "An internal server error occurred while updating the food item.",
        });
    }
};

// ============================================================
// 5. DELETE FOOD ITEM
// ============================================================

export const deleteFood = async (req, res) => {
    try {
        const { hotelId, branchId } = getTenantIds(req);
        const { id } = req.params;

        if (!hotelId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a hotel.",
            });
        }

        if (!branchId) {
            return res.status(403).json({
                success: false,
                message: "Your account is not connected to a branch.",
            });
        }

        // =====================================================
        // VALIDATE FOOD ID
        // =====================================================

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid food ID format provided.",
            });
        }

        // =====================================================
        // FIND FOOD ONLY INSIDE CURRENT TENANT
        // =====================================================

        const food = await Food.findOne({
            _id: id,
            hotelId,
            branchId,
        });

        if (!food) {
            return res.status(404).json({
                success: false,
                message:
                    "Food item not found in your branch.",
            });
        }

        // =====================================================
        // DELETE DATABASE RECORD
        // =====================================================

        await Food.deleteOne({
            _id: id,
            hotelId,
            branchId,
        });

        // =====================================================
        // DELETE IMAGE
        // =====================================================

        if (food.foodImage) {
            const fullPath =
                path.join(
                    process.cwd(),
                    food.foodImage
                );

            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        log.info(
            `Food item deleted successfully: ${id} - hotel ${hotelId} - branch ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Food item deleted successfully.",
        });
    } catch (error) {
        console.error("DELETE FOOD ERROR:", error);

        log.error(
            `Error deleting food item (${req.params.id}): ${error.message}`
        );

        if (error.name === "CastError") {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid food ID format provided.",
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "An internal server error occurred while deleting the food item.",
        });
    }
};