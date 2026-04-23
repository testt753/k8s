const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const path = require('path');
const multer = require('multer');

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

app.disable('x-powered-by');
app.locals.startedAt = new Date().toISOString();
app.locals.isShuttingDown = false;
app.locals.dbReady = false;
app.locals.dbInitAttempts = 0;
app.locals.lastDbError = null;

app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', routes);
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
app.use('/api/uploads', express.static(uploadDir));

app.use((err, req, res, next) => {
	if (err instanceof multer.MulterError) {
		return res.status(400).json({ error: err.message });
	}

	if (err) {
		return res.status(500).json({ error: 'Unexpected server error' });
	}

	return next();
});

module.exports = app;