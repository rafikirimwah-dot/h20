const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/database');
const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
    try {
        const { username, password, role, substation_id } = req.body;
        
        const [existing] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Username already exists'
            });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.query(
            'INSERT INTO users (username, password, role, substation_id) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, role || 'substation_admin', substation_id || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: { id: result.insertId, username, role }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }
        
        const [rows] = await db.query(`
            SELECT u.*, s.name as substation_name 
            FROM users u
            LEFT JOIN substations s ON u.substation_id = s.id
            WHERE u.username = ?
        `, [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
        
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
        
        delete user.password;
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    substation_id: user.substation_id,
                    substation_name: user.substation_name
                }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message || error.code || String(error)
        });
    }
});

// Get current user
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const [rows] = await db.query(`
            SELECT u.*, s.name as substation_name 
            FROM users u
            LEFT JOIN substations s ON u.substation_id = s.id
            WHERE u.id = ?
        `, [decoded.id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        const user = rows[0];
        delete user.password;
        
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
});

// Create initial admin user
const createInitialAdmin = async () => {
    try {
        const [rows] = await db.query('SELECT id FROM users WHERE username = ?', ['admin']);
        if (rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await db.query(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                ['admin', hashedPassword, 'admin']
            );
            console.log('✅ Admin user created: admin / admin123');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
    }
};

const createInitialSubstationUsers = async () => {
    const password = await bcrypt.hash('maji123', 10);
    const users = [1, 2, 3, 4, 5, 6];

    for (const substationId of users) {
        const username = `maji${substationId}`;
        const [rows] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            await db.query(
                'INSERT INTO users (username, password, role, substation_id) VALUES (?, ?, ?, ?)',
                [username, password, 'substation_admin', substationId]
            );
            console.log(`✅ Substation user created: ${username} / maji123`);
        }
    }
};

// expose createInitialAdmin so server can call it after DB is ready
router.createInitialAdmin = createInitialAdmin;
router.createInitialSubstationUsers = createInitialSubstationUsers;

module.exports = router;