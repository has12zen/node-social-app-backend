const Vote = require('../models/votesModel');
const Post = require('../models/postModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createUpVote = catchAsync(async (req, res, next) => {
  //To allow For
  const post = await Post.findById(req.params.id);
  if (!post) {
    return new AppError(400, { message: 'No Post With That Id' });
  }
  let vote = await Vote.findOne({ user: req.user.id, post: post._id });
  console.log(post);
  if (!vote) {
    vote = await Vote.create({
      vote: 'up',
      value: 1,
      user: req.user.id,
      post: post._id,
    });
    post.voteCount++;

    // Send Response
    res.status(200).json({
      status: 'success',
      post,
    });
  } else {
    vote = await Vote.findByIdAndUpdate(vote._id, { vote: 'up', value: 1 });
    post.voteCount++;
    res.status(200).json({
      status: 'success',
      post,
    });
  }
});

exports.createDownVote = catchAsync(async (req, res, next) => {
  //To allow For
  const post = await Post.findById(req.params.id);
  console.log(post);
  if (!post) {
    return new AppError(400, { messate: 'No Post with That Id' });
  }
  let vote = await Vote.find({ user: req.user.id, post: post.id }).limit(1);
  if (!vote) {
    vote = await Vote.create({
      vote: 'down',
      value: -1,
      user: req.user.id,
      post: post.id,
    });
    post.voteCount--;
    // Send Response
    res.status(200).json({
      status: 'success',
      post,
    });
  } else {
    vote = await Vote.findByIdAndUpdate(vote._id, {
      vote: 'down',
      value: -1,
    });
    post.voteCount--;
    // Send Response
    res.status(200).json({
      status: 'success',
      post,
    });
  }
});
