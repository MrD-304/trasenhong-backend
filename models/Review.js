const db = require("../config/db");

class Review {
  static async list({ limit = 10, active = true } = {}) {
    const where = active ? "WHERE is_active = 1" : "";
    const [rows] = await db.query(
      `SELECT * FROM reviews ${where} ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );
    return rows;
  }

  static async create({ name, location, rating, content }) {
    const [result] = await db.query(
      "INSERT INTO reviews (name, location, rating, content) VALUES (?, ?, ?, ?)",
      [name, location || "", rating || 5, content]
    );
    return result.insertId;
  }

  static async update(id, fields) {
    const keys   = Object.keys(fields);
    const values = Object.values(fields);
    if (!keys.length) return;
    const set = keys.map(k => `${k} = ?`).join(", ");
    await db.query(`UPDATE reviews SET ${set} WHERE id = ?`, [...values, id]);
  }

  static async delete(id) {
    await db.query("UPDATE reviews SET is_active = 0 WHERE id = ?", [id]);
  }
}

module.exports = Review;
