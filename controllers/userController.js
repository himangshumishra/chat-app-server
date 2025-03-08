const User = require('../models/User');
const mongoose = require('mongoose');

// Search users by email
exports.searchUsers = async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ message: 'Email query parameter is required' });
    }
    
    // Find users with similar email, excluding current user
    const users = await User.find({ 
      email: { $regex: email, $options: 'i' },
      _id: { $ne: req.userId }
    }).select('name email');
    
    // Format users for response
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error when searching users' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const user = await User.findById(userId).select('name email');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error when fetching user' });
  }
};