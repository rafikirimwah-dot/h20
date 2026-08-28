const express = require('express');
const router = express.Router();
const DeliveryOrder = require('../models/DeliveryOrder');
const { verifyToken, isAdmin, hasSubstationAccess } = require('../middleware/auth');
const WaterReservoir = require('../models/waterReservoir');
const Substation = require('../models/substation');

// Public: create delivery order
router.post('/', async (req, res) => {
    try {
        const { customer_name, customer_phone, delivery_address, liters_requested, delivery_date, delivery_time, customer_message } = req.body;

        if (!customer_name || !customer_phone || !delivery_address || !liters_requested) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // validate liters range
        if (liters_requested < 10 || liters_requested > 5000) {
            return res.status(400).json({ success: false, message: 'Liters must be between 10 and 5000' });
        }

        // check reservoir availability (warn but allow order)
        const reservoir = await WaterReservoir.getStatus();
        const enough = reservoir.remaining_liters >= liters_requested;

        const order = await DeliveryOrder.create({ customer_name, customer_phone, delivery_address, liters_requested, delivery_date, delivery_time, customer_message });

        // notify admins via socket
        const io = req.app.get('io');
        if (io) io.to('admin-room').emit('new-delivery-order', order);

        const resp = { success: true, message: 'Order placed', data: order };
        if (!enough) resp.warning = 'Not enough water in reservoir at the moment';
        res.json(resp);
    } catch (err) {
        console.error('Error creating delivery order:', err);
        res.status(500).json({ success: false, message: 'Failed to create order' });
    }
});

// Admin: get pending orders
router.get('/pending', verifyToken, isAdmin, async (req, res) => {
    try {
        const pending = await DeliveryOrder.getPending();
        res.json({ success: true, data: pending });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch pending orders' });
    }
});

// Admin: assign order to substation
router.post('/:id/assign', verifyToken, isAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { substation_id } = req.body;
        if (!substation_id) return res.status(400).json({ success: false, message: 'substation_id is required' });

        const order = await DeliveryOrder.assign(id, substation_id, req.userData.username);

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('delivery-updated', order);
            io.to(`substation-${substation_id}`).emit('delivery-assigned', order);
        }

        res.json({ success: true, message: 'Order assigned', data: order });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to assign order' });
    }
});

// Substation: get assigned orders
router.get('/substation/:id', verifyToken, hasSubstationAccess, async (req, res) => {
    try {
        const substationId = parseInt(req.params.id);
        const orders = await DeliveryOrder.getBySubstation(substationId);
        res.json({ success: true, data: orders });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
});

// Substation/Admin: mark delivered
router.post('/:id/deliver', verifyToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // fetch order to check assigned_to
        const [orderRow] = await require('../config/database').db.query('SELECT * FROM delivery_orders WHERE id = ?', [id]);
        if (orderRow.length === 0) return res.status(404).json({ success: false, message: 'Order not found' });
        const order = orderRow[0];

        // if user is not admin, ensure hasSubstationAccess
        if (req.userData.role !== 'admin') {
            if (req.userData.substation_id !== order.assigned_to) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }
        }

        // ensure substation has enough remaining water
        if (!order.assigned_to) return res.status(400).json({ success: false, message: 'Order is not assigned to any substation' });

        const sub = await Substation.findById(order.assigned_to);
        if (!sub) return res.status(404).json({ success: false, message: 'Assigned substation not found' });

        if (sub.remaining_water < order.liters_requested) {
            return res.status(400).json({ success: false, message: 'Not enough water in substation to fulfill this order' });
        }

        // decrement substation remaining and increment total_drawn
        await Substation.drawWater(order.assigned_to, order.liters_requested);

        // record draw on reservoir totals (do not reduce remaining_liters here to avoid double-decrement if allocation already reduced it)
        await WaterReservoir.recordDraw(order.liters_requested);

        const updated = await DeliveryOrder.markDelivered(id, req.userData.username);

        const io = req.app.get('io');
        if (io) {
            io.to('admin-room').emit('delivery-updated', updated);
            if (updated.assigned_to) io.to(`substation-${updated.assigned_to}`).emit('delivery-delivered', updated);
        }

        res.json({ success: true, message: 'Order marked delivered', data: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to mark delivered' });
    }
});

// Admin: list all orders
router.get('/', verifyToken, isAdmin, async (req, res) => {
    try {
        const all = await DeliveryOrder.getAll();
        res.json({ success: true, data: all });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to fetch orders' });
    }
});

module.exports = router;
