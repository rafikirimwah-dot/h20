const { db } = require('../config/database');

class TapUsage {
    // Create tap usage record
    static async create(data) {
        const { substation_id, tap_name, water_drawn, remaining_after, drawn_by } = data;
        const [result] = await db.query(
            `INSERT INTO tap_usage (substation_id, tap_name, water_drawn, remaining_after, drawn_by) 
             VALUES (?, ?, ?, ?, ?)`,
            [substation_id, tap_name, water_drawn, remaining_after, drawn_by || 'system']
        );
        return result.insertId;
    }

    // Get tap history for substation
    static async getBySubstation(substationId, limit = 20) {
        const [rows] = await db.query(
            `SELECT * FROM tap_usage 
             WHERE substation_id = ? 
             ORDER BY drawn_at DESC 
             LIMIT ?`,
            [substationId, limit]
        );
        return rows;
    }

    // Get all tap history (admin)
    static async getAll(limit = 50) {
        const [rows] = await db.query(`
            SELECT 
                t.*,
                s.name as substation_name
            FROM tap_usage t
            JOIN substations s ON t.substation_id = s.id
            ORDER BY t.drawn_at DESC
            LIMIT ?
        `, [limit]);
        return rows;
    }

    // Get tap summary by substation
    static async getSummary(substationId) {
        const [rows] = await db.query(`
            SELECT 
                tap_name,
                COUNT(*) as total_transactions,
                SUM(water_drawn) as total_drawn,
                AVG(water_drawn) as avg_drawn,
                MAX(water_drawn) as max_drawn,
                MIN(water_drawn) as min_drawn
            FROM tap_usage
            WHERE substation_id = ?
            GROUP BY tap_name
        `, [substationId]);
        return rows;
    }

    // Get recent activity for admin dashboard
    static async getRecentActivity(limit = 20) {
        const [rows] = await db.query(`
            SELECT 
                t.*,
                s.name as substation_name,
                u.username as drawn_by_username
            FROM tap_usage t
            JOIN substations s ON t.substation_id = s.id
            LEFT JOIN users u ON t.drawn_by = u.username
            ORDER BY t.drawn_at DESC
            LIMIT ?
        `, [limit]);
        return rows;
    }
}

module.exports = TapUsage;