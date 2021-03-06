const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');
const mongoose = require('mongoose');
const signwebToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signwebToken(user._id);
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-photo'] === 'https',
  });

  //remove password form the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  let user = await User.create({
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    createdAt: Date.now(),
    _id: req.body.userHandle,
  });
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });
  console.log(resetToken, user);
  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${process.env.FRONTEND_URL}/activate/${resetToken}`;
    await new Email(user, resetURL).sendWelcome();

    res.status(200).json({
      status: 'success',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }

  // createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) Check if email and password Exist
  if (!email || !password) {
    return next(new AppError('Please provide Email and Password', 400));
  }
  //2) Check if user exists and passwors is correct
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password'));
  }
  //3) If Everything ok then Send token to Client
  createSendToken(user, 200, req, res);
});

exports.logout = catchAsync(async (req, res) => {
  res.cookie('jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
});

exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  console.log(token);
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // 2) Verification token
  jwt.verify(token, process.env.JWT_SECRET, async function (err, decoded) {
    //console.log(decoded); // bar
    //3) Check if user still exists
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist.',
          401
        )
      );
    }
    console.log(currentUser);

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError(
          'User recently changed password! Please log in again.',
          401
        )
      );
    }
    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  });
});

exports.loginStatus = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  console.log('Hello ');
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // 2) Verification token
  jwt.verify(token, process.env.JWT_SECRET, async function (err, decoded) {
    //console.log(decoded); // bar
    //3) Check if user still exists
    const currentUser = await User.findById(decoded.id);

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next();
    }

    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  });
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(req.body);
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You dont have permisson to perform this action ', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${process.env.FRONTEND_URL}/resetPass/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  //Get User Based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  let user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is Invalid or has Expired', 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  console.log(user);
  await user.save();
  console.log(user);
  // Update passChanged At
  //Log User in Send Jwt
  res.status(200).json({
    status: 'success',
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //Get user from collection
  console.log(req.user);
  let user = await User.findById(req.user.id).select('+password');
  console.log(user);
  //Check if posted Psss is correct\
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your Current Password is Wrong', 401));
  }
  console.log(user);
  //If so Update Pass
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  console.log(user);
  // user find by IdAndUpdate would not work as intended
  //Login User Send Jwt
  res.status(200).json({
    status: 'success',
  });
});

exports.activateUser = catchAsync(async (req, res, next) => {
  //Get User Based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  console.log(hashedToken);
  let user = await mongoose.model('User').findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  console.log(user);
  if (!user) {
    return next(new AppError('Token is Invalid or has Expired', 400));
  }

  user.active = true;

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  console.log(user);
  await user.save({ validateBeforeSave: false });
  console.log(user);
  createSendToken(user, 200, req, res);
});
