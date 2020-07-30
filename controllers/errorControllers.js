const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = { error: `Invalid ${err.path}: ${err.value}.` };
  return new AppError(message, 400);
};

const handleDublicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  console.log(value);

  const message = {
    error: `Dublicate Fields Value: ${value}: Please use another value!`,
  };
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = { error: `Invalid input Data. ${errors.join('. ')}` };
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError({ error: 'Invalid Token please login Again!' }, 401);

const handleJWTExpiredError = () =>
  new AppError({ error: 'Your Token Has Expired! Please Login Again!' });

const sendErrorDev = (err, req, res) => {
  //A)API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }
  //B)Rendered React
  console.log('ERROR 💥', err);

  return res.status(err.statusCode).json({
    title: 'Something went Wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  //A) API
  if (req.originalUrl.startsWith('/api')) {
    //Operational, trusted error Send message to Client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    //Programming or other unknown error: Dont leak error Details
    //Log err
    console.log('ERROR 💥', err);
    //Send Generic message
    return res.status(500).json({
      status: 'error',
      message: { error: 'Something went very Wrong' },
    });
  }

  //Rendered react
  //Operational, trusted error Send message to Client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      title: 'Something went very Wrong',
      msg: err.message,
    });
  }
  // Programming or other unknown error: don't leak error details
  console.log('ERROR 💥', err);

  //Send Generic message
  return res.status(err.statusCode).json({
    title: 'Something ent very wrong',
    msg: { error: 'Please try Again later' },
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'err';
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDublicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError(error);

    sendErrorProd(error, req, res);
  }
};
