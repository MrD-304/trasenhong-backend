const Order   = require("../models/Order");
const Product = require("../models/Product");
const User    = require("../models/User");
const db      = require("../config/db");

exports.getDashboard = async (req, res, next) => {
  try {
    const stats = await Order.stats();
    const [[products]]   = await db.query("SELECT COUNT(*) AS total FROM products WHERE is_active = 1");
    const [[users]]      = await db.query("SELECT COUNT(*) AS total FROM users WHERE role = 'customer'");
    const [lowStock]     = await db.query(
      "SELECT id, name, stock FROM products WHERE is_active = 1 AND stock <= 10 ORDER BY stock LIMIT 10"
    );
    const [recentOrders] = await db.query(
      "SELECT id, order_code, full_name, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 8"
    );
    res.json({
      success: true,
      dashboard: {
        ...stats,
        total_products:   products.total,
        total_customers:  users.total,
        low_stock_products: lowStock,
        recent_orders:    recentOrders,
      },
    });
  } catch (err) { next(err); }
};

exports.listOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const data = await Order.list({ page: Number(page), limit: Number(limit), status, search });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(Number(req.params.id));
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
    res.json({ success: true, order });
  } catch (err) { next(err); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["pending","confirmed","processing","shipping","delivered","cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }
    const order = await Order.findById(Number(req.params.id));
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
    await Order.updateStatus(order.id, status);
    res.json({ success: true, message: `Đã cập nhật trạng thái thành "${status}".` });
  } catch (err) { next(err); }
};

exports.listProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, search } = req.query;
    const data = await Product.list({ page: Number(page), limit: Number(limit), category, search });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const data = await User.list({ page: Number(page), limit: Number(limit), role });
    res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

exports.toggleUser = async (req, res, next) => {
  try {
    const user = await User.findById(Number(req.params.id));
    if (!user) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    await User.update(user.id, { is_active: user.is_active ? 0 : 1 });
    res.json({ success: true, message: user.is_active ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản." });
  } catch (err) { next(err); }
};

exports.listPromoCodes = async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM promo_codes ORDER BY created_at DESC");
    res.json({ success: true, promo_codes: rows });
  } catch (err) { next(err); }
};

exports.createPromoCode = async (req, res, next) => {
  try {
    const { code, discount_type, discount_value, min_order, max_uses, expires_at } = req.body;
    const [result] = await db.query(
      "INSERT INTO promo_codes (code, discount_type, discount_value, min_order, max_uses, expires_at) VALUES (?,?,?,?,?,?)",
      [code.toUpperCase(), discount_type, discount_value, min_order || 0, max_uses || null, expires_at || null]
    );
    res.status(201).json({ success: true, message: "Tạo mã giảm giá thành công.", id: result.insertId });
  } catch (err) { next(err); }
};

exports.togglePromoCode = async (req, res, next) => {
  try {
    const [[code]] = await db.query("SELECT * FROM promo_codes WHERE id = ? LIMIT 1", [req.params.id]);
    if (!code) return res.status(404).json({ success: false, message: "Không tìm thấy mã." });
    await db.query("UPDATE promo_codes SET is_active = ? WHERE id = ?", [code.is_active ? 0 : 1, code.id]);
    res.json({ success: true, message: code.is_active ? "Đã tắt mã." : "Đã bật mã." });
  } catch (err) { next(err); }
};
