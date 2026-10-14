import express from "express";
import {
    createCheckoutBill,
    getAllCheckoutBills,
    getCheckoutBillById,
    updateCheckoutBill,
    deleteCheckoutBill,
} from "../controllers/checkoutBillController.js";

import {
    authVerify,
    permissionVerify,
} from "../middleware/userVerify.js";
import { subscriptionVerify } from "../middleware/subscriptionVerify.js";

const router = express.Router();

router.post(
    "/create",
    authVerify,
    permissionVerify("reports"),
    subscriptionVerify,
    createCheckoutBill
);

router.get(
    "/all",
    authVerify,
    permissionVerify("reports"),
    getAllCheckoutBills
);

router.get(
    "/:id",
    authVerify,
    permissionVerify("reports"),
    getCheckoutBillById
);

router.put(
    "/update/:id",
    authVerify,
    permissionVerify("reports"),
    subscriptionVerify,
    updateCheckoutBill
);

router.delete(
    "/delete/:id",
    authVerify,
    permissionVerify("reports"),
    subscriptionVerify,
    deleteCheckoutBill
);

export default router;
