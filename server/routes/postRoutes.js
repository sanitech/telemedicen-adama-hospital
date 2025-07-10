const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { 
  isAuthenticated, 
  isDoctorOrAdmin 
} = require('../middleware/auth');
const { validatePost } = require('../middleware/validation');
   
// Public routes
router.get('/', postController.getPosts);
router.get('/doctor/:doctorId', postController.getPostsByDoctor);
router.get('/:id', postController.getPostById);

// Protected routes (doctors and admins only)
router.post('/', isAuthenticated, isDoctorOrAdmin, validatePost, postController.createPost);
router.put('/:id', isAuthenticated, isDoctorOrAdmin, validatePost, postController.updatePost);
router.delete('/:id', isAuthenticated, isDoctorOrAdmin, postController.deletePost);

module.exports = router; 