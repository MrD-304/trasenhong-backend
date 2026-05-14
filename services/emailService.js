"use strict";
const axios = require("axios");

const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "trasenhong9999@gmail.com";
const ADMIN_SITE_URL =
  process.env.ADMIN_SITE_URL ||
  "https://starlit-tartufo-1d180f.netlify.app/admin.html";

// ── Gọi EmailJS API ───────────────────────────────────────
function emailjsPost(templateId, templateParams) {
  return axios.post(EMAILJS_URL, {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: templateId,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
    accessToken: process.env.EMAILJS_PRIVATE_KEY,
    template_params: templateParams,
  });
}

// ── Helpers ───────────────────────────────────────────────
const fmt = (n) => Number(n).toLocaleString("vi-VN") + "₫";

function buildItemsText(items = []) {
  return items
    .map((i) => `${i.name} x${i.quantity} – ${fmt(i.price * i.quantity)}`)
    .join("\n");
}

function buildAddress(order) {
  return [order.address, order.ward, order.district, order.province]
    .filter(Boolean)
    .join(", ");
}

const paymentLabel = (m) =>
  ({
    cod: "Thanh toán khi nhận hàng (COD)",
    transfer: "Chuyển khoản",
    momo: "Ví MoMo",
  })[m] || m;

// ── EMAIL 1: Gửi ADMIN — thông báo đơn mới cần xác nhận ──
// Dùng EMAILJS_ORDER_TEMPLATE_ID (tái sử dụng template sẵn có)
async function sendAdminNewOrder(order) {
  try {
    const confirmUrl = `${ADMIN_SITE_URL}?page=orders&highlight=${order.id}`;
    await emailjsPost(process.env.EMAILJS_ORDER_TEMPLATE_ID, {
      order_code: order.order_code,
      customer_name: order.full_name,
      customer_phone: order.phone,
      customer_email: order.email || "Không có",
      items_text: buildItemsText(order.items),
      subtotal: fmt(order.subtotal),
      shipping_fee:
        Number(order.shipping_fee) === 0 ? "Miễn phí" : fmt(order.shipping_fee),
      discount: Number(order.discount) > 0 ? fmt(order.discount) : "0₫",
      total: fmt(order.total),
      address: buildAddress(order),
      payment: paymentLabel(order.payment_method),
      note: order.note || "Không có",
      confirm_url: confirmUrl,
      created_at: new Date().toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      }),
    });
    console.log(`[email] ✅ Thông báo admin đơn mới #${order.order_code}`);
  } catch (err) {
    console.error("[email] ❌ sendAdminNewOrder:", err.message);
  }
}

// ── EMAIL 2: Form liên hệ (giữ nguyên) ───────────────────
async function sendContactEmail({ name, phone, email, subject, message }) {
  const subjectMap = {
    order: "Đặt hàng / Mua sỉ",
    product: "Tư vấn sản phẩm",
    shipping: "Vận chuyển & Giao hàng",
    partner: "Hợp tác kinh doanh",
    other: "Khác",
  };
  await emailjsPost(process.env.EMAILJS_CONTACT_TEMPLATE_ID, {
    from_name: name,
    from_phone: phone,
    from_email: email,
    subject_label: subjectMap[subject] || subject || "Không chọn",
    message,
  });
  console.log(`[email] Form liên hệ từ ${name} <${email}>`);
}

module.exports = { sendAdminNewOrder, sendContactEmail };
