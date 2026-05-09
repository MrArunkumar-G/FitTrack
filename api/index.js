// ═══════════════════════════════════════════════════════
//  FitTrack — Express + MySQL Backend
// ═══════════════════════════════════════════════════════
require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(express.json({ limit: '25mb' }));   // allow base64 photo uploads
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const JWT_SECRET = process.env.JWT_SECRET || 'fittrack-dev-secret-please-change';
const PORT       = process.env.PORT || 3000;

// ─── DATABASE POOL ───────────────────────────────────
const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  port:             parseInt(process.env.DB_PORT || '3306'),
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'fittrack',
  waitForConnections: true,
  connectionLimit:  5,
  queueLimit:       0,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : undefined,
});

// ─── INIT TABLES ─────────────────────────────────────
async function initDB() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        username      VARCHAR(50)  UNIQUE NOT NULL,
        email         VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        start_weight  DECIMAL(5,2) DEFAULT 105.00,
        goal_weight   DECIMAL(5,2) DEFAULT 82.00,
        calorie_goal  INT DEFAULT 2000,
        protein_goal  INT DEFAULT 120,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        user_id      INT NOT NULL,
        log_date     DATE NOT NULL,
        weight       DECIMAL(5,2),
        waist        DECIMAL(5,2),
        calories     INT,
        protein      INT,
        steps        INT,
        sleep_hours  DECIMAL(4,1),
        water        INT,
        mood         TINYINT,
        notes        TEXT,
        habits       JSON,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_date (user_id, log_date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        user_id      INT NOT NULL,
        week_number  TINYINT NOT NULL,
        front_photo  LONGTEXT,
        left_photo   LONGTEXT,
        right_photo  LONGTEXT,
        notes        TEXT,
        saved_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_user_week (user_id, week_number),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ Database tables ready');
  } finally {
    conn.release();
  }
}

// ─── AUTH MIDDLEWARE ──────────────────────────────────
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, startWeight, goalWeight } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'username, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (username, email, password_hash, start_weight, goal_weight)
       VALUES (?, ?, ?, ?, ?)`,
      [username.trim(), email.toLowerCase().trim(), hash,
       parseFloat(startWeight) || 105, parseFloat(goalWeight) || 82]
    );
    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({
      token,
      user: { id: result.insertId, username, startWeight: parseFloat(startWeight)||105, goalWeight: parseFloat(goalWeight)||82 }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Username or email already taken' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        startWeight: parseFloat(user.start_weight),
        goalWeight:  parseFloat(user.goal_weight),
        calorieGoal: user.calorie_goal,
        proteinGoal: user.protein_goal,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, username, email, start_weight, goal_weight, calorie_goal, protein_goal FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'User not found' });
  const u = rows[0];
  res.json({
    id: u.id, username: u.username, email: u.email,
    startWeight: parseFloat(u.start_weight), goalWeight: parseFloat(u.goal_weight),
    calorieGoal: u.calorie_goal, proteinGoal: u.protein_goal,
  });
});

// PUT /api/auth/goals  — update start/goal weights
app.put('/api/auth/goals', auth, async (req, res) => {
  const { startWeight, goalWeight, calorieGoal, proteinGoal } = req.body;
  await pool.query(
    'UPDATE users SET start_weight=?, goal_weight=?, calorie_goal=?, protein_goal=? WHERE id=?',
    [parseFloat(startWeight)||105, parseFloat(goalWeight)||82,
     parseInt(calorieGoal)||2000, parseInt(proteinGoal)||120, req.user.id]
  );
  res.json({ success: true });
});

// ════════════════════════════════════════════════════
//  LOGS ROUTES
// ════════════════════════════════════════════════════

// GET /api/logs  — all logs for logged-in user, newest first
app.get('/api/logs', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM logs WHERE user_id = ? ORDER BY log_date DESC LIMIT 200',
    [req.user.id]
  );
  // parse habits JSON
  const result = rows.map(r => ({ ...r, habits: r.habits ? JSON.parse(r.habits) : {} }));
  res.json(result);
});

// POST /api/logs  — upsert by date
app.post('/api/logs', auth, async (req, res) => {
  const { log_date, weight, waist, calories, protein, steps, sleep_hours, water, mood, notes, habits } = req.body;
  if (!log_date) return res.status(400).json({ error: 'log_date required' });

  try {
    await pool.query(
      `INSERT INTO logs
         (user_id, log_date, weight, waist, calories, protein, steps, sleep_hours, water, mood, notes, habits)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         weight=VALUES(weight), waist=VALUES(waist),
         calories=VALUES(calories), protein=VALUES(protein),
         steps=VALUES(steps), sleep_hours=VALUES(sleep_hours),
         water=VALUES(water), mood=VALUES(mood),
         notes=VALUES(notes), habits=VALUES(habits)`,
      [req.user.id, log_date,
       weight||null, waist||null, calories||null, protein||null,
       steps||null, sleep_hours||null, water||null, mood||null,
       notes||null, JSON.stringify(habits||{})]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/logs/:id
app.delete('/api/logs/:id', auth, async (req, res) => {
  await pool.query('DELETE FROM logs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ success: true });
});

// ════════════════════════════════════════════════════
//  PHOTOS ROUTES
// ════════════════════════════════════════════════════

// GET /api/photos  — all weeks (without image data to keep it fast)
app.get('/api/photos', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT week_number,
            front_photo IS NOT NULL AS has_front,
            left_photo  IS NOT NULL AS has_left,
            right_photo IS NOT NULL AS has_right,
            notes, saved_at
     FROM photos WHERE user_id = ? ORDER BY week_number`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/photos/:week  — full photo data for one week
app.get('/api/photos/:week', auth, async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM photos WHERE user_id = ? AND week_number = ?',
    [req.user.id, req.params.week]
  );
  res.json(rows[0] || null);
});

// POST /api/photos  — upsert
app.post('/api/photos', auth, async (req, res) => {
  const { week_number, front_photo, left_photo, right_photo, notes } = req.body;
  if (!week_number) return res.status(400).json({ error: 'week_number required' });

  try {
    await pool.query(
      `INSERT INTO photos (user_id, week_number, front_photo, left_photo, right_photo, notes)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         front_photo  = COALESCE(VALUES(front_photo),  front_photo),
         left_photo   = COALESCE(VALUES(left_photo),   left_photo),
         right_photo  = COALESCE(VALUES(right_photo),  right_photo),
         notes        = VALUES(notes)`,
      [req.user.id, week_number,
       front_photo||null, left_photo||null, right_photo||null, notes||null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ─── CATCH-ALL → serve frontend ──────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── START ───────────────────────────────────────────
// Local dev: node server.js
// Vercel: exports the app as a serverless function
if (require.main === module) {
  initDB()
    .then(() => app.listen(PORT, () => console.log(`🚀 FitTrack on http://localhost:${PORT}`)))
    .catch(err => { console.error('DB init failed:', err); process.exit(1); });
} else {
  // Vercel serverless — init DB lazily on first request
  let dbReady = false;
  const originalHandler = app.handle.bind(app);
  app.handle = async (req, res, next) => {
    if (!dbReady) {
      await initDB().catch(err => console.error('DB init error:', err));
      dbReady = true;
    }
    originalHandler(req, res, next);
  };
}

module.exports = app;
