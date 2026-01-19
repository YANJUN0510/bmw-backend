const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const routes = require('./routes');
const requestContext = require('./middleware/requestContext');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(requestContext);
morgan.token('requestId', (req) => req.requestId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :requestId'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', routes);

// 404 + Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
