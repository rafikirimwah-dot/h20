const express = require('express');
const { db } = require('../config/database');
const Substation = require('../models/substation');
const WaterReservoir = require('../models/waterReservoir');
const { verifyToken, isAdmin, hasSubstationAccess } = require('../middleware/auth');
const router = express.Router();

// Get all substations (admin only)
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const substations = await Substation.findAllWithStats();
        const reservoir = await WaterReservoir.getStats();
        
        res.json({
            success: true,
            data: {
                substations,
                reservoir: {
                    total_liters: reservoir.capacity_liters,
                    remaining_liters: reservoir.remaining_liters,
                    total_drawn: reservoir.total_drawn
                }
            }
        });
    } catch (error) {
        console.error('Error fetching substations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch substations',
            error: error.message
        });
    }
});

// Get single substation
router.get('/:id', verifyToken, hasSubstationAccess, async (req, res) => {
    try {
        const substation = await Substation.getWithStats(parseInt(req.params.id));
        if (!substation) {
            return res.status(404).json({
                success: false,
                message: 'Substation not found'
            });
        }
        res.json({
            success: true,
            data: substation
        });
    } catch (error) {
        console.error('Error fetching substation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch substation',
            error: error.message
        });
    }
});

// Allocate water to substation (admin only)
router.post('/:id/allocate', verifyToken, isAdmin, async (req, res) => {
    try {
        const { amount } = req.body;
        const substationId = parseInt(req.params.id);
        
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid amount'
            });
        }
        
        const substation = await Substation.findById(substationId);
        if (!substation) {
            return res.status(404).json({
                success: false,
                message: 'Substation not found'
            });
        }
        
        const hasEnough = await WaterReservoir.hasEnoughWater(amount);
        if (!hasEnough) {
            return res.status(400).json({
                success: false,
                message: 'Not enough water in reservoir',
                available: (await WaterReservoir.getStatus()).remaining_liters
            });
        }
        
        await WaterReservoir.updateRemaining(amount);
        await Substation.allocateWater(substationId, amount);
        
        await db.query(
            'INSERT INTO allocation_logs (substation_id, allocated_amount, allocated_by) VALUES (?, ?, ?)',
            [substationId, amount, req.userData.username]
        );
        
        const updatedSubstation = await Substation.getWithStats(substationId);
        const reservoir = await WaterReservoir.getStats();
        
        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('water-allocated', {
                substation: updatedSubstation,
                reservoir
            });
            io.to(`substation-${substationId}`).emit('water-allocated', {
                substation: updatedSubstation,
                reservoir
            });
        }
        
        res.json({
            success: true,
            message: `Allocated ${amount} liters to ${updatedSubstation.name}`,
            data: {
                substation: updatedSubstation,
                reservoir
            }
        });
    } catch (error) {
        console.error('Error allocating water:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to allocate water',
            error: error.message
        });
    }
});

// Get substation usage history
router.get('/:id/history', verifyToken, hasSubstationAccess, async (req, res) => {
    try {
        const substationId = parseInt(req.params.id);
        const [rows] = await db.query(
            `SELECT * FROM tap_usage 
             WHERE substation_id = ? 
             ORDER BY drawn_at DESC 
             LIMIT 50`,
            [substationId]
        );
        
        res.json({
            success: true,
            data: rows
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

module.exports = router;