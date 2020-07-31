const User = require('../models/userModel');
const Vote = require('../models/votesModel');
const factory = require('./handlerFactory');
const catchAsync = require('../utils/catchAsync');
//Factory Exports
exports.getAllUsers = factory.getAll(User, { active: { $ne: false } });
exports.getUser = catchAsync(async (req, res, next) => {
  let query = User.findById(req.params.id);
  const doc = await query;
  if (!doc) {
    return next(new AppError({ error: 'No Document find with that Id' }, 404));
  }
  const votes = await Vote.find({ user: doc._id });
  res.status(200).json({
    status: 'success',
    credentials: doc,
    likes: [...votes],
    notifications: [],
  });
});

exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: { error: 'This route is not defined! Please use /signup instead' },
  });
};
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        {
          error:
            'This route is not for password updates. Please use /updateMyPassword.',
        },
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;
  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
