const mongoose = require('mongoose');
const Post = require('./postModel');

const voteSchema = mongoose.Schema(
  {
    vote: {
      type: String,
      enum: {
        values: ['up', 'down'],
        message: 'A vote must have a Direction',
      },
    },
    value: {
      type: Number,
      min: -1,
      max: 1,
    },
    user: {
      type: String,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
    post: {
      type: mongoose.Schema.ObjectId,
      ref: 'Post',
      required: [true, 'Review must belong to a tour.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
voteSchema.index({ post: 1, user: 1 }, { unique: true });

voteSchema.statics.calcAverageVotes = async function (postId) {
  const stats = await this.aggregate([
    {
      $match: { post: postId },
    },
    {
      $group: {
        _id: '$post',
        voteCount: { $sum: '$value' },
      },
    },
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Post.findByIdAndUpdate(postId, {
      voteCount: stats[0].votesCount,
    });
  } else {
    await Post.findByIdAndUpdate(postId, {
      voteCount: 0,
    });
  }
};

voteSchema.post('save', function () {
  // this points to current review
  this.constructor.calcAverageVotes(this.post);
});

// findByIdAndUpdate
// findByIdAndDelete
voteSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

voteSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageVotes(this.r.post);
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
