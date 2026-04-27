const Review = require("../models/Review");

exports.getAll = async (req, res, next) => {
  try {
    const reviews = await Review.list({ limit: Number(req.query.limit) || 10 });
    res.json({ success: true, reviews });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { name, location, rating, content } = req.body;
    if (!name || !content) {
      return res.status(400).json({ success: false, message: "Thiếu tên hoặc nội dung." });
    }
    const id = await Review.create({ name, location, rating, content });
    res.status(201).json({ success: true, message: "Cảm ơn bạn đã đánh giá!", id });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { name, location, rating, content, is_active } = req.body;
    await Review.update(Number(req.params.id), { name, location, rating, content, is_active });
    res.json({ success: true, message: "Cập nhật thành công." });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Review.delete(Number(req.params.id));
    res.json({ success: true, message: "Đã ẩn đánh giá." });
  } catch (err) { next(err); }
};
