const Message = require('../models/Message');
const User = require('../models/User');
const mongoose = require('mongoose');

// Send message
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    
    if (!recipientId || !content) {
      return res.status(400).json({ message: 'Recipient ID and message content are required' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: 'Invalid recipient ID format' });
    }
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    const message = new Message({
      sender: req.userId,
      recipient: recipientId,
      content
    });
    
    await message.save();
    
    // Populate sender details for response
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name email')
      .populate('recipient', 'name email');
    
    res.status(201).json({
      _id: populatedMessage._id,
      content: populatedMessage.content,
      sender: {
        _id: populatedMessage.sender._id,
        name: populatedMessage.sender.name,
        email: populatedMessage.sender.email
      },
      recipient: {
        _id: populatedMessage.recipient._id,
        name: populatedMessage.recipient.name,
        email: populatedMessage.recipient.email
      },
      read: populatedMessage.read,
      createdAt: populatedMessage.createdAt
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error when sending message' });
  }
};

// Get conversation between two users
exports.getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const messages = await Message.find({
      $or: [
        { sender: req.userId, recipient: userId },
        { sender: userId, recipient: req.userId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'name email')
    .populate('recipient', 'name email');
    
    // Format messages for response
    const formattedMessages = messages.map(msg => ({
      _id: msg._id,
      content: msg.content,
      sender: {
        _id: msg.sender._id,
        name: msg.sender.name,
        email: msg.sender.email
      },
      recipient: {
        _id: msg.recipient._id,
        name: msg.recipient.name,
        email: msg.recipient.email
      },
      read: msg.read,
      createdAt: msg.createdAt
    }));
    
    res.json(formattedMessages);
    
    // Mark received messages as read
    await Message.updateMany(
      { sender: userId, recipient: req.userId, read: false },
      { read: true }
    );
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error when fetching conversation' });
  }
};

// Get recent conversations
exports.getRecentConversations = async (req, res) => {
  try {
    // Convert string userId to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(req.userId);
    
    // Use MongoDB aggregation to get most recent conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userObjectId },
            { recipient: userObjectId }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userObjectId] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $first: '$content' },
          lastMessageDate: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ['$recipient', userObjectId] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { lastMessageDate: -1 }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: '$userDetails'
      },
      {
        $project: {
          _id: 1,
          name: '$userDetails.name',
          email: '$userDetails.email',
          lastMessage: 1,
          lastMessageDate: 1,
          unreadCount: 1
        }
      }
    ]);
    
    res.json(conversations);
  } catch (error) {
    console.error('Get recent conversations error:', error);
    console.error(error.stack); // Log the full error stack for debugging
    res.status(500).json({ message: 'Server error when fetching recent conversations' });
  }
};