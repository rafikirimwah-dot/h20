const { db } = require('../config/database');

class WaterReservoir {
    // Get current water status
    static async getStatus() {
        const [rows] = await db.query('SELECT * FROM water_reservoir WHERE id = 1');
        return rows[0];
    }

    // Update remaining water (deduct amount)
    static async updateRemaining(amount) {
        const [result] = await db.query(
            'UPDATE water_reservoir SET remaining_liters = remaining_liters - ?, total_drawn = total_drawn + ? WHERE id = 1',
            [amount, amount]
        );
        return result;
    }

    // Check if enough water is available
    static async hasEnoughWater(amount) {
        const status = await this.getStatus();
        return status && status.remaining_liters >= amount;
    }

    // Get total water stats
    static async getStats() {
        const [rows] = await db.query('SELECT * FROM water_reservoir WHERE id = 1');
        return rows[0];
    }
}

module.exports = WaterReservoir;