const { db } = require('./src/config/database');

async function dropTable() {
    try {
        await db.query('DROP TABLE IF EXISTS delivery_orders');
        console.log('✅ dropped delivery_orders table');
        process.exit(0);
    } catch (err) {
        console.error('Error dropping delivery_orders table:', err);
        process.exit(1);
    }
}

dropTable();
