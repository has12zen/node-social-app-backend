const express = require('express');
const postController = require('../controllers/postController');
const voteController = require('../controllers/voteController');
const authController = require('../controllers/authController');
const router = express.Router({ mergeParams: true });

router
  .route('/')
  .get(postController.getAllPosts)
  .post(authController.isLoggedIn, postController.createPost);

router
  .route('/:id')
  .get(postController.getPost)
  .patch(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    postController.updatePost
  )
  .delete(
    authController.protect,
    authController.restrictTo('user', 'admin'),
    postController.deletePost
  );
router
  .route('/:id/up')
  .get(authController.protect, voteController.createUpVote);
router
  .route('/:id/down')
  .get(authController.protect, voteController.createDownVote);

// router.route('/:id/:vote').post(voteController.createVote);

module.exports = router;
