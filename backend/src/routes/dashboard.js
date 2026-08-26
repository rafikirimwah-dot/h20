const express = require('express');
const { db } = require('../config/database');
const Substation = require('../models/Substation');
const WaterReservoir = require('../models/WaterReservoir');
const TapUsage = require('../models/TapUsage');
const { verifyToken, isAdmin } = require('../middleware/auth');
const router = express.Router();

// Admin dashboard
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const reservoir = await WaterReservoir.getStats();
        const substations = await Substation.findAllWithStats();
        const recentActivity = await TapUsage.getRecentActivity(20);
        const totalLiters = Number(reservoir.capacity_liters) || 0;
        const remainingLiters = Number(reservoir.remaining_liters) || 0;
        const reservoirDrawn = Number(reservoir.total_drawn) || 0;
        
        const totalDrawn = substations.reduce((sum, s) => sum + s.total_drawn, 0);
        const totalAllocated = substations.reduce((sum, s) => sum + s.allocated_water, 0);
        const activeSubstations = substations.filter(s => s.total_drawn > 0).length;
        
        res.json({
            success: true,
            data: {
                reservoir: {
                    total_liters: totalLiters,
                    remaining_liters: remainingLiters,
                    total_drawn: reservoirDrawn,
                    percentage_used: totalLiters > 0 ? ((reservoirDrawn / totalLiters) * 100).toFixed(2) : '0.00'
                },
                summary: {
                    total_substations: substations.length,
                    active_substations: activeSubstations,
                    total_allocated: totalAllocated,
                    total_drawn: totalDrawn
                },
                substations,
                recent_activity: recentActivity
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
});

// Substation dashboard
router.get('/substation/:id', verifyToken, async (req, res) => {
    try {
        const substationId = parseInt(req.params.id);
        
        if (req.userData.role !== 'admin' && req.userData.substation_id !== substationId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const substation = await Substation.getWithStats(substationId);
        if (!substation) {
            return res.status(404).json({
                success: false,
                message: 'Substation not found'
            });
        }
        
        const history = await TapUsage.getBySubstation(substationId, 30);
        const summary = await TapUsage.getSummary(substationId);
        const reservoir = await WaterReservoir.getStats();
        
        res.json({
            success: true,
            data: {
                substation,
                reservoir,
                tap_summary: summary,
                recent_activity: history
            }
        });
    } catch (error) {
        console.error('Error fetching substation dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
});

// System health check
router.get('/health', async (req, res) => {
    try {
        const [result] = await db.query('SELECT 1');
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;