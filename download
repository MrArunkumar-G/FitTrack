# 🌿 FitTrack — 90-Day Transformation Tracker

A full-stack fitness tracker with login/logout, MySQL backend, and a clean light theme.
Built with **Node.js + Express + MySQL**.

---

## 📁 Project Structure

```
fittrack/
├── server.js           ← Express backend (API + static serve)
├── package.json
├── .env.example        ← Copy to .env and fill in values
└── public/
    └── index.html      ← Full frontend (light theme, 2 pages)
```

---

## 🚀 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your MySQL details
cp .env.example .env

# 3. Start the server
npm start          # production
npm run dev        # with auto-reload (nodemon)
```

Visit: `http://localhost:3000`

---

## 🌐 Deploy on Render (Free)

### Step 1 — Get a Free MySQL Database

Render does **not** offer free MySQL. Use one of these free MySQL providers:

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| **Railway** | $5 credit/month | Best option. Easy setup, supports MySQL |
| **Clever Cloud** | Free MySQL (256 MB) | Reliable, European servers |
| **FreeSQLDatabase.net** | Free (5 MB limit) | Very basic, OK for testing |
| **PlanetScale** | ⚠️ Free plan discontinued | No longer free |

#### Using Railway (Recommended):
1. Go to [railway.app](https://railway.app) → New Project → MySQL
2. Copy the connection details (host, port, user, password, database name)
3. Enable SSL on Railway MySQL

### Step 2 — Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial FitTrack commit"
git remote add origin https://github.com/YOUR_USERNAME/fittrack.git
git push -u origin main
```

### Step 3 — Deploy on Render

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Fill in these settings:

| Field | Value |
|-------|-------|
| **Name** | fittrack |
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | Free |

4. Click **Advanced** → **Add Environment Variable** and add:

```
DB_HOST       = your-railway-mysql-host
DB_PORT       = 3306
DB_USER       = root (or your db user)
DB_PASSWORD   = your-password
DB_NAME       = railway (or your db name)
DB_SSL        = true
JWT_SECRET    = some-long-random-secret-string-here
NODE_ENV      = production
```

5. Click **Create Web Service** — Render will build and deploy automatically!

---

## ⚡ Render Free Tier Tips

### 1. Cold Starts (Most Important!)
The free tier **sleeps after 15 minutes** of inactivity. First request after sleep takes **~30 seconds** to wake up.

**Fix — Use UptimeRobot to keep it awake (free):**
1. Go to [uptimerobot.com](https://uptimerobot.com) → Add Monitor
2. Type: HTTP(S)
3. URL: `https://your-app.onrender.com/api/auth/me`
4. Monitoring Interval: Every 5 minutes
5. This pings your app every 5 min → it never sleeps!

### 2. Database Connection Limits
The free Railway MySQL has connection limits. The server already uses a pool with max 5 connections — this is fine.

### 3. Photo Storage Warning
Photos are stored as base64 in MySQL. Large photos can quickly fill up your free database storage.
- Compress photos before uploading (use browser File API with canvas resize)
- Keep photos under 500 KB each
- FreeSQLDatabase free plan (5 MB) is NOT suitable for photos — use Railway (500 MB)

### 4. Environment Variables
Never commit your `.env` file to GitHub. Use `.env.example` to document what's needed.

### 5. JWT Secret
Generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 6. Logs
View your app logs: Render Dashboard → your service → **Logs** tab

### 7. Custom Domain
Render free tier includes a `.onrender.com` domain. You can add a custom domain on paid plans.

---

## 🔑 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT token |
| GET  | `/api/auth/me` | Get current user info |
| PUT  | `/api/auth/goals` | Update weight goals |

### Logs
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/logs` | All logs for user |
| POST   | `/api/logs` | Create/update log for a date |
| DELETE | `/api/logs/:id` | Delete a log entry |

### Photos
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/photos` | List all weeks (no image data) |
| GET    | `/api/photos/:week` | Full photo data for one week |
| POST   | `/api/photos` | Save/update photos for a week |

---

## 🛡 Security Notes

- Passwords are hashed with **bcrypt** (12 rounds)
- JWT tokens expire after **30 days**
- All log/photo routes require a valid JWT header
- Database queries use **parameterized statements** (no SQL injection)
- `DB_SSL=true` encrypts the database connection

---

## 📱 Features

- **Multi-user** — each user sees only their own data
- **Page 1 (Tracker):** Stats, progress bar, daily log form, habits checklist, progress photos, weight chart, habit rings, log history
- **Page 2 (Plan):** South Indian meal plan, home exercise plan, weekly schedule, tips & milestones
- **Light theme** — clean white + green design
- **Responsive** — works on mobile and desktop
- **Progress photos** — 3 angles × 12 weeks, stored in MySQL

---

## 🐛 Troubleshooting

**App won't connect to MySQL:**
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in Render env vars
- Set `DB_SSL=true` for Railway/Clever Cloud

**"ER_DUP_ENTRY" on register:**
- Username or email already taken — use a different one

**Photos not loading after refresh:**
- Photos load per-week from the server — click the week button to reload

**Render app is sleeping:**
- Set up UptimeRobot as described above

---

Made with 💚 — Track your 90-day transformation!
