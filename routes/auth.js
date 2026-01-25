const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const {
  register,
  login,
  getMe,
  updateUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

router.post("/login", login);

router.post(
  "/register",
  upload.fields([{ name: "profileImage", maxCount: 1 }]),
  register
);

router.get("/me", verifyToken, getMe);

router.put(
  "/me",
  verifyToken,
  upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "bannerImage", maxCount: 1 },
  ]),
  updateUser
);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
