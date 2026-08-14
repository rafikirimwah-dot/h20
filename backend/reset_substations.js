const bcrypt = require('bcryptjs');
const { db } = require('./src/config/database');

async function resetPasswords() {
    try {
        const hashed = await bcrypt.hash('maji123', 10);
        const [result] = await db.query('UPDATE users SET password = ? WHERE role = ?', [hashed, 'substation_admin']);
        console.log('✅ Reset passwords for substation_admin users');
        process.exit(0);
    } catch (err) {
        console.error('Error resetting passwords:', err);
        process.exit(1);
    }
}

resetPasswords();
