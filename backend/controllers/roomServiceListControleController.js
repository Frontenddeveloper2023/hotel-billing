import mongoose from "mongoose";
import ServiceListControle from "../models/roomServiceListCreate.js";
import { log } from "../util/logger.js";

// ============================================================
// GET TENANT IDS
// ============================================================

const getTenantIds = (req, res) => {
    const hotelId = req.user?.hotelId;
    const branchId = req.user?.branchId;

    if (!hotelId) {
        res.status(403).json({
            success: false,
            message:
                "Your account is not connected to a hotel. Please contact the administrator.",
        });

        return null;
    }

    if (!branchId) {
        res.status(403).json({
            success: false,
            message:
                "Your account is not connected to a branch. Please contact the administrator.",
        });

        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(hotelId)) {
        res.status(400).json({
            success: false,
            message:
                "Your hotel information is invalid. Please contact the administrator.",
        });

        return null;
    }

    if (!mongoose.Types.ObjectId.isValid(branchId)) {
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

// ============================================================
// ADD SERVICE
// ============================================================

const createService = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        const {
            serviceName,
            serviceFees,
            isEnabled,
        } = req.body;

        // ----------------------------------------------------
        // SERVICE NAME VALIDATION
        // ----------------------------------------------------

        if (
            !serviceName ||
            typeof serviceName !== "string" ||
            !serviceName.trim()
        ) {
            log(
                "ERROR",
                "Create Service failed: Service name is required"
            );

            return res.status(400).json({
                success: false,
                message: "Service name is required.",
            });
        }

        const normalizedServiceName = serviceName.trim();

        // ----------------------------------------------------
        // SERVICE FEES VALIDATION
        // ----------------------------------------------------

        if (
            serviceFees === undefined ||
            serviceFees === null ||
            serviceFees === ""
        ) {
            log(
                "ERROR",
                "Create Service failed: Service fee is required"
            );

            return res.status(400).json({
                success: false,
                message: "Service fee is required.",
            });
        }

        const fee = Number(serviceFees);

        if (!Number.isFinite(fee) || fee < 0) {
            log(
                "ERROR",
                `Create Service failed: Invalid service fee - ${serviceFees}`
            );

            return res.status(400).json({
                success: false,
                message:
                    "Service fee must be a valid number greater than or equal to 0.",
            });
        }

        // ----------------------------------------------------
        // IS ENABLED VALIDATION
        // ----------------------------------------------------

        let serviceStatus = true;

        if (isEnabled !== undefined) {
            if (typeof isEnabled !== "boolean") {
                log(
                    "ERROR",
                    `Create Service failed: Invalid isEnabled type - ${typeof isEnabled}`
                );

                return res.status(400).json({
                    success: false,
                    message: "isEnabled must be a boolean value.",
                });
            }

            serviceStatus = isEnabled;
        }

        // ----------------------------------------------------
        // CHECK DUPLICATE SERVICE
        // ----------------------------------------------------
        //
        // Duplicate is checked only inside the same
        // hotel + branch.
        //
        // ----------------------------------------------------

        const existingService =
            await ServiceListControle.findOne({
                hotelId,
                branchId,
                serviceName: normalizedServiceName,
            });

        if (existingService) {
            log(
                "ERROR",
                `Create Service failed: Service name already exists in this branch - ${normalizedServiceName}`
            );

            return res.status(409).json({
                success: false,
                message:
                    "A service with this name already exists in your branch.",
            });
        }

        // ----------------------------------------------------
        // CREATE SERVICE
        // ----------------------------------------------------

        const service =
            await ServiceListControle.create({
                hotelId,
                branchId,
                serviceName: normalizedServiceName,
                serviceFees: fee,
                isEnabled: serviceStatus,
            });

        log(
            "INFO",
            `Service added successfully: ${service.serviceName} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(201).json({
            success: true,
            message: "Service added successfully.",
            service,
        });
    } catch (error) {
        log(
            "ERROR",
            `Create Service error: ${error.message}`
        );

        console.error("Create Service error:", error);

        return res.status(500).json({
            success: false,
            message:
                "Unable to add the service right now. Please try again later.",
        });
    }
};

// ============================================================
// GET ALL SERVICES
// ============================================================

const getAllServices = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        // ----------------------------------------------------
        // ONLY CURRENT HOTEL + BRANCH
        // ----------------------------------------------------

        const services =
            await ServiceListControle.find({
                hotelId,
                branchId,
            }).sort({
                serviceName: 1,
            });

        log(
            "INFO",
            `Services fetched successfully: ${services.length} services | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message: "Services fetched successfully.",
            services,
        });
    } catch (error) {
        log(
            "ERROR",
            `Get all services error: ${error.message}`
        );

        console.error(
            "Get all services error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load services right now. Please try again later.",
        });
    }
};

// ============================================================
// GET SINGLE SERVICE
// ============================================================

const getService = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;
        const { id } = req.params;

        // ----------------------------------------------------
        // OBJECT ID VALIDATION
        // ----------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {
            log(
                "ERROR",
                `Get Service failed: Invalid service ID - ${id}`
            );

            return res.status(400).json({
                success: false,
                message: "Invalid service ID.",
            });
        }

        // ----------------------------------------------------
        // FIND SERVICE INSIDE CURRENT TENANT
        // ----------------------------------------------------

        const service =
            await ServiceListControle.findOne({
                _id: id,
                hotelId,
                branchId,
            });

        if (!service) {
            log(
                "ERROR",
                `Get Service failed: Service not found in current branch - ${id}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "The service was not found in your branch.",
            });
        }

        log(
            "INFO",
            `Service fetched successfully: ${service.serviceName} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message: "Service fetched successfully.",
            service,
        });
    } catch (error) {
        log(
            "ERROR",
            `Get Service error: ${error.message}`
        );

        console.error(
            "Get Service error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load the service right now. Please try again later.",
        });
    }
};

// ============================================================
// UPDATE SERVICE
// ============================================================

const updateService = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        const { id } = req.params;

        const {
            serviceName,
            serviceFees,
            isEnabled,
        } = req.body;

        // ----------------------------------------------------
        // OBJECT ID VALIDATION
        // ----------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {
            log(
                "ERROR",
                `Update Service failed: Invalid service ID - ${id}`
            );

            return res.status(400).json({
                success: false,
                message: "Invalid service ID.",
            });
        }

        // ----------------------------------------------------
        // FIND SERVICE INSIDE CURRENT TENANT
        // ----------------------------------------------------

        const existingService =
            await ServiceListControle.findOne({
                _id: id,
                hotelId,
                branchId,
            });

        if (!existingService) {
            log(
                "ERROR",
                `Update Service failed: Service not found in current branch - ${id}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "The service was not found in your branch.",
            });
        }

        // ----------------------------------------------------
        // SERVICE NAME VALIDATION
        // ----------------------------------------------------

        if (serviceName !== undefined) {
            if (
                typeof serviceName !== "string" ||
                !serviceName.trim()
            ) {
                log(
                    "ERROR",
                    `Update Service failed: Invalid service name - ${id}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Service name cannot be empty.",
                });
            }

            const normalizedServiceName =
                serviceName.trim();

            // ------------------------------------------------
            // DUPLICATE CHECK ONLY SAME HOTEL + BRANCH
            // ------------------------------------------------

            const duplicateService =
                await ServiceListControle.findOne({
                    hotelId,
                    branchId,
                    serviceName: normalizedServiceName,
                    _id: { $ne: id },
                });

            if (duplicateService) {
                log(
                    "ERROR",
                    `Update Service failed: Service name already exists in this branch - ${normalizedServiceName}`
                );

                return res.status(409).json({
                    success: false,
                    message:
                        "A service with this name already exists in your branch.",
                });
            }

            existingService.serviceName =
                normalizedServiceName;
        }

        // ----------------------------------------------------
        // SERVICE FEES VALIDATION
        // ----------------------------------------------------

        if (serviceFees !== undefined) {
            if (
                serviceFees === "" ||
                serviceFees === null
            ) {
                log(
                    "ERROR",
                    `Update Service failed: Service fee is empty - ${id}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Service fee is required.",
                });
            }

            const fee = Number(serviceFees);

            if (!Number.isFinite(fee) || fee < 0) {
                log(
                    "ERROR",
                    `Update Service failed: Invalid fee - ${serviceFees}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "Service fee must be a valid number greater than or equal to 0.",
                });
            }

            existingService.serviceFees = fee;
        }

        // ----------------------------------------------------
        // IS ENABLED VALIDATION
        // ----------------------------------------------------

        if (isEnabled !== undefined) {
            if (typeof isEnabled !== "boolean") {
                log(
                    "ERROR",
                    `Update Service failed: Invalid isEnabled type - ${typeof isEnabled}`
                );

                return res.status(400).json({
                    success: false,
                    message:
                        "isEnabled must be a boolean value.",
                });
            }

            existingService.isEnabled = isEnabled;
        }

        // ----------------------------------------------------
        // SAVE UPDATED SERVICE
        // ----------------------------------------------------

        const updatedService =
            await existingService.save();

        log(
            "INFO",
            `Service updated successfully: ${updatedService.serviceName} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Service updated successfully.",
            service: updatedService,
        });
    } catch (error) {
        log(
            "ERROR",
            `Update Service error: ${error.message}`
        );

        console.error(
            "Update Service error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to update the service right now. Please try again later.",
        });
    }
};

// ============================================================
// DELETE SERVICE
// ============================================================

const deleteService = async (req, res) => {
    try {
        const tenant = getTenantIds(req, res);

        if (!tenant) return;

        const { hotelId, branchId } = tenant;

        const { id } = req.params;

        // ----------------------------------------------------
        // OBJECT ID VALIDATION
        // ----------------------------------------------------

        if (!mongoose.Types.ObjectId.isValid(id)) {
            log(
                "ERROR",
                `Delete Service failed: Invalid service ID - ${id}`
            );

            return res.status(400).json({
                success: false,
                message: "Invalid service ID.",
            });
        }

        // ----------------------------------------------------
        // FIND SERVICE INSIDE CURRENT TENANT
        // ----------------------------------------------------

        const service =
            await ServiceListControle.findOne({
                _id: id,
                hotelId,
                branchId,
            });

        if (!service) {
            log(
                "ERROR",
                `Delete Service failed: Service not found in current branch - ${id}`
            );

            return res.status(404).json({
                success: false,
                message:
                    "The service was not found in your branch.",
            });
        }

        // ----------------------------------------------------
        // DELETE ONLY CURRENT TENANT SERVICE
        // ----------------------------------------------------

        await ServiceListControle.findOneAndDelete({
            _id: id,
            hotelId,
            branchId,
        });

        log(
            "INFO",
            `Service deleted successfully: ${service.serviceName} | Hotel: ${hotelId} | Branch: ${branchId}`
        );

        return res.status(200).json({
            success: true,
            message:
                "Service deleted successfully.",
        });
    } catch (error) {
        log(
            "ERROR",
            `Delete Service error: ${error.message}`
        );

        console.error(
            "Delete Service error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to delete the service right now. Please try again later.",
        });
    }
};

// ============================================================
// EXPORT
// ============================================================

export {
    createService,
    getAllServices,
    getService,
    updateService,
    deleteService,
};