const { db } = require('../config/database');

class Substation {
    // Get all substations
    static async findAll() {
        const [rows] = await db.query('SELECT * FROM substations ORDER BY id');
        return rows;
    }

    // Get substation by ID
    static async findById(id) {
        const [rows] = await db.query('SELECT * FROM substations WHERE id = ?', [id]);
        return rows[0];
    }

    // Get substation by name
    static async findByName(name) {
        const [rows] = await db.query('SELECT * FROM substations WHERE name = ?', [name]);
        return rows[0];
    }

    // Allocate water to substation
    static async allocateWater(id, amount) {
        const [result] = await db.query(
            'UPDATE substations SET allocated_water = allocated_water + ?, remaining_water = remaining_water + ? WHERE id = ?',
            [amount, amount, id]
        );
        return result;
    }

    // Draw water from substation
    static async drawWater(id, amount) {
        const [result] = await db.query(
            'UPDATE substations SET remaining_water = remaining_water - ?, total_drawn = total_drawn + ? WHERE id = ?',
            [amount, amount, id]
        );
        return result;
    }

    // Update tap specific draws
    static async updateTapDraw(id, tapName, amount) {
        const column = tapName === 'A' ? 'tap_a_drawn' : 'tap_b_drawn';
        const [result] = await db.query(
            `UPDATE substations SET ${column} = ${column} + ? WHERE id = ?`,
            [amount, id]
        );
        return result;
    }

    // Get substation with usage stats
    static async getWithStats(id) {
        const [rows] = await db.query(`
            SELECT 
                s.*,
                COUNT(t.id) as total_transactions,
                SUM(CASE WHEN t.tap_name = 'A' THEN t.water_drawn ELSE 0 END) as tap_a_total,
                SUM(CASE WHEN t.tap_name = 'B' THEN t.water_drawn ELSE 0 END) as tap_b_total,
                MAX(t.drawn_at) as last_activity
            FROM substations s
            LEFT JOIN tap_usage t ON s.id = t.substation_id
            WHERE s.id = ?
            GROUP BY s.id
        `, [id]);
        return rows[0];
    }

    // Get all substations with stats for admin
    static async findAllWithStats() {
        const [rows] = await db.query(`
            SELECT 
                s.*,
                COUNT(t.id) as total_transactions,
                SUM(CASE WHEN t.tap_name = 'A' THEN t.water_drawn ELSE 0 END) as tap_a_total,
                SUM(CASE WHEN t.tap_name = 'B' THEN t.water_drawn ELSE 0 END) as tap_b_total,
                MAX(t.drawn_at) as last_activity
            FROM substations s
            LEFT JOIN tap_usage t ON s.id = t.substation_id
            GROUP BY s.id
            ORDER BY s.id
        `);
        return rows;
    }
}

module.exports = Substation;