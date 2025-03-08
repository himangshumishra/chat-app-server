const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Import routes and socket service
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const socketService = require('./services/socket');

// Load environment variables
dotenv.config();

// Initialize Express app and create server
const app = express();
const server = http.createServer(app);

// Get the allowed origins - Add your Railway and frontend URLs
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'https://chat.mishra.codes',
  'https://chat-app-client-git-main-mishraji.vercel.app' 
].filter(Boolean);

// CORS middleware with updated configuration
app.use(cors({
  origin: '*', // More permissive for testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

// Body parser middleware with increased limit
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
connectDB();

// Initialize Socket.IO with updated configuration for Railway
const io = socketIo(server, {
  cors: {
    origin: '*', // More permissive for testing
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  transports: ['websocket', 'polling'],
  path: '/socket.io/', // Explicit path
  connectionStateRecovery: {
    // Enables socket state recovery
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  }
});

// Initialize socket service
socketService(io);

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ status: 'Chat API is running' });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server - Update to listen on 0.0.0.0
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});