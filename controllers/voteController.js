const Vote = require('../models/votesModel');
const Post = require('../models/postModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.createUpVote = catchAsync(async (req, res, next) => {
  //To allow For
  let post = await Post.findById(req.params.id);
  if (!post) {
    return new AppError(400, { message: 'No Post With That Id' });
  }
  let vote = await Vote.findOne({ user: req.user.id, post: post._id });

  if (!vote) {
    vote = await Vote.create({
      vote: 'up',
      user: req.user.id,
      post: post._id,
    });
    post.voteCount++;
    post = await Post.findByIdAndUpdate(post.id, {
      voteCount: post.voteCount,
    });
    post.voteCount++;
    console.log(post);
    // Send Response
    res.status(200).json({
      status: 'success',
      post,
    });
  } else {
    vote = await Vote.findOneAndUpdate(vote.id, { vote: 'up' });
    post.voteCount += 2;
    post = await Post.findByIdAndUpdate(post.id, { voteCount: post.voteCount });
    console.log(post);
    post.voteCount += 2;
    res.status(200).json({
      status: 'success',
      post,
    });
  }
});

exports.createDownVote = catchAsync(async (req, res, next) => {
  //To allow For
  let post = await Post.findById(req.params.id);

  if (!post) {
    return new AppError(400, { messate: 'No Post with That Id' });
  }
  let vote = await Vote.find({ user: req.user.id, post: post.id }).limit(1);

  if (!vote) {
    vote = await Vote.create({
      vote: 'down',
      user: req.user.id,
      post: post.id,
    });
    post.voteCount--;
    post = await Post.findByIdAndUpdate(post.id, {
      voteCount: post.voteCount,
    });
    console.log(post);
    post.voteCount--;
    // Send Response
    res.status(200).json({
      status: 'success',
      post,
    });
  } else {
    vote = await Vote.findOneAndUpdate(vote.id, {
      vote: 'down',
    });
    post.voteCount -= 2;
    post = await Post.findByIdAndUpdate(post.id, { voteCount: post.voteCount });
    // Send Response
    console.log(post);
    post.voteCount -= 2;
    res.status(200).json({
      status: 'success',
      post,
    });
  }
});
