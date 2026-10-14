import express from "express";

import {
    createService,
    getAllServices,
    getService,
    updateService,
    deleteService,
} from "../controllers/roomServiceListControleController.js";

import {
    authVerify,
    permissionVerify,
} from "../middleware/userVerify.js";
import { subscriptionVerify } from "../middleware/subscriptionVerify.js";

const router = express.Router();


// ==========================================
// CREATE SERVICE
// ==========================================
router.post(
    "/create-service",
    authVerify,
    permissionVerify("serviceManagement"),
    subscriptionVerify,
    createService
);


// ==========================================
// GET ALL SERVICES
// ==========================================
router.get(
    "/get-all-services",
    authVerify,
    permissionVerify("serviceManagement"),
    getAllServices
);


// ==========================================
// GET SINGLE SERVICE
// ==========================================
router.get(
    "/get-service/:id",
    authVerify,
    permissionVerify("serviceManagement"),
    getService
);


// ==========================================
// UPDATE SERVICE
// ==========================================
router.put(
    "/update-service/:id",
    authVerify,
    permissionVerify("serviceManagement"),
    subscriptionVerify,
    updateService
);


// ==========================================
// DELETE SERVICE
// ==========================================
router.delete(
    "/delete-service/:id",
    authVerify,
    permissionVerify("serviceManagement"),
    subscriptionVerify,
    deleteService
);

export default router;