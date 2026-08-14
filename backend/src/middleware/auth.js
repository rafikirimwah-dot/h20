const jwt = require('jsonwebtoken');
const { db } = require('../config/database');

// Verify JWT token
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        
        // Verify user still exists
        const [rows] = await db.query('SELECT id, username, role, substation_id FROM users WHERE id = ?', [decoded.id]);
        
        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        
        req.userData = rows[0];
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
    if (req.userData.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Check if user is substation admin or admin
const isSubstationAdmin = (req, res, next) => {
    if (req.userData.role !== 'substation_admin' && req.userData.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Substation admin access required'
        });
    }
    next();
};

// Check if user has access to specific substation
const hasSubstationAccess = (req, res, next) => {
    const substationId = parseInt(req.params.id) || parseInt(req.body.substation_id);
    
    if (req.userData.role === 'admin') {
        return next();
    }
    
    if (req.userData.role === 'substation_admin') {
        if (req.userData.substation_id === substationId) {
            return next();
        }
        return res.status(403).json({
            success: false,
            message: 'You do not have access to this substation'
        });
    }
    
    return res.status(403).json({
        success: false,
        message: 'Access denied'
    });
};

module.exports = {
    verifyToken,
    isAdmin,
    isSubstationAdmin,
    hasSubstationAccess
};