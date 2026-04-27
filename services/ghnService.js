"use strict";

const ghnClient = require("../config/ghn");
const axios     = require("axios");

const FROM_DISTRICT_ID = Number(process.env.GHN_FROM_DISTRICT_ID) || 1929;
const PREFERRED_TYPE   = 2;

function calcBoxDimensions(items) {
  const totalWeight = items.reduce((s, i) => s + (i.weight || 300) * i.quantity, 0);
  const vol    = totalWeight / 0.3;
  const r      = Math.cbrt(vol);
  const length = Math.max(Math.ceil(r * 1.6), 10);
  const width  = Math.max(Math.ceil(r), 10);
  const height = Math.max(Math.ceil(r * 0.625), 5);
  const convertWeight = Math.round(((length * width * height) / 5000) * 1000);
  return { weight: Math.max(totalWeight, convertWeight), length, width, height };
}

async function getAvailableServiceId(to_district_id) {
  const res = await axios.get(
    "https://online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/available-services",
    {
      params: {
        shop_id:       Number(process.env.GHN_SHOP_ID),
        from_district: FROM_DISTRICT_ID,
        to_district:   Number(to_district_id),
      },
      headers: { Token: process.env.GHN_TOKEN },
    }
  );
  const services = res.data?.data || [];
  if (!services.length) throw new Error("Không có dịch vụ nào cho tuyến này");
  const preferred = services.find((s) => s.service_type_id === PREFERRED_TYPE);
  return (preferred || services[0]).service_id;
}

const ghnService = {
  async calcFee({ to_district_id, to_ward_code, weight = 300, length = 20, width = 15, height = 10 }) {
    const service_id = await getAvailableServiceId(to_district_id);
    const { data } = await ghnClient.post("/v2/shipping-order/fee", {
      service_id:      Number(service_id),
      from_district_id: FROM_DISTRICT_ID,
      to_district_id:  Number(to_district_id),
      to_ward_code:    String(to_ward_code),
      weight:  Number(weight),
      length:  Number(length),
      width:   Number(width),
      height:  Number(height),
    });
    return {
      total:     data.data.total,
      service:   data.data.service_fee,
      insurance: data.data.insurance_fee,
    };
  },

  async createOrder({ orderId, orderCode, full_name, phone, address, ward_code, district_id, items, total, shipping_fee, note, payment_method }) {
    const service_id = await getAvailableServiceId(district_id);
    const isCOD      = payment_method === "cod";
    const payload    = {
      service_id:      Number(service_id),
      from_district_id: FROM_DISTRICT_ID,
      payment_type_id: isCOD ? 2 : 1,
      note:            note || "",
      required_note:   "CHOXEMHANGKHONGTHU",
      to_name:         full_name,
      to_phone:        phone,
      to_address:      address,
      to_ward_code:    String(ward_code),
      to_district_id:  Number(district_id),
      cod_amount:      isCOD ? total : 0,
      content:         `Đơn hàng ${orderCode} – Trà Sen Hồng`,
      ...calcBoxDimensions(items),
      items: items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
    };
    const { data } = await ghnClient.post("/v2/shipping-order/create", payload);
    return {
      order_code:             data.data.order_code,
      expected_delivery_time: data.data.expected_delivery_time,
      total_fee:              data.data.total_fee,
      sort_code:              data.data.sort_code,
    };
  },

  async trackOrder(ghn_order_code) {
    const { data } = await ghnClient.post("/v2/shipping-order/detail", { order_code: ghn_order_code });
    const d = data.data;
    return {
      order_code:   d.order_code,
      status:       d.status,
      status_name:  d.status_name,
      updated_date: d.updated_date,
      leadtime:     d.leadtime,
      logs: (d.log || []).map((l) => ({ status: l.status, updated_date: l.updated_date })),
    };
  },

  async getProvinces() {
    const { data } = await ghnClient.get("/master-data/province");
    return data.data;
  },

  async getDistricts(province_id) {
    const { data } = await ghnClient.get("/master-data/district", {
      params: { province_id: Number(province_id) },
    });
    return data.data;
  },

  async getWards(district_id) {
    const { data } = await ghnClient.get("/master-data/ward", {
      params: { district_id: Number(district_id) },
    });
    return data.data;
  },

  async cancelOrder(ghn_order_code) {
    const { data } = await ghnClient.post("/v2/switch-status/cancel", { order_codes: [ghn_order_code] });
    return data;
  },
};

module.exports = ghnService;
