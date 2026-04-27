const axios = require("axios");

const ghnClient = axios.create({
  baseURL: process.env.GHN_API_URL || "https://online-gateway.ghn.vn/shiip/public-api",
  headers: {
    "Content-Type": "application/json",
    Token:   process.env.GHN_TOKEN   || "",
    ShopId:  process.env.GHN_SHOP_ID || "",
  },
  timeout: 10000,
});

ghnClient.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.message || err.message || "Lỗi GHN API";
    return Promise.reject(new Error(msg));
  }
);

module.exports = ghnClient;
