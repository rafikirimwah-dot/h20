const bcrypt = require('bcryptjs');
const { db } = require('./src/config/database');

async function createSubstationUsers() {
    try {
        console.log('Creating substation users...');

        // Define users for each substation
        const users = [
            { username: 'maji1', password: 'maji123', substation_id: 1 },
            { username: 'maji2', password: 'maji123', substation_id: 2 },
            { username: 'maji3', password: 'maji123', substation_id: 3 },
            { username: 'maji4', password: 'maji123', substation_id: 4 },
            { username: 'maji5', password: 'maji123', substation_id: 5 },
            { username: 'maji6', password: 'maji123', substation_id: 6 }
        ];

        for (const user of users) {
            // Check if user exists
            const [existing] = await db.query(
                'SELECT id FROM users WHERE username = ?',
                [user.username]
            );

            if (existing.length === 0) {
                // Hash password
                const hashedPassword = await bcrypt.hash(user.password, 10);
                
                // Create user
                await db.query(
                    'INSERT INTO users (username, password, role, substation_id) VALUES (?, ?, ?, ?)',
                    [user.username, hashedPassword, 'substation_admin', user.substation_id]
                );
                
                console.log(`✅ Created user: ${user.username} (password: ${user.password})`);
            } else {
                console.log(`ℹ️ User ${user.username} already exists`);
            }
        }

        // Show all users
        const [allUsers] = await db.query(`
            SELECT u.id, u.username, u.role, s.name as substation_name
            FROM users u
            LEFT JOIN substations s ON u.substation_id = s.id
            ORDER BY u.id
        `);

        console.log('\n📋 All Users:');
        allUsers.forEach(u => {
            console.log(`  - ${u.username} (${u.role})${u.substation_name ? ` - ${u.substation_name}` : ''}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error creating users:', error);
        process.exit(1);
    }
}

createSubstationUsers();