const Post = require('../models/postModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
exports.createPost = catchAsync(async (req, res, next) => {
  //To allow For
  const post = await Post.create({
    ...req.body,
    user: req.user ? req.user._id : 'Anonimous',
    createdAt: Date.now(),
    voteCount: 0,
  });

  post.user = {
    _id: req.user ? req.user._id : 'Anonimous',
    role: req.user ? req.user.role : 'user',
  };
  console.log(post);
  // Send Response
  res.status(200).json({
    status: 'success',
    data: {
      data: post,
    },
  });
});

//Factory Handlers
exports.getAllPosts = factory.getAll(Post);
exports.getPost = factory.getOne(Post);
exports.updatePost = factory.updateOne(Post);
exports.deletePost = factory.deleteOne(Post);
