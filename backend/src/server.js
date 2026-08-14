const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const substationRoutes = require('./routes/substations');
const tapRoutes = require('./routes/taps');
const dashboardRoutes = require('./routes/dashboard');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with correct CORS
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

// CORS Middleware - Allow multiple origins
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io accessible to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/substations', substationRoutes);
app.use('/api/taps', tapRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to H2O Water Distribution System API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            substations: '/api/substations',
            taps: '/api/taps',
            dashboard: '/api/dashboard'
        }
    });
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log('🟢 Client connected:', socket.id);
    
    socket.on('join-substation', (substationId) => {
        socket.join(`substation-${substationId}`);
        console.log(`Client joined substation-${substationId}`);
    });
    
    socket.on('join-admin', () => {
        socket.join('admin-room');
        console.log('Client joined admin room');
    });
    
    socket.on('disconnect', () => {
        console.log('🔴 Client disconnected:', socket.id);
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    
    try {
        const { testConnection } = require('./config/database');
        await testConnection();
    } catch (error) {
        console.log('⚠️ Database connection warning:', error.message);
    }
});

console.log('✅ Server starting...');