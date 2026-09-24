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

const router = express.Router();

router.post(
    "/create",
    authVerify,
    permissionVerify("reports"),
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
    updateCheckoutBill
);

router.delete(
    "/delete/:id",
    authVerify,
    permissionVerify("reports"),
    deleteCheckoutBill
);

export default router;
