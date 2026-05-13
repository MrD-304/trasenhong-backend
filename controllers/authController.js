const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const User   = require("../models/User");

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

// ── ĐĂNG KÝ ──────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { full_name, email, phone, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin." });
    }

    if (await User.findByEmail(email)) {
      return res.status(409).json({ success: false, message: "Email đã được sử dụng." });
    }

    const hashed = await bcrypt.hash(password, 12);
    const id     = await User.create({ full_name, email, phone, password: hashed });
    const user   = await User.findById(id);

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công.",
      token: signToken(user),
      user,
    });
  } catch (err) { next(err); }
};

// ── ĐĂNG NHẬP (email HOẶC số điện thoại) ─────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body; // field "email" dùng chung cho cả email lẫn SĐT

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập thông tin đăng nhập." });
    }

    // Tìm theo email trước, nếu không có thì tìm theo SĐT
    let user = await User.findByEmail(email);
    if (!user) user = await User.findByPhone(email);

    if (!user) {
      return res.status(401).json({ success: false, message: "Thông tin đăng nhập không đúng." });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: "Thông tin đăng nhập không đúng." });
    }

    const { password: _, ...safeUser } = user;
    res.json({
      success: true,
      message: "Đăng nhập thành công.",
      token: signToken(user),
      user: safeUser,
    });
  } catch (err) { next(err); }
};

// ── LẤY THÔNG TIN BẢN THÂN ───────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
    res.json({ success: true, user });
  } catch (err) { next(err); }
};

// ── CẬP NHẬT THÔNG TIN ───────────────────────────────────
exports.updateMe = async (req, res, next) => {
  try {
    const { full_name, phone, address, ward, district, province } = req.body;

    const current = await User.findById(req.user.id);
    if (!current) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });

    // Giữ nguyên giá trị cũ nếu không gửi lên
    const updateData = {
      full_name: full_name !== undefined ? full_name : current.full_name,
      phone:     phone     !== undefined ? phone     : current.phone,
      address:   address   !== undefined ? address   : current.address,
      ward:      ward      !== undefined ? ward      : current.ward,
      district:  district  !== undefined ? district  : current.district,
      province:  province  !== undefined ? province  : current.province,
    };

    await User.update(req.user.id, updateData);
    const user = await User.findById(req.user.id);
    res.json({ success: true, message: "Cập nhật thành công.", user });
  } catch (err) { next(err); }
};

// ── ĐỔI MẬT KHẨU ─────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const currentPw = req.body.current_password || req.body.old_password;
    const newPw     = req.body.new_password;

    if (!currentPw || !newPw) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ mật khẩu." });
    }
    if (newPw.length < 8) {
      return res.status(400).json({ success: false, message: "Mật khẩu mới phải có ít nhất 8 ký tự." });
    }

    // Dùng findByEmail để lấy cả password hash
    const fullUser = await User.findByEmail(req.user.email);
    const match = await bcrypt.compare(currentPw, fullUser.password);
    if (!match) {
      return res.status(400).json({ success: false, message: "Mật khẩu hiện tại không đúng." });
    }

    await User.update(req.user.id, { password: await bcrypt.hash(newPw, 12) });
    res.json({ success: true, message: "Đổi mật khẩu thành công." });
  } catch (err) { next(err); }
};
