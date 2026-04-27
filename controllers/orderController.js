const Order      = require("../models/Order");
const Product    = require("../models/Product");
const ghnService = require("../services/ghnService");
const db         = require("../config/db");
const { sendOrderConfirmation } = require("../services/emailService");

exports.create = async (req, res, next) => {
  try {
    const {
      full_name, phone, email,
      address, ward, district, province,
      ward_code, district_id, note,
      payment_method = "cod",
      items, promo_code,
    } = req.body;

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
        return res.status(400).json({ success: false, message: `Sản phẩm "${product.name}" không đủ tồn kho.` });
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
        discount =
          code.discount_type === "percent"
            ? Math.round((subtotal * code.discount_value) / 100)
            : code.discount_value;
        await db.query("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?", [code.id]);
      }
    }

    // Tính phí ship: gọi GHN thực nếu có địa chỉ, fallback 30k / miễn phí >= 200k
    let shipping_fee = subtotal - discount >= 200000 ? 0 : 30000;
    if (ward_code && district_id && shipping_fee > 0) {
      try {
        const totalWeight = orderItems.reduce((s, i) => s + i.weight * i.quantity, 0);
        const vol    = totalWeight / 0.3;
        const r      = Math.cbrt(vol);
        const length = Math.max(Math.ceil(r * 1.6), 10);
        const width  = Math.max(Math.ceil(r), 10);
        const height = Math.max(Math.ceil(r * 0.625), 5);
        const convertWeight = Math.round(((length * width * height) / 5000) * 1000);
        const weight = Math.max(totalWeight, convertWeight);

        const feeData = await ghnService.calcFee({ to_district_id: district_id, to_ward_code: ward_code, weight, length, width, height });
        shipping_fee = feeData.total || shipping_fee;
      } catch (feeErr) {
        console.warn("[GHN] Tính phí ship thất bại, dùng mặc định:", feeErr.message);
      }
    }

    const total = subtotal - discount + shipping_fee;

    const { orderId, orderCode } = await Order.create(
      {
        user_id: req.user?.id || null,
        full_name, phone, email,
        address, ward, district, province,
        ward_code, district_id, note,
        payment_method, subtotal, shipping_fee, discount, total, promo_code,
      },
      orderItems
    );

    // Tạo vận đơn GHN tự động nếu có địa chỉ đầy đủ
    let ghnData = null;
    if (ward_code && district_id) {
      try {
        ghnData = await ghnService.createOrder({
          orderId, orderCode, full_name, phone, address,
          ward_code, district_id,
          items: orderItems,
          total, shipping_fee, note, payment_method,
        });
        await Order.updateGHN(orderId, {
          ghn_order_code:        ghnData.order_code,
          ghn_expected_delivery: ghnData.expected_delivery_time,
        });
      } catch (ghnErr) {
        console.error("[GHN] Tạo vận đơn thất bại:", ghnErr.message);
      }
    }

    const order = await Order.findById(orderId);
    await sendOrderConfirmation(order);

    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công.",
      order_code: orderCode,
      order,
      ghn: ghnData,
    });
  } catch (err) { next(err); }
};

exports.track = async (req, res, next) => {
  try {
    const order = await Order.findByCode(req.params.code.toUpperCase());
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });

    let ghnStatus = null;
    if (order.ghn_order_code) {
      try { ghnStatus = await ghnService.trackOrder(order.ghn_order_code); } catch { /* bỏ qua */ }
    }

    res.json({ success: true, order, ghn_status: ghnStatus });
  } catch (err) { next(err); }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const params = status
      ? [req.user.id, status, Number(limit), offset]
      : [req.user.id, Number(limit), offset];

    const [rows] = await db.query(
      `SELECT * FROM orders WHERE user_id = ? ${status ? "AND status = ?" : ""}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    );
    res.json({ success: true, orders: rows });
  } catch (err) { next(err); }
};

exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findByCode(req.params.code.toUpperCase());
    if (!order) return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng." });
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Không có quyền huỷ đơn này." });
    }
    if (!["pending","confirmed"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Đơn hàng không thể huỷ ở trạng thái hiện tại." });
    }
    await Order.updateStatus(order.id, "cancelled");
    res.json({ success: true, message: "Đã huỷ đơn hàng." });
  } catch (err) { next(err); }
};
