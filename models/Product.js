const db = require("../config/db");

class Product {
  static async list({ page = 1, limit = 12, category, tag, search, maxPrice, sort } = {}) {
    const offset = (page - 1) * limit;
    let where  = "WHERE p.is_active = 1";
    const params = [];

    if (category) { where += " AND c.slug = ?";                                  params.push(category); }
    if (tag)      { where += " AND JSON_CONTAINS(p.tags, JSON_QUOTE(?))";        params.push(tag); }
    if (maxPrice) { where += " AND p.price <= ?";                                params.push(Number(maxPrice)); }
    if (search)   { where += " AND p.name LIKE ?";                               params.push(`%${search}%`); }

    const orderMap = {
      "price-asc":  "p.price ASC",
      "price-desc": "p.price DESC",
      "newest":     "p.created_at DESC",
      "popular":    "p.name ASC",
    };
    const orderBy = orderMap[sort] || "p.created_at DESC";

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM products p JOIN categories c ON c.id = p.category_id ${where}`,
      params
    );

    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return { total, rows: rows.map(Product._parse) };
  }

  static async findById(id) {
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );
    return rows[0] ? Product._parse(rows[0]) : null;
  }

  static async findBySlug(slug) {
    const [rows] = await db.query(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.slug = ? LIMIT 1`,
      [slug]
    );
    return rows[0] ? Product._parse(rows[0]) : null;
  }

  static async create({ category_id, name, slug, description, price, original_price, stock, weight, images, tags }) {
    const [result] = await db.query(
      `INSERT INTO products
       (category_id, name, slug, description, price, original_price, stock, weight, images, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id, name, slug,
        description    || null,
        price,
        original_price || null,
        stock          || 0,
        weight         || 300,
        images ? JSON.stringify(images) : null,
        tags   ? JSON.stringify(tags)   : null,
      ]
    );
    return result.insertId;
  }

  static async update(id, fields) {
    if (fields.images && Array.isArray(fields.images)) fields.images = JSON.stringify(fields.images);
    if (fields.tags   && Array.isArray(fields.tags))   fields.tags   = JSON.stringify(fields.tags);
    const keys   = Object.keys(fields);
    const values = Object.values(fields);
    if (!keys.length) return;
    const set = keys.map(k => `${k} = ?`).join(", ");
    await db.query(`UPDATE products SET ${set} WHERE id = ?`, [...values, id]);
  }

  static async delete(id) {
    await db.query("UPDATE products SET is_active = 0 WHERE id = ?", [id]);
  }

  static async decreaseStock(id, qty, conn = db) {
    const [result] = await conn.query(
      "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
      [qty, id, qty]
    );
    if (result.affectedRows === 0) throw new Error(`Sản phẩm ID ${id} không đủ tồn kho.`);
  }

  static _parse(row) {
    return {
      ...row,
      images: row.images ? (typeof row.images === "string" ? JSON.parse(row.images) : row.images) : [],
      tags:   row.tags   ? (typeof row.tags   === "string" ? JSON.parse(row.tags)   : row.tags)   : [],
    };
  }
}

module.exports = Product;
