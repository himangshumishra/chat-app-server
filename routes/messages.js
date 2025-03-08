const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Send message
router.post('/', auth, messageController.sendMessage);

// Get conversation with specific user
router.get('/conversation/:userId', auth, messageController.getConversation);

// Get recent conversations
router.get('/recent', auth, messageController.getRecentConversations);

module.exports = router;