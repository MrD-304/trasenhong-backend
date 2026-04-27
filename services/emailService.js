"use strict";

const axios = require("axios");

const EMAILJS_URL = "https://api.emailjs.com/api/v1.0/email/send";

function emailjsPost(templateId, templateParams) {
  return axios.post(EMAILJS_URL, {
    service_id:      process.env.EMAILJS_SERVICE_ID,
    template_id:     templateId,
    user_id:         process.env.EMAILJS_PUBLIC_KEY,
    accessToken:     process.env.EMAILJS_PRIVATE_KEY,
    template_params: templateParams,
  });
}

const fmt = (n) => Number(n).toLocaleString("vi-VN") + "₫";

async function sendOrderConfirmation(order) {
  if (!order.email) return;
  try {
    const itemsText = (order.items || [])
      .map((i) => `${i.name} x${i.quantity} – ${fmt(i.price * i.quantity)}`)
      .join("\n");

    await emailjsPost(process.env.EMAILJS_ORDER_TEMPLATE_ID, {
      to_email:     order.email,
      to_name:      order.full_name,
      order_code:   order.order_code,
      items_text:   itemsText,
      subtotal:     fmt(order.subtotal),
      shipping_fee: Number(order.shipping_fee) === 0 ? "Miễn phí" : fmt(order.shipping_fee),
      discount:     Number(order.discount) > 0 ? fmt(order.discount) : "0₫",
      total:        fmt(order.total),
      address:      [order.address, order.ward, order.district, order.province].filter(Boolean).join(", "),
      phone:        order.phone,
      payment:      { cod: "Thanh toán khi nhận hàng (COD)", transfer: "Chuyển khoản", momo: "Ví MoMo" }[order.payment_method] || order.payment_method,
      ghn_code:     order.ghn_order_code || "Đang cập nhật",
      note:         order.note || "",
    });

    console.log(`[email] Xác nhận đơn #${order.order_code} → ${order.email}`);
  } catch (err) {
    console.error("[email] Gửi xác nhận đơn thất bại:", err.message);
  }
}

async function sendContactEmail({ name, phone, email, subject, message }) {
  const subjectMap = {
    order:    "Đặt hàng / Mua sỉ",
    product:  "Tư vấn sản phẩm",
    shipping: "Vận chuyển & Giao hàng",
    partner:  "Hợp tác kinh doanh",
    other:    "Khác",
  };

  await emailjsPost(process.env.EMAILJS_CONTACT_TEMPLATE_ID, {
    from_name:     name,
    from_phone:    phone,
    from_email:    email,
    subject_label: subjectMap[subject] || subject || "Không chọn",
    message,
  });

  console.log(`[email] Form liên hệ từ ${name} <${email}>`);
}

module.exports = { sendOrderConfirmation, sendContactEmail };
