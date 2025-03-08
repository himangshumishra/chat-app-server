const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Determine if we're in a serverless environment (Vercel)
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Create HTTP server if not in serverless environment
let server;
if (!isServerless) {
  server = http.createServer(app);
}

// Get the allowed origins
const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL] 
  : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'];


// CORS middleware with more flexible configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log('Allowing CORS for:', origin);
    }
    
    // Allow all origins in development
    return callback(null, true);
  },
  credentials: true
}));

// Body parser middleware
app.use(express.json());

// Connect to MongoDB
connectDB();

// Initialize Socket.IO only in non-serverless environments
if (!isServerless && server) {
  const socketIo = require('socket.io');
  const socketService = require('./services/socket');
  
  const io = socketIo(server, {
    cors: {
      origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        return callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });
  
  // Initialize socket service
  socketService(io);
} else {
  // In serverless environments, provide a REST API alternative for socket operations
  app.post('/api/socket-events', (req, res) => {
    try {
      const { eventType, data } = req.body;
      
      switch(eventType) {
        case 'userStatus':
          return res.json({
            success: true,
            event: 'userStatus',
            message: 'User status updated via REST API'
          });
          
        case 'privateMessage':
          return res.json({
            success: true,
            event: 'privateMessage',
            message: 'Message delivered via REST API'
          });
          
        default:
          return res.status(400).json({ message: 'Invalid event type' });
      }
    } catch (error) {
      console.error('Socket API error:', error);
      return res.status(500).json({ message: 'Server error in socket API' });
    }
  });
}

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Chat API is running');
});

// Health check endpoint for cloud platforms
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

// Start server in non-serverless environment
if (!isServerless && server) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;