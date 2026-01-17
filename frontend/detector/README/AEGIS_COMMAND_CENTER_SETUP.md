# 🛡️ AEGIS COMMAND CENTER - Complete Setup Guide

## 🎯 What You're Building

A **professional Security Operations Center (SOC) Dashboard** with:
- ✅ Real-time alert monitoring
- ✅ Correlation incident war room
- ✅ Statistical dashboards with charts
- ✅ Forensics & search capabilities
- ✅ Dark SOC theme (professional look)
- ✅ WebSocket live updates
- ✅ Toast notifications for critical events

---

## 📦 Required Packages

### Backend Dependencies
```bash
cd your-project-root
npm install express mongoose cors socket.io dotenv
```

### Frontend Dependencies
```bash
cd frontend
npm install react-router-dom recharts socket.io-client
```

---

## 🗂️ File Structure

```
your-project/
├── server.js                    ← Enhanced backend (NEW)
├── models/
│   └── Alert.js                 ← Keep existing
│
└── frontend/
    ├── public/
    └── src/
        ├── App.js               ← Main app with routing (NEW)
        ├── App.css              ← Main styles (NEW)
        │
        ├── pages/               ← CREATE THIS FOLDER
        │   ├── Dashboard.js     ← Overview page
        │   ├── Dashboard.css    ← Copy from AllStyles.css
        │   ├── LiveFeed.js      ← Real-time feed
        │   ├── LiveFeed.css     ← Copy from AllStyles.css
        │   ├── Incidents.js     ← War room
        │   ├── Incidents.css    ← Copy from AllStyles.css
        │   ├── Forensics.js     ← Search & history
        │   └── Forensics.css    ← Copy from AllStyles.css
        │
        └── components/          ← Already exists
            ├── AlertDetails.js  ← Keep existing
            ├── Toast.js         ← NEW notification component
            └── Toast.css        ← Copy from AllStyles.css
```

---

## 🚀 Step-by-Step Setup

### Step 1: Backend Setup

```bash
# 1. Replace your server.js
cp server.js your-project-root/server.js

# 2. Your .env should have:
ATLAS_URI=your_mongodb_connection_string
BackEnd_PORT=5000
```

**Key additions in new server.js:**
- ✅ GET /api/stats - Dashboard statistics
- ✅ GET /api/alerts - Paginated alerts with filters
- ✅ GET /api/incidents - Correlation incidents only
- ✅ DELETE /api/alerts - Clear all (for testing)

### Step 2: Frontend File Organization

```bash
cd frontend/src

# 1. Create pages folder
mkdir pages

# 2. Move/copy files
cp Dashboard.js pages/
cp LiveFeed.js pages/
cp Incidents.js pages/
cp Forensics.js pages/
cp Toast.js components/

# 3. Replace main App.js
cp App.js .  # (the new one with routing)

# 4. Update styles
cp App.css .
```

### Step 3: CSS Setup

**Option A: Individual CSS files (recommended)**
```bash
# Create separate CSS for each page
cp AllStyles.css pages/Dashboard.css
cp AllStyles.css pages/LiveFeed.css
cp AllStyles.css pages/Incidents.css
cp AllStyles.css pages/Forensics.css
cp AllStyles.css components/Toast.css
```

**Option B: Single CSS file**
```bash
# Or use one big CSS file
cat App.css AllStyles.css > App.css
```

### Step 4: Start Everything

```bash
# Terminal 1 - Backend
cd your-project-root
node server.js

# Terminal 2 - Frontend
cd frontend
npm start

# Terminal 3 - Detector (with correlation)
cd detector
python detector.py simulation
```

---

## 🎨 The Four Views

### 1. Dashboard (/) - Tactical Overview
**What it shows:**
- KPI cards (incidents, alerts, health)
- Severity distribution pie chart
- Engine activity bar chart
- Hourly trend line chart
- Recent critical incidents
- Top targeted entities

**API calls:**
- GET /api/stats (every 30 seconds)

### 2. Live Feed (/feed) - The Matrix
**What it shows:**
- Real-time scrolling alerts
- Pause/resume controls
- Filter by engine
- Color-coded by severity
- Expandable details
- Special highlighting for correlation incidents

**Data source:**
- Socket.io 'new-alert' events
- Initial: GET /api/alerts?limit=100

### 3. Incidents (/incidents) - War Room
**What it shows:**
- Correlation Brain incidents only
- Incident cards with risk score
- Attack patterns detected
- Timeline of events
- Engines involved
- Response action buttons (simulated)

**Data source:**
- Filtered from alerts (engine === "CORRELATION BRAIN")
- Or GET /api/incidents

### 4. Forensics (/forensics) - Deep Dive
**What it shows:**
- Searchable data table
- Date range filters
- Severity/engine filters
- Detailed modal view
- Export capabilities

**API calls:**
- GET /api/alerts with query params

---

## 🎯 Key Features

### Real-Time Updates (WebSocket)
```javascript
// Automatically handled in App.js
socket.on('new-alert', (alert) => {
  // Added to alerts state
  // Toast notification if critical
  // Updates all views
});
```

### Toast Notifications
```javascript
// Critical incidents trigger red alert toast
if (alert.engine === "CORRELATION BRAIN") {
  setToast({
    type: 'critical',
    title: '🚨 CRITICAL INCIDENT',
    message: alert.alertType,
    duration: 10000
  });
}
```

### Statistics Dashboard
```javascript
// Auto-refreshes every 30 seconds
useEffect(() => {
  const interval = setInterval(fetchStats, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 🎭 Testing the Command Center

### Test 1: Dashboard View
```bash
# Navigate to http://localhost:3000
# Should see:
- 4 KPI cards with current stats
- Charts showing data distribution
- Recent incidents list
- Top entities
```

### Test 2: Run Simulation
```bash
cd detector
python detector.py simulation

# Watch the dashboard:
1. New alerts appear in Live Feed
2. Charts update
3. Correlation incident appears
4. Toast notification pops up
5. Incidents page shows war room view
```

### Test 3: Live Feed
```bash
# Navigate to /feed
python detector.py traffic anomaly

# Should see:
- Alert slides in at top
- Real-time update
- Can pause/resume
- Can filter by engine
```

### Test 4: Incident War Room
```bash
# Navigate to /incidents
# After simulation:
- See critical incident card
- Click to view details
- Timeline showing attack chain
- Attack patterns highlighted
- Risk score displayed
```

### Test 5: Forensics
```bash
# Navigate to /forensics
# Search for IP: 192.168.1.100
# Filter by Critical severity
# View detailed modal
```

---

## 🎨 Customization

### Colors
Edit in `App.css`:
```css
:root {
  --accent-primary: #00bcd4;  /* Change to your brand color */
  --critical: #ff4444;        /* Red for critical */
  --high: #ff8800;            /* Orange for high */
}
```

### Time Ranges
Edit in Dashboard.js:
```javascript
<button onClick={() => setTimeRange(1)}>1H</button>
<button onClick={() => setTimeRange(24)}>24H</button>
<button onClick={() => setTimeRange(168)}>7D</button>
```

### Correlation Threshold
Edit in .env:
```env
CORRELATION_THRESHOLD=60        # Lower = more sensitive
CORRELATION_TIME_WINDOW=900     # 15 minutes
```

---

## 🐛 Troubleshooting

### Issue: Charts not showing
```bash
# Make sure recharts is installed
cd frontend
npm install recharts
```

### Issue: Routing not working
```bash
# Make sure react-router-dom is installed
npm install react-router-dom
```

### Issue: WebSocket not connecting
```bash
# Check CORS in server.js
cors: {
  origin: "http://localhost:3000",  # Match your React URL
  methods: ["GET", "POST"]
}
```

### Issue: Stats API returns empty
```bash
# Make sure MongoDB has data
# Run simulation to populate
python detector.py simulation
```

### Issue: CSS not loading
```bash
# Make sure CSS files are imported in components
import './Dashboard.css';
```

---

## 📊 Data Flow

```
Python Detector
    ↓
[POST /api/alerts]
    ↓
Node.js Backend
    ├→ Save to MongoDB
    └→ Socket.io broadcast
        ↓
    React Frontend
        ├→ Update alerts state
        ├→ Show toast notification
        ├→ Update Live Feed
        └→ Refresh Dashboard stats
```

---

## 🎯 What Makes This Professional

### 1. Dark SOC Theme
- Industry-standard dark interface
- High contrast for long monitoring sessions
- Color-coded severity (red, orange, yellow, green)

### 2. Real-Time Updates
- WebSocket for instant notifications
- No page refresh needed
- Live counters and charts

### 3. Multi-View Architecture
- Dashboard: High-level overview
- Feed: Real-time monitoring
- Incidents: Deep investigation
- Forensics: Historical analysis

### 4. Correlation Intelligence
- Not just individual alerts
- Attack chain detection
- Risk scoring
- Pattern recognition

### 5. Professional UX
- Toast notifications
- Loading states
- Smooth animations
- Responsive design

---

## 🚀 Next Steps

1. **Add Authentication** - Protect the dashboard
2. **Role-Based Access** - Different views for different users
3. **Export Reports** - PDF/CSV generation
4. **Email Alerts** - Notify on critical incidents
5. **Threat Maps** - Geolocation visualization
6. **Historical Analytics** - Week/month views

---

## ✅ Success Checklist

- [ ] Backend server running on port 5000
- [ ] MongoDB connected
- [ ] Frontend running on port 3000
- [ ] Can navigate between all 4 pages
- [ ] Run simulation - alerts appear
- [ ] Charts showing data
- [ ] Toast notification appears
- [ ] Incidents page shows correlation
- [ ] Search works in Forensics
- [ ] WebSocket connected indicator shows green

---

## 🎉 You Did It!

You now have a **complete enterprise-grade Security Operations Center dashboard**!

**Key Achievements:**
- ✅ 5 ML detection engines
- ✅ Correlation brain
- ✅ Professional SOC interface
- ✅ Real-time monitoring
- ✅ Historical forensics
- ✅ Attack pattern detection

**This is production-level work!** 🏆
