const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'h2o_db',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Promise wrapper for async/await
const db = pool.promise();

// Test connection
const testConnection = async () => {
    try {
        const [result] = await db.query('SELECT 1');
        console.log('✅ MySQL Database connected successfully!');
        return true;
    } catch (error) {
        console.error('❌ MySQL Database connection failed:', error.message);
        return false;
    }
};

module.exports = { db, testConnection };
// helper to close pool (used in tests)
module.exports.closePool = async () => {
    try {
        await pool.end();
        console.log('✅ DB pool closed');
    } catch (err) {
        console.error('Error closing DB pool:', err);
    }
};