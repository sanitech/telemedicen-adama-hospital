const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { isAuthenticated } = require('../middleware/auth');
const { validateMessage } = require('../middleware/validation');

// All routes require authentication
router.use(isAuthenticated);

// Send and receive messages
router.post('/send', messageController.sendMessage);
router.get('/conversations/recent', messageController.getRecentConversations);
router.get('/unread/count', messageController.getUnreadCount);
router.put('/:userId/read', messageController.markMessagesAsRead);
router.get('/:userId', messageController.getMessages);

module.exports = router; 