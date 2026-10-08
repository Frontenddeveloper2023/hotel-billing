import express from "express";
import {
    getSettings,
    updateSettings,
} from "../controllers/settingsController.js";
import { uploadLogo } from "../middleware/uploadMiddleware.js";

import {
    authVerify,
    permissionVerify,
} from "../middleware/userVerify.js";

const router = express.Router();

router.get(
    "/get-settings",
    authVerify,
    getSettings
);

router.put(
    "/update-settings",
    authVerify,
    permissionVerify("settings"),
    uploadLogo,
    updateSettings
);

export default router;
