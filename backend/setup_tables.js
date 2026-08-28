const { db } = require('./src/config/database');

async function setup() {
    try {
        // Users table
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'substation_admin',
                substation_id INT DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Substations table
        await db.query(`
            CREATE TABLE IF NOT EXISTS substations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                allocated_water INT DEFAULT 0,
                remaining_water INT DEFAULT 0,
                total_drawn INT DEFAULT 0,
                tap_a_drawn INT DEFAULT 0,
                tap_b_drawn INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Tap usage table
        await db.query(`
            CREATE TABLE IF NOT EXISTS tap_usage (
                id INT AUTO_INCREMENT PRIMARY KEY,
                substation_id INT NOT NULL,
                tap_name ENUM('A','B') NOT NULL,
                water_drawn INT NOT NULL,
                remaining_after INT DEFAULT NULL,
                drawn_by VARCHAR(100) DEFAULT NULL,
                drawn_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (substation_id) REFERENCES substations(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Water reservoir table
        await db.query(`
            CREATE TABLE IF NOT EXISTS water_reservoir (
                id INT PRIMARY KEY,
                capacity_liters INT DEFAULT 0,
                remaining_liters INT DEFAULT 0,
                total_drawn INT DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Ensure a single reservoir row exists
        const [rows] = await db.query('SELECT id FROM water_reservoir WHERE id = 1');
        if (rows.length === 0) {
            await db.query('INSERT INTO water_reservoir (id, capacity_liters, remaining_liters, total_drawn) VALUES (1, 600000, 600000, 0)');
        }

        // Delivery orders table
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

        // Water allocation audit table
        await db.query(`
            CREATE TABLE IF NOT EXISTS allocation_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                substation_id INT NOT NULL,
                allocated_amount INT NOT NULL,
                allocated_by VARCHAR(100) NOT NULL,
                allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Seed the substations expected by the default user accounts.
        const substationNames = ['Substation 1', 'Substation 2', 'Substation 3', 'Substation 4', 'Substation 5', 'Substation 6'];
        for (const name of substationNames) {
            await db.query('INSERT INTO substations (name) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM substations WHERE name = ?)', [name, name]);
        }

        // Apply the initial allocation once for a fresh database.
        const [[allocationState]] = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM allocation_logs) AS allocation_count,
                (SELECT COALESCE(SUM(allocated_water), 0) FROM substations) AS allocated_total,
                (SELECT capacity_liters FROM water_reservoir WHERE id = 1) AS capacity_liters,
                (SELECT remaining_liters FROM water_reservoir WHERE id = 1) AS remaining_liters
        `);
        if (
            Number(allocationState.allocation_count) === 0
            && Number(allocationState.allocated_total) === 0
            && Number(allocationState.remaining_liters) === Number(allocationState.capacity_liters)
            && Number(allocationState.capacity_liters) >= 480000
        ) {
            const initialAllocation = 80000;
            for (let substationId = 1; substationId <= 6; substationId += 1) {
                await db.query(
                    'UPDATE substations SET allocated_water = allocated_water + ?, remaining_water = remaining_water + ? WHERE id = ?',
                    [initialAllocation, initialAllocation, substationId]
                );
                await db.query(
                    'INSERT INTO allocation_logs (substation_id, allocated_amount, allocated_by) VALUES (?, ?, ?)',
                    [substationId, initialAllocation, 'system']
                );
            }
            await db.query(
                'UPDATE water_reservoir SET remaining_liters = remaining_liters - ? WHERE id = 1',
                [initialAllocation * 6]
            );
            console.log('✅ Initial allocation applied: 80000 L per substation');
        }

        console.log('✅ Tables ensured and substations seeded');
        return true;
    } catch (err) {
        console.error('❌ Error creating tables:', err);
        throw err;
    }
}

if (require.main === module) {
    setup()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = setup;
