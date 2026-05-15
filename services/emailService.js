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

// Email đơn hàng đã chuyển sang frontend (checkout.js)
async function sendAdminNewOrder() {}

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

module.exports = { sendAdminNewOrder, sendContactEmail };
