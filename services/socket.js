const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {
  // Store online users: Map of userId -> socketId
  const onlineUsers = new Map();
  
  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });
  
  io.on('connection', async (socket) => {
    const userId = socket.userId;
    
    try {
      // Add user to online users
      onlineUsers.set(userId, socket.id);
      
      console.log(`User connected: ${userId}`);
      
      // Notify all clients about the user's online status
      io.emit('userStatus', {
        userId,
        status: 'online'
      });
      
      // Send current online users to the newly connected client
      const onlineUserIds = Array.from(onlineUsers.keys());
      socket.emit('onlineUsers', onlineUserIds);
      
      // Handle private message
      socket.on('privateMessage', async (data) => {
        const { recipientId, message } = data;
        
        // Send message to recipient if online
        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('newMessage', {
            senderId: userId,
            message
          });
        }
      });
      
      // Handle typing status
      socket.on('typing', (data) => {
        const { recipientId } = data;
        const recipientSocketId = onlineUsers.get(recipientId);
        
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('userTyping', { userId });
        }
      });
      
      // Handle stop typing
      socket.on('stopTyping', (data) => {
        const { recipientId } = data;
        const recipientSocketId = onlineUsers.get(recipientId);
        
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('userStopTyping', { userId });
        }
      });
      
      // Handle read receipts
      socket.on('messageRead', (data) => {
        const { messageId, senderId } = data;
        const senderSocketId = onlineUsers.get(senderId);
        
        if (senderSocketId) {
          io.to(senderSocketId).emit('messageReadReceipt', { messageId });
        }
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${userId}`);
        
        // Remove user from online users
        onlineUsers.delete(userId);
        
        // Notify all clients about the user's offline status
        io.emit('userStatus', {
          userId,
          status: 'offline'
        });
      });
    } catch (error) {
      console.error('Socket error:', error);
    }
  });
};