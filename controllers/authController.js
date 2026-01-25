const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const cloudinary = require("../utils/cloudinary");


// ✅ REGISTER (captcha YOX + şəkil optional)
const register = async (req, res) => {
  try {
    const { name, email, password, gender, birthday, city } = req.body;

    // 1) Field check (captcha yoxdur)
    if (!name || !email || !password || !gender || !birthday || !city) {
      return res.status(400).json({
        error: 'Bütün sahələr doldurulmalıdır.',
      });
    }

    // 2) Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Bu email ilə artıq istifadəçi mövcuddur' });
    }

    // 3) Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4) Optional profile image (multer fields istifadə edirik)
    let profileImage = "";

    if (req.files?.profileImage?.[0]) {
      const file = req.files.profileImage[0];

      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "hth/profile" },
          (err, res) => (err ? reject(err) : resolve(res))
        ).end(file.buffer);
      });

      profileImage = result.secure_url;
    } else {
      profileImage = "";
    }

    // 5) Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      gender,
      birthday: new Date(birthday),
      city,
      profileImage,
    });

    await user.save();

    // 6) Token
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('❌ Register error:', err);
    return res.status(500).json({ error: 'Server xətası baş verdi' });
  }
};

// 🔑 Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'İstifadəçi tapılmadı' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Parol yanlışdır' });

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server xətası' });
  }
};

// 🙋‍♀️ Profil məlumatı
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
    return res.json(user);
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ error: 'Xəta baş verdi' });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, city, gender, birthday } = req.body;

    const updatedData = { name, city, gender, birthday };

    if (req.files?.profileImage?.[0]) {
      const file = req.files.profileImage[0];
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "hth/profile" },
          (err, res) => (err ? reject(err) : resolve(res))
        ).end(file.buffer);
      });
      updatedData.profileImage = result.secure_url;
    }

    if (req.files?.bannerImage?.[0]) {
      const file = req.files.bannerImage[0];
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "hth/banner" },
          (err, res) => (err ? reject(err) : resolve(res))
        ).end(file.buffer);
      });
      updatedData.bannerImage = result.secure_url;
    }


    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, { new: true });
    return res.status(200).json(updatedUser);
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ message: 'Profil yenilənmədi' });
  }
};

// 📩 Forgot Password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = code;
    user.resetCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // ⛔ MAIL YOX
    return res.json({
      message: 'Kod yaradıldı (mail hələlik deaktivdir)',
      // test üçün istəsən:
      // code,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server xətası' });
  }
};

// 🔁 Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const user = await User.findOne({ email, resetCode: code });
    if (!user || user.resetCodeExpires < Date.now()) {
      return res.status(400).json({ error: 'Kod etibarsızdır və ya vaxtı keçib' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetCode = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    return res.json({ message: 'Şifrə yeniləndi' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Şifrə dəyişdirilə bilmədi' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateUser,
  forgotPassword,
  resetPassword,
};
