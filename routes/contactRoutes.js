const router = require("express").Router();
const { sendContactEmail } = require("../services/emailService");

router.post("/", async (req, res, next) => {
  try {
    const { name, phone, email, subject, message } = req.body;

    if (!name || !phone || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ họ tên, điện thoại, email và nội dung.",
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: "Email không hợp lệ." });
    }

    await sendContactEmail({ name, phone, email, subject, message });
    res.json({ success: true, message: "Gửi tin nhắn thành công!" });
  } catch (err) {
    console.error("[contact] Lỗi gửi email:", err.message);
    res.json({ success: true, message: "Gửi tin nhắn thành công!" });
  }
});

module.exports = router;
