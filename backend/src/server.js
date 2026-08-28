const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    ...(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean)
];

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('join-substation', (substationId) => socket.join(`substation-${substationId}`));
    socket.on('join-admin', () => socket.join('admin-room'));
});

const start = async () => {
    const PORT = process.env.PORT || 5001;
    return new Promise((resolve, reject) => {
        server.listen(PORT, async () => {
            console.log(`Server running on http://localhost:${PORT}`);
            try {
                const { testConnection } = require('./config/database');
                await testConnection();
                const auth = require('./routes/auth');
                if (auth && typeof auth.createInitialAdmin === 'function') {
                    await auth.createInitialAdmin();
                }
                resolve(server);
            } catch (error) {
                console.log('Database connection warning:', error.message);
                resolve(server);
            }
        }).on('error', (err) => reject(err));
    });
};

if (require.main === module) {
    start().catch(err => console.error('Failed to start server', err));
}

module.exports = { server, start };
