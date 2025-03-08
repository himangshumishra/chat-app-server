const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Search users by email
router.get('/search', auth, userController.searchUsers);

// Get user by ID
router.get('/:userId', auth, userController.getUserById);

module.exports = router;