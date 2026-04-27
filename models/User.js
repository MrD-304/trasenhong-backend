const db = require("../config/db");

class User {
  static async findByEmail(email) {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await db.query(
      "SELECT id, full_name, email, phone, role, is_active, created_at FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] || null;
  }

  static async create({ full_name, email, phone, password, role = "customer" }) {
    const [result] = await db.query(
      "INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
      [full_name, email, phone || null, password, role]
    );
    return result.insertId;
  }

  static async update(id, fields) {
    const keys   = Object.keys(fields);
    const values = Object.values(fields);
    if (!keys.length) return;
    const set = keys.map(k => `${k} = ?`).join(", ");
    await db.query(`UPDATE users SET ${set} WHERE id = ?`, [...values, id]);
  }

  static async list({ page = 1, limit = 20, role } = {}) {
    const offset = (page - 1) * limit;
    let where = "WHERE 1=1";
    const params = [];
    if (role) { where += " AND role = ?"; params.push(role); }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
    const [rows] = await db.query(
      `SELECT id, full_name, email, phone, role, is_active, created_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { total, rows };
  }
}

module.exports = User;
