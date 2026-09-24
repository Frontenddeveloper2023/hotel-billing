import express from "express";

import {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
} from "../controllers/userContoller.js";

import {
  authVerify,
  hotelBranchVerify,
  permissionVerify,
} from "../middleware/userVerify.js";

const router = express.Router();

router.get(
  "/list-users",
  authVerify,
  hotelBranchVerify,
  permissionVerify("users"),
  getAllUsers
);

router.post(
  "/add-user",
  authVerify,
  hotelBranchVerify,
  permissionVerify("users"),
  createUser
);

router.put(
  "/update-user/:id",
  authVerify,
  hotelBranchVerify,
  permissionVerify("users"),
  updateUser
);

router.delete(
  "/delete-user/:id",
  authVerify,
  hotelBranchVerify,
  permissionVerify("users"),
  deleteUser
);

export default router;