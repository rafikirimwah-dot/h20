const bcrypt = require('bcryptjs');
const { db } = require('./src/config/database');

async function resetAdminPassword() {
    try {
        const hashed = await bcrypt.hash('admin123', 10);
        await db.query('UPDATE users SET password = ? WHERE username = ?', [hashed, 'admin']);
        console.log('✅ Admin password reset to admin123');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting admin password:', error);
        process.exit(1);
    }
}

resetAdminPassword();
