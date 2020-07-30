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

// findByIdAndUpdate
// findByIdAndDelete
voteSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote;
