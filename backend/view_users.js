const { db } = require('./src/config/database');

async function listUsers() {
    try {
        const [rows] = await db.query('SELECT id, username, password, role, substation_id FROM users');
        console.log('📋 Users:');
        rows.forEach(r => {
            console.log(`${r.id} | ${r.username} | ${r.role} | substation:${r.substation_id} | pwd_hash:${r.password ? r.password.substring(0,20) + '...' : 'NULL'}`);
        });
        process.exit(0);
    } catch (err) {
        console.error('Error fetching users:', err);
        process.exit(1);
    }
}

listUsers();
