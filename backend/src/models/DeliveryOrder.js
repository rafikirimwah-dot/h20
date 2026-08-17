const { db } = require('../config/database');

class DeliveryOrder {
    static async create(payload) {
        const { customer_name, customer_phone, delivery_address, liters_requested, delivery_date, delivery_time, customer_message } = payload;
        const [result] = await db.query(
            `INSERT INTO delivery_orders (customer_name, customer_phone, delivery_address, liters_requested, delivery_date, delivery_time, customer_message)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [customer_name, customer_phone, delivery_address, liters_requested, delivery_date || null, delivery_time || null, customer_message || null]
        );
        const [rows] = await db.query('SELECT * FROM delivery_orders WHERE id = ?', [result.insertId]);
        return rows[0];
    }

    static async getPending() {
        const [rows] = await db.query("SELECT * FROM delivery_orders WHERE status = 'pending' ORDER BY created_at DESC");
        return rows;
    }

    static async assign(id, substationId, assignedBy) {
        await db.query('UPDATE delivery_orders SET status = ?, assigned_to = ?, assigned_at = NOW() WHERE id = ?', ['assigned', substationId, id]);
        const [rows] = await db.query('SELECT * FROM delivery_orders WHERE id = ?', [id]);
        return rows[0];
    }

    static async getBySubstation(substationId) {
        const [rows] = await db.query('SELECT * FROM delivery_orders WHERE assigned_to = ? AND status = "assigned" ORDER BY assigned_at DESC', [substationId]);
        return rows;
    }

    static async markDelivered(id, deliveredBy) {
        await db.query('UPDATE delivery_orders SET status = ?, delivered_at = NOW() WHERE id = ?', ['delivered', id]);
        const [rows] = await db.query('SELECT * FROM delivery_orders WHERE id = ?', [id]);
        return rows[0];
    }

    static async getAll() {
        const [rows] = await db.query('SELECT * FROM delivery_orders ORDER BY created_at DESC');
        return rows;
    }
}

module.exports = DeliveryOrder;
