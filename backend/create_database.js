const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDB() {
    const DB_NAME = process.env.DB_NAME || 'h2o_db';
    const DB_HOST = process.env.DB_HOST || 'localhost';
    const DB_USER = process.env.DB_USER || 'root';
    const DB_PASSWORD = process.env.DB_PASSWORD || '';
    const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

    let connection;
    try {
        connection = await mysql.createConnection({
            host: DB_HOST,
            user: DB_USER,
            password: DB_PASSWORD,
            port: DB_PORT
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.log('✅ Database ensured:', DB_NAME);
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating database:', err.message || err);
        if (connection && connection.end) await connection.end().catch(()=>{});
        process.exit(1);
    }
}

createDB();
