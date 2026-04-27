const db = require("../config/db");

class Category {
  static async findAll() {
    const [rows] = await db.query("SELECT * FROM categories ORDER BY id");
    return rows;
  }

  static async findBySlug(slug) {
    const [rows] = await db.query("SELECT * FROM categories WHERE slug = ? LIMIT 1", [slug]);
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.query("SELECT * FROM categories WHERE id = ? LIMIT 1", [id]);
    return rows[0] || null;
  }

  static async create({ name, slug, description }) {
    const [result] = await db.query(
      "INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)",
      [name, slug, description || null]
    );
    return result.insertId;
  }

  static async update(id, fields) {
    const keys   = Object.keys(fields);
    const values = Object.values(fields);
    if (!keys.length) return;
    const set = keys.map(k => `${k} = ?`).join(", ");
    await db.query(`UPDATE categories SET ${set} WHERE id = ?`, [...values, id]);
  }

  static async delete(id) {
    await db.query("DELETE FROM categories WHERE id = ?", [id]);
  }
}

module.exports = Category;
