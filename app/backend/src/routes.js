const express = require('express');
const { pool, checkDbHealth } = require('./db');
const multer = require('multer');
const fs = require('fs');
const fsp = require('fs/promises');
const router = express.Router();
const path = require('path');
const client = require('prom-client');

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: 'task_manager_' });
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const getReadinessReport = async (app) => {
  if (app.locals.isShuttingDown) {
    return {
      httpStatus: 503,
      payload: {
        status: 'SHUTTING_DOWN',
        ready: false,
        db: 'UNKNOWN',
      },
    };
  }

  if (!app.locals.dbReady) {
    return {
      httpStatus: 503,
      payload: {
        status: 'STARTING',
        ready: false,
        db: 'INITIALIZING',
        attempts: app.locals.dbInitAttempts,
        error: app.locals.lastDbError || undefined,
      },
    };
  }

  try {
    await checkDbHealth();
    return {
      httpStatus: 200,
      payload: {
        status: 'READY',
        ready: true,
        db: 'UP',
        attempts: app.locals.dbInitAttempts,
      },
    };
  } catch (error) {
    app.locals.lastDbError = error.message;

    return {
      httpStatus: 503,
      payload: {
        status: 'DB_DOWN',
        ready: false,
        db: 'DOWN',
        attempts: app.locals.dbInitAttempts,
        error: error.message,
      },
    };
  }
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'task-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_SIZE_BYTES || 5 * 1024 * 1024),
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('Only image uploads are allowed.'));
      return;
    }

    cb(null, true);
  },
});

router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: req.app.locals.isShuttingDown ? 'SHUTTING_DOWN' : 'UP',
    live: true,
    startedAt: req.app.locals.startedAt,
  });
});

router.get('/health/ready', async (req, res) => {
  const readiness = await getReadinessReport(req.app);
  return res.status(readiness.httpStatus).json(readiness.payload);
});

router.get('/health', async (req, res) => {
  const readiness = await getReadinessReport(req.app);
  return res.status(req.app.locals.isShuttingDown ? 503 : 200).json({
    status: req.app.locals.isShuttingDown ? 'SHUTTING_DOWN' : 'UP',
    live: true,
    ready: readiness.payload.ready,
    db: readiness.payload.db,
    attempts: req.app.locals.dbInitAttempts,
    error: readiness.payload.error,
    startedAt: req.app.locals.startedAt,
  });
});

router.get('/info', (req, res) => {
  res.json({
    app: 'task-manager-backend',
    version: process.env.APP_VERSION || 'dev',
    imageTag: process.env.APP_IMAGE_TAG || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    storageMode: process.env.APP_STORAGE_MODE || 'ephemeral-emptydir',
    dbReady: Boolean(req.app.locals.dbReady),
    dbInitAttempts: req.app.locals.dbInitAttempts,
    startedAt: req.app.locals.startedAt,
  });
});

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

router.get('/tasks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tasks', upload.single('image'), async (req, res) => {
  const title = (req.body.title || '').trim();
  const description = (req.body.description || '').trim();
  const filename = req.file ? req.file.filename : null;

  if (!title) {
    return res.status(400).json({ error: 'Title is required.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, description, image_url) VALUES ($1, $2, $3) RETURNING *',
      [title, description, filename]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const taskResult = await pool.query('SELECT image_url FROM tasks WHERE id = $1', [id]);
    if (taskResult.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const imageUrl = taskResult.rows[0]?.image_url;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    if (imageUrl) {
      const filePath = path.join(uploadDir, imageUrl);
      if (fs.existsSync(filePath)) {
        await fsp.unlink(filePath);
      }
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tasks/:id/complete', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "UPDATE tasks SET status = 'completed' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;