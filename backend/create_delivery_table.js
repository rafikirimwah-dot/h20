const { db } = require('./src/config/database');

async function createTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS delivery_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_name VARCHAR(255) NOT NULL,
                customer_phone VARCHAR(50) NOT NULL,
                delivery_address TEXT NOT NULL,
                liters_requested INT NOT NULL,
                delivery_date DATE,
                delivery_time TIME,
                status ENUM('pending','assigned','delivered') DEFAULT 'pending',
                assigned_to INT DEFAULT NULL,
                assigned_at DATETIME DEFAULT NULL,
                delivered_at DATETIME DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                customer_message TEXT
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('✅ delivery_orders table ensured');
        process.exit(0);
    } catch (err) {
        console.error('Error creating delivery_orders table:', err);
        process.exit(1);
    }
}

createTable();
