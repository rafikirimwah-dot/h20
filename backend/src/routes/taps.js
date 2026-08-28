const express = require('express');
const { db } = require('../config/database');
const Substation = require('../models/substation');
const WaterReservoir = require('../models/waterReservoir');
const TapUsage = require('../models/Tapusage');
const { verifyToken, isSubstationAdmin } = require('../middleware/auth');
const router = express.Router();

// Draw water from tap
router.post('/draw', verifyToken, isSubstationAdmin, async (req, res) => {
    try {
        const { substation_id, tap_name, amount } = req.body;

        // VALIDATE INPUT
        if (!substation_id) {
            return res.status(400).json({
                success: false,
                message: 'substation_id is required'
            });
        }

        if (!tap_name) {
            return res.status(400).json({
                success: false,
                message: 'tap_name is required (A or B)'
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be greater than 0'
            });
        }

        if (!['A', 'B'].includes(tap_name)) {
            return res.status(400).json({
                success: false,
                message: 'tap_name must be A or B'
            });
        }

        // Check if user has access to this substation
        if (req.userData.role !== 'admin' && req.userData.substation_id !== substation_id) {
            return res.status(403).json({
                success: false,
                message: 'You do not have access to this substation'
            });
        }

        // Get substation
        const substation = await Substation.findById(substation_id);
        if (!substation) {
            return res.status(404).json({
                success: false,
                message: 'Substation not found'
            });
        }

        // Check if substation has enough water
        if (substation.remaining_water < amount) {
            return res.status(400).json({
                success: false,
                message: `Not enough water. Available: ${substation.remaining_water} L`
            });
        }

        // UPDATE: Draw from substation
        await Substation.drawWater(substation_id, amount);
        await Substation.updateTapDraw(substation_id, tap_name, amount);


        // Get updated data
        const updatedSubstation = await Substation.findById(substation_id);
        const updatedReservoir = await WaterReservoir.getStats();

        // Log tap usage
        await TapUsage.create({
            substation_id,
            tap_name,
            water_drawn: amount,
            remaining_after: updatedSubstation.remaining_water,
            drawn_by: req.userData.username
        });

        // Get full stats
        const substationStats = await Substation.getWithStats(substation_id);

        // Emit socket events
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('water-drawn', {
                substation: substationStats,
                reservoir: updatedReservoir,
                tap: { name: tap_name, amount }
            });
            io.to(`substation-${substation_id}`).emit('water-drawn', {
                substation: substationStats,
                reservoir: updatedReservoir,
                tap: { name: tap_name, amount }
            });
        }

        res.json({
            success: true,
            message: `${amount} liters drawn from Tap ${tap_name}`,
            data: {
                substation: substationStats,
                reservoir: updatedReservoir,
                tap: { name: tap_name, amount }
            }
        });

    } catch (error) {
        console.error('Error drawing water:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to draw water',
            error: error.message
        });
    }
});

// Get tap usage history for substation
router.get('/history/:substationId', verifyToken, async (req, res) => {
    try {
        const substationId = parseInt(req.params.substationId);
        
        // Check access
        if (req.userData.role !== 'admin' && req.userData.substation_id !== substationId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const history = await TapUsage.getBySubstation(substationId, 50);
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch history',
            error: error.message
        });
    }
});

// Get tap summary for substation
router.get('/summary/:substationId', verifyToken, async (req, res) => {
    try {
        const substationId = parseInt(req.params.substationId);
        
        if (req.userData.role !== 'admin' && req.userData.substation_id !== substationId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        const summary = await TapUsage.getSummary(substationId);
        const substation = await Substation.findById(substationId);
        
        res.json({
            success: true,
            data: {
                substation,
                tap_summary: summary
            }
        });
    } catch (error) {
        console.error('Error fetching summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch summary',
            error: error.message
        });
    }
});

// Get all tap usage (admin only)
router.get('/all', verifyToken, async (req, res) => {
    try {
        if (req.userData.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        
        const history = await TapUsage.getAll(100);
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error fetching all usage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch usage',
            error: error.message
        });
    }
});

module.exports = router;