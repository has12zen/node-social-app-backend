const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');

const AppError = require('./utils/appError');
const userRouter = require('./routes/userRoutes');
const postRouter = require('./routes/postRouter');
const globalErrorHandler = require('./controllers/errorControllers');

app = express();
app.enable('trust proxy');

app.set('view engine', 'pug');
// Set security HTTP headers
app.use(cors());
// Access-Control-Allow-Origin *
// app.use(cors({
//   origin: 'url'
// }))

app.options('*', cors());
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

//Body Parser
app.use(express.json());
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.originalUrl);
  next();
});

//  ROUTES --

app.use('/api/v1/posts', postRouter);
app.use('/api/v1/users', userRouter);
// app.use('/api/v1/reviews', reviewRouter);
// app.use('/api/v1/bookings', bookingRouter);
// app.use('/', viewRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
