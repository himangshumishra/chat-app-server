const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');

// Import socket service
const socketService = require('./services/socket');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

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

// Initialize Socket.IO with more flexible CORS
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

// Define routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Chat API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${allowedOrigins.join(', ')}`);
});