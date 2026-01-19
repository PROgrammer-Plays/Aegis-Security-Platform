# 📊 Dashboard Enhancement Guide - Professional SOC Visualizations

## 🎯 What's New

### Enhanced Backend Stats API
- ✅ Comprehensive statistics aggregation
- ✅ Hourly trend analysis
- ✅ Engine performance metrics
- ✅ Top targeted entities tracking
- ✅ Correlation incident summaries

### Enhanced Dashboard Features
- ✅ 4 KPI cards with live data
- ✅ Interactive Pie Chart (severity distribution)
- ✅ Bar Chart (engine activity)
- ✅ Line Chart (hourly trends with critical/high breakdown)
- ✅ Recent critical alerts panel
- ✅ Most targeted entities list
- ✅ Engine performance summary
- ✅ Time range selector (1H, 6H, 24H, 7D)
- ✅ Auto-refresh toggle
- ✅ System health calculation

---

## 🚀 Quick Setup

### Step 1: Install Chart Library
```bash
cd frontend
npm install recharts lucide-react
```

### Step 2: Update Backend
```bash
# Replace your server.js with server_enhanced.js
cp server_enhanced.js server.js
```

The enhanced stats API includes:
```javascript
GET /api/stats?hours=24

Response:
{
  overview: {
    total: 150,
    recent: 89,
    criticalCount: 12,
    incidentCount: 3
  },
  severity: [{_id: "Critical", count: 12}, ...],
  engines: [{_id: "IDS", count: 45}, ...],
  hourlyTrend: [{_id: "2026-01-18 14:00", count: 15, critical: 2, high: 5}, ...],
  topEntities: [{_id: "192.168.1.100", count: 23, maxSeverity: "Critical"}, ...],
  engineActivity: [{_id: "IDS", total: 45, critical: 5, high: 12, medium: 20, low: 8}, ...],
  recentCritical: [5 most recent critical alerts],
  correlationIncidents: [10 most recent incidents]
}
```

### Step 3: Update Dashboard Component
```bash
# Replace your Dashboard.js
cp Dashboard_Enhanced.js frontend/src/pages/Dashboard.js
cp Dashboard_Enhanced.css frontend/src/pages/Dashboard.css
```

---

## 📊 Dashboard Features Explained

### 1. KPI Cards (Top Row)
```
┌─────────────────────────────────────────────────────────┐
│  📊 Total Alerts    🚨 Critical    ⚡ Incidents  ✅ Health │
│      89                12              3             87%  │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Live data from API
- Hover effects (lift + glow)
- Color-coded icons
- System health calculation: `(1 - critical/total) × 100`

### 2. Severity Distribution (Pie Chart)
```
        Critical: 15%
        High: 25%
        Medium: 35%
        Low: 25%
```

**Features:**
- Color-coded slices
- Percentage labels
- Interactive tooltips
- Legend

### 3. Engine Activity (Bar Chart)
```
IDS            ████████████ 45
Traffic        ████████ 38
UEBA           █████ 25
Artifact       ███ 15
Threat Intel   ██ 10
```

**Features:**
- Color-coded bars
- Sorted by activity
- Rounded corners
- Hover tooltips

### 4. Hourly Trend (Line Chart)
```
Total   ═══════════╗
Critical ─────────╗  ╚════════
High     ─────────╬────────
         14:00  15:00  16:00
```

**Features:**
- 3 lines: Total, Critical, High
- Time-based X-axis
- Grid background
- Multi-color coding

### 5. Recent Critical Alerts
```
🚨 CRITICAL
Malware Detected
IDS | 📍 192.168.1.100 | 14:23:15
```

**Features:**
- Last 5 critical alerts
- Engine badges
- IP/entity tags
- Time stamps

### 6. Most Targeted Entities
```
#1  192.168.1.100
    23 alerts | Critical | 3 engines

#2  10.0.0.55
    15 alerts | High | 2 engines
```

**Features:**
- Ranked list (top 8)
- Alert count
- Severity badge
- Engine count

### 7. Engine Performance Summary
```
IDS Engine
45 alerts
5 Critical | 12 High | 20 Medium | 8 Low
```

**Features:**
- Per-engine breakdown
- Severity distribution
- Color-coded tags

---

## 🎨 New Visual Elements

### Time Range Selector
```
[1H] [6H] [24H] [7D] 🔄 Auto
```

**Usage:**
```javascript
const [timeRange, setTimeRange] = useState(24);

// Fetches new data when changed
useEffect(() => {
  fetchStats();
}, [timeRange]);
```

### Auto-Refresh Toggle
```javascript
const [autoRefresh, setAutoRefresh] = useState(true);

// Refreshes every 30 seconds
useEffect(() => {
  if (!autoRefresh) return;
  
  const interval = setInterval(fetchStats, 30000);
  return () => clearInterval(interval);
}, [autoRefresh]);
```

---

## 🎯 Key Improvements

### Before (Basic Dashboard)
```
Total Alerts: 150
[Basic list of alerts]
```

### After (Enhanced Dashboard)
```
📊 Security Operations Overview
┌────────────────────────────────────┐
│ 4 KPI Cards with Live Metrics     │
├────────────────────────────────────┤
│ 📊 Pie Chart | 📊 Bar Chart       │
├────────────────────────────────────┤
│ 📈 Line Chart (Full Width)         │
├────────────────────────────────────┤
│ 🚨 Critical Alerts | 🎯 Targets   │
├────────────────────────────────────┤
│ 🔧 Engine Performance Summary      │
└────────────────────────────────────┘
```

---

## 🔧 Backend Enhancements

### 1. Severity Statistics
```javascript
// Groups alerts by severity
const severityStats = await Alert.aggregate([
  { $match: { timestamp: { $gte: timeAgo } } },
  { $group: { _id: "$severity", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

### 2. Hourly Trend Analysis
```javascript
// Groups by hour with severity breakdown
const hourlyTrend = await Alert.aggregate([
  { $match: { timestamp: { $gte: timeAgo } } },
  { 
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d %H:00", date: "$timestamp" } },
      count: { $sum: 1 },
      critical: { $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] } },
      high: { $sum: { $cond: [{ $eq: ["$severity", "High"] }, 1, 0] } }
    }
  },
  { $sort: { _id: 1 } }
]);
```

### 3. Top Entities Tracking
```javascript
// Finds most targeted IPs/users
const topEntities = await Alert.aggregate([
  { $match: { timestamp: { $gte: timeAgo } } },
  {
    $group: {
      _id: {
        $ifNull: [
          "$details.target_entity",
          { $ifNull: ["$details.ip_address", "$details.source_ip"] }
        ]
      },
      count: { $sum: 1 },
      maxSeverity: { $max: "$severity" },
      engines: { $addToSet: "$engine" }
    }
  },
  { $sort: { count: -1 } },
  { $limit: 10 }
]);
```

---

## 📈 Chart Configuration

### Recharts Setup
```javascript
import { 
  PieChart, Pie, Cell,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
```

### Custom Tooltips
```javascript
<Tooltip 
  contentStyle={{ 
    background: '#1e2433', 
    border: '1px solid #2d3748',
    borderRadius: '8px',
    color: '#e8eaed'
  }}
  cursor={{fill: '#252b3b'}}
/>
```

### Color Configuration
```javascript
const SEVERITY_COLORS = {
  'Critical': '#ff4444',
  'High': '#ff8800',
  'Medium': '#ffbb33',
  'Low': '#00C851'
};
```

---

## 🎨 Styling Highlights

### Gradient Headers
```css
.dashboard-header h1 {
  background: linear-gradient(135deg, #e8eaed 0%, #00bcd4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Animated KPI Cards
```css
.kpi-card::before {
  /* Top border animation */
  background: linear-gradient(90deg, #00bcd4, #4fc3f7);
  transform: scaleX(1) on hover;
}

.kpi-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
}
```

### Glowing Rankings
```css
.entity-rank {
  background: linear-gradient(135deg, #00bcd4, #00acc1);
  box-shadow: 0 0 16px rgba(0, 188, 212, 0.5);
}
```

---

## 🧪 Testing the Dashboard

### 1. Start Backend
```bash
node server.js
```

### 2. Check Stats API
```bash
curl http://localhost:5000/api/stats
# Should return comprehensive JSON stats
```

### 3. Run Frontend
```bash
cd frontend
npm start
```

### 4. Generate Test Data
```bash
cd detector
python detector.py simulation
```

**Expected Results:**
- KPI cards update with new counts
- Charts reflect new data
- Critical alerts appear in panel
- Trend line shows spike
- Entity list updates

---

## 📊 Data Flow

```
Python Detector
      ↓
[POST /api/alerts]
      ↓
MongoDB (saves)
      ↓
[GET /api/stats]
      ↓
MongoDB Aggregation Pipeline
      ↓
Statistics JSON
      ↓
React Dashboard
      ↓
Recharts Visualization
```

---

## 🎯 Advanced Features

### Custom Time Ranges
```javascript
// Add custom ranges
<button onClick={() => setTimeRange(0.5)}>30m</button>
<button onClick={() => setTimeRange(12)}>12H</button>
<button onClick={() => setTimeRange(720)}>30D</button>
```

### Export Data
```javascript
const exportData = () => {
  const csv = stats.hourlyTrend.map(row => 
    `${row._id},${row.count},${row.critical},${row.high}`
  ).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'aegis-stats.csv';
  a.click();
};
```

### Real-Time Updates
```javascript
// Add WebSocket listener
socket.on('new-alert', (alert) => {
  // Refresh stats immediately
  fetchStats();
});
```

---

## ✅ Final Checklist

- [ ] Backend stats API working
- [ ] Charts rendering correctly
- [ ] Time range selector functional
- [ ] Auto-refresh working
- [ ] KPI cards showing live data
- [ ] Tooltips appearing on hover
- [ ] Responsive on mobile
- [ ] No console errors
- [ ] Test data populates charts
- [ ] System health calculates correctly

---

## 🎉 Result

You now have a **professional SOC dashboard** with:

✅ **Live KPI Metrics** - Total, Critical, Incidents, Health
✅ **Interactive Charts** - Pie, Bar, Line with tooltips
✅ **Trend Analysis** - Hourly breakdown with severity
✅ **Critical Alerts Panel** - Recent high-priority events
✅ **Entity Tracking** - Most targeted IPs/users
✅ **Engine Performance** - Per-engine statistics
✅ **Time Range Control** - 1H, 6H, 24H, 7D views
✅ **Auto-Refresh** - Updates every 30 seconds
✅ **Professional Design** - Dark SOC theme

**This is enterprise-grade SOC visualization!** 🚀
