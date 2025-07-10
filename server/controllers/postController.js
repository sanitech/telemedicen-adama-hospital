const Post = require('../models/post');
const User = require('../models/user');

// Create post
const createPost = async (req, res) => {
  try {
    const { content, title } = req.body;
    const authorId = req.user._id;

    // Create post
    const post = new Post({
      authorId,
      content,
      title
    });

    await post.save();

    // Populate author details
    await post.populate('authorId', 'name email specialty');

    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all posts
const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, authorId } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};
    if (authorId) {
      filter.authorId = authorId;
    }

    const posts = await Post.find(filter)
      .populate('authorId', 'name email specialty')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(filter);

    res.json({
      posts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: skip + posts.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get post by ID
const getPostById = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate('authorId', 'name email specialty');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update post
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, title } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author or admin
    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    post.content = content || post.content;
    post.title = title || post.title;
    await post.save();

    // Populate author details
    await post.populate('authorId', 'name email specialty');

    res.json({
      message: 'Post updated successfully',
      post
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete post
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if user is the author or admin
    if (post.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Post.findByIdAndDelete(id);

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get posts by doctor
const getPostsByDoctor = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Check if doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    const posts = await Post.find({ authorId: doctorId })
      .populate('authorId', 'name email specialty')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Post.countDocuments({ authorId: doctorId });

    res.json({
      posts,
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPosts: total
      }
    });
  } catch (error) {
    console.error('Get posts by doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
  getPostsByDoctor
}; 