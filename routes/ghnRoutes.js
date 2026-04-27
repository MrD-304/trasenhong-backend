const router     = require("express").Router();
const ghnService = require("../services/ghnService");

router.get("/provinces", async (req, res, next) => {
  try {
    res.json({ success: true, data: await ghnService.getProvinces() });
  } catch (err) { next(err); }
});

router.get("/districts", async (req, res, next) => {
  try {
    const { province_id } = req.query;
    if (!province_id) return res.status(400).json({ success: false, message: "Thiếu province_id." });
    res.json({ success: true, data: await ghnService.getDistricts(province_id) });
  } catch (err) { next(err); }
});

router.get("/wards", async (req, res, next) => {
  try {
    const { district_id } = req.query;
    if (!district_id) return res.status(400).json({ success: false, message: "Thiếu district_id." });
    res.json({ success: true, data: await ghnService.getWards(district_id) });
  } catch (err) { next(err); }
});

router.get("/fee", async (req, res, next) => {
  try {
    const { to_district_id, to_ward_code, weight, length, width, height } = req.query;
    if (!to_district_id || !to_ward_code) {
      return res.status(400).json({ success: false, message: "Thiếu district_id hoặc ward_code." });
    }
    const fee = await ghnService.calcFee({ to_district_id, to_ward_code, weight, length, width, height });
    res.json({ success: true, ...fee });
  } catch (err) { next(err); }
});

router.post("/fee", async (req, res, next) => {
  try {
    const { to_district_id, to_ward_code, weight, length, width, height } = req.body;
    if (!to_district_id || !to_ward_code) {
      return res.status(400).json({ success: false, message: "Thiếu district_id hoặc ward_code." });
    }
    const fee = await ghnService.calcFee({ to_district_id, to_ward_code, weight, length, width, height });
    res.json({ success: true, ...fee });
  } catch (err) { next(err); }
});

module.exports = router;
