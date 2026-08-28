const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const substationRoutes = require('./routes/substations');
const tapRoutes = require('./routes/taps');
const dashboardRoutes = require('./routes/dashboard');
const deliveryRoutes = require('./routes/delivery');

const app = express();

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://h20-1.onrender.com',
    ...(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean)
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/substations', substationRoutes);
app.use('/api/taps', tapRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/delivery', deliveryRoutes);

// Root
app.get('/', (req, res) => res.json({ message: 'H2O API' }));

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

module.exports = app;
