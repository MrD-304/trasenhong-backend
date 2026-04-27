const Product  = require("../models/Product");
const Category = require("../models/Category");

exports.getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 12, category, tag, search, maxPrice, sort } = req.query;
    const data = await Product.list({
      page:     Number(page),
      limit:    Number(limit),
      category, tag, search,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort,
    });
    res.json({ success: true, ...data, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const product = isNaN(req.params.id)
      ? await Product.findBySlug(req.params.id)
      : await Product.findById(Number(req.params.id));
    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });
    res.json({ success: true, product });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { category_id, name, slug, description, price, original_price, stock, weight, images, tags } = req.body;
    if (await Product.findBySlug(slug)) {
      return res.status(409).json({ success: false, message: "Slug đã tồn tại." });
    }
    const id      = await Product.create({ category_id, name, slug, description, price, original_price, stock, weight, images, tags });
    const product = await Product.findById(id);
    res.status(201).json({ success: true, message: "Tạo sản phẩm thành công.", product });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!await Product.findById(id)) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });
    }
    const allowed = ["category_id","name","slug","description","price","original_price","stock","weight","images","tags","is_active"];
    const fields  = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) fields[k] = req.body[k]; });
    await Product.update(id, fields);
    res.json({ success: true, message: "Cập nhật sản phẩm thành công.", product: await Product.findById(id) });
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!await Product.findById(id)) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm." });
    }
    await Product.delete(id);
    res.json({ success: true, message: "Đã ẩn sản phẩm." });
  } catch (err) { next(err); }
};

exports.getCategories = async (req, res, next) => {
  try {
    res.json({ success: true, categories: await Category.findAll() });
  } catch (err) { next(err); }
};
