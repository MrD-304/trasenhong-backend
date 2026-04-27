const router = require("express").Router();
const db     = require("../config/db");

router.post("/validate", async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "Thiếu mã giảm giá." });

    const [[promo]] = await db.query(
      `SELECT * FROM promo_codes
       WHERE code = ? AND is_active = 1
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR used_count < max_uses)
       LIMIT 1`,
      [code.toUpperCase()]
    );

    if (!promo) {
      return res.json({ success: false, message: "Mã không hợp lệ hoặc đã hết hạn." });
    }
    if (subtotal && subtotal < promo.min_order) {
      return res.json({
        success: false,
        message: `Đơn tối thiểu ${promo.min_order.toLocaleString("vi-VN")}₫.`,
      });
    }

    res.json({ success: true, discount: promo.discount_value, type: promo.discount_type });
  } catch (err) { next(err); }
});

module.exports = router;
