const bcrypt = require('bcryptjs');
const { db } = require('./src/config/database');

async function createUsers() {
    try {
        // Hash passwords
        const adminPass = await bcrypt.hash('admin123', 10);
        const majiPass = await bcrypt.hash('maji123', 10);

        // Check if admin exists
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', ['admin']);
        
        if (existing.length === 0) {
            // Create admin
            await db.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', adminPass, 'admin']
            );
            console.log('✅ Admin user created');
        } else {
            console.log('ℹ️ Admin user already exists');
        }

        // Create substation users
        const substationUsers = [
            { username: 'maji1', substation_id: 1 },
            { username: 'maji2', substation_id: 2 },
            { username: 'maji3', substation_id: 3 },
            { username: 'maji4', substation_id: 4 },
            { username: 'maji5', substation_id: 5 },
            { username: 'maji6', substation_id: 6 }
        ];

        for (const user of substationUsers) {
            const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [user.username]);
            
            if (existing.length === 0) {
                await db.query(
                    'INSERT INTO users (username, password, role, substation_id) VALUES (?, ?, ?, ?)',
                    [user.username, majiPass, 'substation_admin', user.substation_id]
                );
                console.log(`✅ Created user: ${user.username}`);
            } else {
                console.log(`ℹ️ User ${user.username} already exists`);
            }
        }

        // Show all users
        const [users] = await db.query('SELECT id, username, role, substation_id FROM users');
        console.log('\n📋 All Users:');
        users.forEach(u => {
            console.log(`  - ${u.username} (${u.role})${u.substation_id ? ` - Substation ${u.substation_id}` : ''}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createUsers();