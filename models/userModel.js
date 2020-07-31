const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  _id: String,
  email: {
    type: String,
    required: [true, { email: 'Please provide your Email' }],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, { email: 'Please provide a valid Email' }],
  },
  photo: String,
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, { password: 'Please Provide a password' }],
    minlength: 8,
    select: false,
  },
  createdAt: { type: Date },
  passwordConfirm: {
    type: String,
    required: [true, { confirmPassword: 'Please Confirm your Password' }],
    validate: {
      //This only works on Create and Save
      validator: function (el) {
        return el === this.password;
      },
    },
    message: { confirmPassword: 'Passwords are not the same!' },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: false,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  //only return this function if pass was actually modified
  if (!this.isModified('password')) return next();
  //hash pass with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  //Delete pass confirm field
  this.passwordConfirm = undefined;
  next;
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// userSchema.pre(/^find/, function (next) {
//   //this.points to current query
//   this.find({ active: { $ne: false } });
//   next();
// });

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }
  //false means not Changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
