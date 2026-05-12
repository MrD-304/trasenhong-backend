const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

exports.register = async (req, res, next) => {
  try {
    const { full_name, email, phone, password } = req.body;
    if (await User.findByEmail(email)) {
      return res.status(409).json({ success: false, message: "Email đã được sử dụng." });
    }
    const hashed = await bcrypt.hash(password, 12);
    const id     = await User.create({ full_name, email, phone, password: hashed });
    const user   = await User.findById(id);
    res.status(201).json({ success: true, message: "Đăng ký thành công.", token: signToken(user), user });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không đúng." });
    if (!user.is_active) return res.status(403).json({ success: false, message: "Tài khoản đã bị khoá." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không đúng." });

    const { password: _, ...safeUser } = user;
    res.json({ success: true, message: "Đăng nhập thành công.", token: signToken(user), user: safeUser });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

exports.updateMe = async (req, res, next) => {
  try {
    const { full_name, phone, address, ward, district, province } = req.body;
    await User.update(req.user.id, { full_name, phone, address, ward, district, province });
    const user = await User.findById(req.user.id);
    res.json({ success: true, message: "Cập nhật thành công.", user });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { old_password, new_password } = req.body;
    const user  = await User.findByEmail(req.user.email);
    const match = await bcrypt.compare(old_password, user.password);
    if (!match) return res.status(400).json({ success: false, message: "Mật khẩu cũ không đúng." });
    await User.update(req.user.id, { password: await bcrypt.hash(new_password, 12) });
    res.json({ success: true, message: "Đổi mật khẩu thành công." });
  } catch (err) { next(err); }
};
