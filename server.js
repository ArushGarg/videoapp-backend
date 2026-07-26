const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config(); // load .env variables first

const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const agoraRoutes = require('./routes/agora');
const usersRoutes = require('./routes/users');
const friendsRoutes = require('./routes/friends');
const { initCallSignaling } = require('./sockets/callSignaling');

const app = express();

// ── Middleware ──
app.use(cors());              // allow cross-origin requests from Flutter
app.use(express.json());      // parse JSON request bodies
app.use('/uploads', express.static('uploads')); // serve profile pictures

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/agora', agoraRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/friends', friendsRoutes);

// Health check
app.get('/', (req, res) => res.send('🚀 Server is running!'));

// ── HTTP + Socket.IO ──
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});
initCallSignaling(io);

// ── Start Server ──
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();