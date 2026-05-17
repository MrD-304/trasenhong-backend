const Order   = require("../models/Order");
const Product = require("../models/Product");
const db      = require("../config/db");
const { sendAdminNewOrder } = require("../services/emailService");

// ── TẠO ĐƠN HÀNG ─────────────────────────────────────────
exports.create = async (req, res, next) => {
  try {
    const {
      full_name, phone, email,
      address, ward, district, province,
      ward_code, district_id, note,
      payment_method = "cod",
      items, promo_code,
    } = req.body;

    if (!full_name || !phone || !address) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin giao hàng." });
    }
    if (!items?.length) {
      return res.status(400).json({ success: false, message: "Giỏ hàng trống." });
    }

    // Kiểm tra tồn kho & tính subtotal
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(400).json({ success: false, message: `Sản phẩm ID ${item.product_id} không tồn tại.` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Sản phẩm "${product.name}" không đủ tồn kho (còn ${product.stock}).` });
      }
      subtotal += product.price * item.quantity;
      orderItems.push({
        product_id: product.id,
        name:       product.name,
        price:      product.price,
        quantity:   item.quantity,
        weight:     product.weight || 300,
      });
    }

    // Xử lý mã giảm giá
    let discount = 0;
    if (promo_code) {
      const [[code]] = await db.query(
        `SELECT * FROM promo_codes
         WHERE code = ? AND is_active = 1
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)
         LIMIT 1`,
        [promo_code.toUpperCase()]
      );
      if (code && subtotal >= code.min_order) {
        discount = code.discount_type === "percent"
          ? Math.round((subtotal * code.discount_value) / 100)
          : code.discount_value;
        await db.query(
          "UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?",
          [code.id]
        );
      }
    }

    const shipping_fee = subtotal - discount >= 200000 ? 0 : 30000;
    const total = subtotal - discount + shipping_fee;

    // Gắn user_id nếu đang đăng nhập
    const user_id = req.user?.id || null;

    const { orderId, orderCode } = await Order.create(
      {
        user_id,
        full_name, phone, email,
        address, ward, district, province,
        ward_code, district_id, note,
        payment_method, subtotal, shipping_fee, discount, total, promo_code,
      },
      orderItems
    );

    const order = await Order.findById(orderId);

    sendAdminNewOrder(order).catch(e =>
      console.error("[email] sendAdminNewOrder:", e.message)
    );

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công! Đơn hàng đang chờ xác nhận từ cửa hàng.",
      order_code: orderCode,
      order,
    });
  } catch (err) { next(err); }
};

// ── THEO DÕI ĐƠN HÀNG ────────────────────────────────────
exports.track = async (req, res, next) => {
  try {
    const order = await Order.findByCode(req.params.code.toUpperCase());
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
    }

    let ghnStatus = null;
    if (order.ghn_order_code) {
      try {
        const ghnService = require("../services/ghnService");
        ghnStatus = await ghnService.trackOrder(order.ghn_order_code);
      } catch (e) {
        console.warn("[GHN] trackOrder:", e.message);
      }
    }

    res.json({ success: true, order, ghn_status: ghnStatus });
  } catch (err) { next(err); }
};

// ── ĐƠN HÀNG CỦA TÔI ─────────────────────────────────────
// Tìm theo user_id HOẶC phone/email để cover cả đơn đặt lúc chưa đăng nhập
exports.getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const user = req.user;

    // Build WHERE: user_id khớp HOẶC phone khớp HOẶC email khớp
    let where = "WHERE (user_id = ?";
    const params = [user.id];

    if (user.phone) {
      where += " OR phone = ?";
      params.push(user.phone);
    }
    if (user.email) {
      where += " OR email = ?";
      params.push(user.email);
    }
    where += ")";

    if (status) {
      where += " AND status = ?";
      params.push(status);
    }

    const [rows] = await db.query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM orders ${where}`,
      params
    );

    res.json({ success: true, orders: rows, total });
  } catch (err) { next(err); }
};

// ── HUỶ ĐƠN (chỉ khi còn pending) ───────────────────────
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findByCode(req.params.code.toUpperCase());
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
    }
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Không có quyền huỷ đơn này." });
    }
    if (!["pending"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: order.status === "confirmed"
          ? "Đơn hàng đã được xác nhận, vui lòng liên hệ cửa hàng để huỷ."
          : "Đơn hàng không thể huỷ ở trạng thái hiện tại.",
      });
    }

    await Order.updateStatus(order.id, "cancelled");
    res.json({ success: true, message: "Đã huỷ đơn hàng." });
  } catch (err) { next(err); }
};
