const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

const {
  register,
  login,
  getMe,
  updateUser,
  forgotPassword,
  resetPassword,
} = require('../controllers/authController');

// 🔐 Login/Register
router.post('/login', login);

// ✅ Register: şəkil olsa da olmasa da işləsin
router.post(
  '/register',
  upload.fields([{ name: 'profileImage', maxCount: 1 }]),
  register
);

// 👤 Profil məlumatları
router.get('/me', verifyToken, getMe);
router.put(
  '/me',
  verifyToken,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 }
  ]),
  updateUser
);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
