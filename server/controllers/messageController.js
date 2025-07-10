const Message = require('../models/message');
const User = require('../models/user');

// Send message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    console.log(req.body);
    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    // Create message
    const message = new Message({
      senderId,
      receiverId,
      content
    });

    await message.save();

    // Populate sender and receiver details
    await message.populate([
      { path: 'senderId', select: '_id name email' },
      { path: 'receiverId', select: '_id name email' }
    ]);

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get messages between users
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Check if other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    })
    .populate('senderId', 'name email')
    .populate('receiverId', 'name email')
    .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get recent conversations
const getRecentConversations = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get the most recent message from each conversation
    const recentMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: currentUserId },
            { receiverId: currentUserId }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$senderId', currentUserId] },
              '$receiverId',
              '$senderId'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    // Populate user details for each conversation
    const conversations = await Message.populate(recentMessages, [
      { path: 'lastMessage.senderId', select: 'name email' },
      { path: 'lastMessage.receiverId', select: 'name email' },
      { path: '_id', select: 'name email', model: 'User' }
    ]);

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark messages as read
const markMessagesAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Mark unread messages as read
    await Message.updateMany(
      {
        senderId: userId,
        receiverId: currentUserId,
        read: { $ne: true }
      },
      { read: true }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get unread message count
const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const unreadCount = await Message.countDocuments({
      receiverId: currentUserId,
      read: { $ne: true }
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getRecentConversations,
  markMessagesAsRead,
  getUnreadCount
}; 