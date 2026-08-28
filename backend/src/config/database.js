const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const parsedDatabaseUrl = databaseUrl ? new URL(databaseUrl) : null;
const sslMode = (parsedDatabaseUrl?.searchParams.get('ssl-mode')
    || process.env.SSL_MODE
    || process.env.DB_SSL_MODE
    || process.env.DB_SSL
    || process.env.MYSQL_SSL
    || '').toLowerCase();
const ssl = sslMode === 'required' ? { rejectUnauthorized: false } : undefined;

// Create connection pool
const pool = mysql.createPool({
    host: parsedDatabaseUrl?.hostname || process.env.DB_HOST || process.env.MYSQL_HOST || process.env.MYSQLHOST || 'localhost',
    user: parsedDatabaseUrl?.username || process.env.DB_USER || process.env.MYSQL_USER || process.env.MYSQLUSER || 'root',
    password: parsedDatabaseUrl?.password || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: parsedDatabaseUrl?.pathname?.slice(1) || process.env.DB_NAME || process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || 'h2o_db',
    port: parsedDatabaseUrl?.port || process.env.DB_PORT || process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306,
    ssl,
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
        console.error('❌ MySQL Database connection failed:', error.code || error.message || String(error));
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