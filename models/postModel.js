const mongoose = require('mongoose');

const postSchema = mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, { error: 'Please Type what you want to post' }],
      minlength: 10,
      maxlength: 156,
      trim: true,
    },
    user: {
      type: String,
      ref: 'User',
      required: [true, { error: 'Review must belong to a user' }],
    },
    voteCount: {
      type: Number,
      default: 0,
    },
    comments: [{ body: 'string', by: mongoose.Schema.Types.ObjectId }],
    whiteListed: {
      type: Boolean,
      default: true,
      select: false,
    },
    createdAt: { type: Date },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual populate
// postSchema.virtual('reviews', {
//   ref: 'Review',
//   foreignField: 'tour',
//   localField: '_id'
// });

postSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

postSchema.pre(/^find/, function (next) {
  //this.points to current query
  this.find({ whiteListed: { $ne: false } });
  next();
});
postSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
  console.log(this.r);
  next();
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
