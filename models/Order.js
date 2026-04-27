const db      = require("../config/db");
const Product = require("./Product");

class Order {
  static async create(orderData, items) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const code = "TSH" + Date.now().toString().slice(-8);
      const {
        user_id, full_name, phone, email,
        address, ward, district, province,
        ward_code, district_id, note,
        payment_method, subtotal, shipping_fee,
        discount, total, promo_code,
      } = orderData;

      const [orderResult] = await conn.query(
        `INSERT INTO orders
         (order_code, user_id, full_name, phone, email,
          address, ward, district, province, ward_code, district_id, note,
          payment_method, subtotal, shipping_fee, discount, total, promo_code)
         VALUES (?,?,?,?,?, ?,?,?,?,?,?,?, ?,?,?,?,?,?)`,
        [
          code, user_id || null, full_name, phone, email || null,
          address, ward || null, district || null, province,
          ward_code || null, district_id || null, note || null,
          payment_method, subtotal, shipping_fee, discount, total, promo_code || null,
        ]
      );
      const orderId = orderResult.insertId;

      for (const item of items) {
        await conn.query(
          "INSERT INTO order_items (order_id, product_id, name, price, quantity, subtotal) VALUES (?,?,?,?,?,?)",
          [orderId, item.product_id, item.name, item.price, item.quantity, item.price * item.quantity]
        );
        await Product.decreaseStock(item.product_id, item.quantity, conn);
      }

      await conn.commit();
      return { orderId, orderCode: code };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  static async findByCode(orderCode) {
    const [rows] = await db.query(
      "SELECT * FROM orders WHERE order_code = ? LIMIT 1",
      [orderCode]
    );
    if (!rows[0]) return null;
    const [items] = await db.query(
      `SELECT oi.*, p.images FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`,
      [rows[0].id]
    );
    return { ...rows[0], items };
  }

  static async findById(id) {
    const [rows] = await db.query("SELECT * FROM orders WHERE id = ? LIMIT 1", [id]);
    if (!rows[0]) return null;
    const [items] = await db.query(
      "SELECT oi.*, p.images FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?",
      [id]
    );
    return { ...rows[0], items };
  }

  static async list({ page = 1, limit = 20, status, search } = {}) {
    const offset = (page - 1) * limit;
    let where  = "WHERE 1=1";
    const params = [];

    if (status) { where += " AND status = ?"; params.push(status); }
    if (search) {
      where += " AND (order_code LIKE ? OR full_name LIKE ? OR phone LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM orders ${where}`, params);
    const [rows] = await db.query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return { total, rows };
  }

  static async updateStatus(id, status) {
    await db.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  }

  static async updateGHN(id, { ghn_order_code, ghn_expected_delivery }) {
    await db.query(
      "UPDATE orders SET ghn_order_code = ?, ghn_expected_delivery = ? WHERE id = ?",
      [ghn_order_code, ghn_expected_delivery || null, id]
    );
  }

  static async stats() {
    const [[revenue]] = await db.query(
      "SELECT COALESCE(SUM(total),0) AS total_revenue, COUNT(*) AS total_orders FROM orders WHERE status != 'cancelled'"
    );
    const [[today]] = await db.query(
      "SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURDATE()"
    );
    const [[pending]] = await db.query(
      "SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'"
    );
    const [byStatus] = await db.query(
      "SELECT status, COUNT(*) AS count FROM orders GROUP BY status"
    );
    const [monthly] = await db.query(
      `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month,
              COUNT(*) AS orders,
              SUM(total) AS revenue
       FROM orders
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
         AND status != 'cancelled'
       GROUP BY month ORDER BY month`
    );
    return {
      ...revenue,
      today_orders:   today.count,
      pending_orders: pending.count,
      by_status:      byStatus,
      monthly,
    };
  }
}

module.exports = Order;
