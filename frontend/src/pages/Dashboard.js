// src/pages/Dashboard.js - FIXED with proper authentication
import React, { useEffect, useState, useCallback } from 'react';
const API_BASE = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";// Ensure this is set in your .env file
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  ShieldAlert, Activity, Server, AlertTriangle, Zap
} from 'lucide-react';
import './Dashboard.css';

const SEVERITY_COLORS = {
  'Critical': '#ff4444',
  'High': '#ff8800',
  'Medium': '#ffbb33',
  'Low': '#00C851'
};

const CHART_COLORS = ['#00bcd4', '#ff4444', '#ff8800', '#ffbb33', '#00C851', '#9c27b0'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);

  // Get token from localStorage
  const token = localStorage.getItem('token');

  // Fetch stats from backend with authentication
  const fetchStats = useCallback(async () => {
    try {
      console.log('📊 Fetching dashboard stats...');
      
      // FIXED: Added Authorization header
      const response = await fetch(`${API_BASE}/api/stats?hours=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        // FIXED: Better error handling for 401
        if (response.status === 401) {
          console.error('❌ Authentication failed - token might be expired');
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          window.location.href = '/';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Stats received:', data);
      setStats(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('❌ Failed to fetch stats:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [timeRange, token]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, fetchStats]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Command Center...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="dashboard-error">
        <AlertTriangle size={48} color="#ff4444" />
        <p>Failed to load dashboard statistics</p>
        <p className="error-message">{error || 'No data available'}</p>
        <button onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  // Safe data extraction with defaults
  const severityData = (stats.severity || []).map(s => ({ 
    name: s._id, 
    value: s.count,
    color: SEVERITY_COLORS[s._id] || '#888888'
  }));

  const engineData = (stats.engines || []).map((s, idx) => ({ 
    name: s._id ? s._id.replace(' Engine', '') : 'Unknown', 
    value: s.count || 0,
    color: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  const hourlyData = (stats.hourlyTrend || []).map(h => ({
    hour: h._id ? h._id.split(' ')[1] : 'N/A',
    total: h.count || 0,
    critical: h.critical || 0,
    high: h.high || 0
  }));

  const overview = stats.overview?.[0] || {
    recent: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    incidentCount: 0
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>🛡️ AEGIS Command Center</h1>
          <p className="subtitle">Real-time Security Operations Dashboard</p>
        </div>
        
        <div className="dashboard-controls">
          {/* Time Range Selector */}
          <div className="time-selector">
            {[1, 6, 12, 24, 48, 168].map(hours => (
              <button
                key={hours}
                className={timeRange === hours ? 'active' : ''}
                onClick={() => setTimeRange(hours)}
              >
                {hours < 24 ? `${hours}h` : `${hours / 24}d`}
              </button>
            ))}
          </div>
          
          {/* Auto-refresh Toggle */}
          <button 
            className={`refresh-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          >
            🔄
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon">
            <ShieldAlert size={40} color="#00bcd4" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Alerts</div>
            <div className="kpi-value">{overview.recent || 0}</div>
            <div className="kpi-subtext">Last {timeRange}h</div>
          </div>
        </div>

        <div className="kpi-card critical-card">
          <div className="kpi-icon">
            <AlertTriangle size={40} color="#ff4444" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Critical</div>
            <div className="kpi-value">{overview.criticalCount || 0}</div>
            <div className="kpi-subtext">Immediate Action Required</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">
            <Activity size={40} color="#ff8800" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">High Priority</div>
            <div className="kpi-value">{overview.highCount || 0}</div>
            <div className="kpi-subtext">Needs Investigation</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon">
            <Zap size={40} color="#00C851" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Incidents</div>
            <div className="kpi-value">{overview.incidentCount || 0}</div>
            <div className="kpi-subtext">Correlation Brain</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Severity Distribution */}
        <div className="chart-card">
          <h3>📊 Severity Distribution</h3>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No severity data available</div>
          )}
        </div>

        {/* Detection Engines */}
        <div className="chart-card">
          <h3>🛡️ Detection Engines</h3>
          {engineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  stroke="#9aa0a6"
                />
                <YAxis stroke="#9aa0a6" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e2433', 
                    border: '1px solid #2d3748' 
                  }} 
                />
                <Bar dataKey="value" fill="#00bcd4" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No engine data available</div>
          )}
        </div>

        {/* Hourly Trend */}
        <div className="chart-card full-width">
          <h3>📈 Hourly Activity Trend</h3>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="hour" stroke="#9aa0a6" />
                <YAxis stroke="#9aa0a6" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e2433', 
                    border: '1px solid #2d3748' 
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#00bcd4" 
                  strokeWidth={2}
                  name="Total Alerts"
                />
                <Line 
                  type="monotone" 
                  dataKey="critical" 
                  stroke="#ff4444" 
                  strokeWidth={2}
                  name="Critical"
                />
                <Line 
                  type="monotone" 
                  dataKey="high" 
                  stroke="#ff8800" 
                  strokeWidth={2}
                  name="High"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No hourly trend data available</div>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="bottom-grid">
        {/* Recent Critical Incidents */}
        <div className="incidents-panel">
          <h3>
            <AlertTriangle size={20} />
            Recent Critical Incidents
          </h3>
          {stats.recentCritical && stats.recentCritical.length > 0 ? (
            <div className="incidents-list">
              {stats.recentCritical.slice(0, 10).map((alert, idx) => (
                <div key={idx} className="incident-item">
                  <div className="incident-header">
                    <span className="incident-badge">{alert.severity}</span>
                    <span className="incident-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="incident-title">{alert.alertType}</div>
                  <div className="incident-details">
                    <span className="engine-tag">{alert.engine}</span>
                    {alert.details?.ip_address && (
                      <span className="ip-tag">{alert.details.ip_address}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No recent critical incidents</div>
          )}
        </div>

        {/* Top Entities */}
        <div className="entities-panel">
          <h3>
            <Server size={20} />
            Top Flagged Entities
          </h3>
          {stats.topEntities && stats.topEntities.length > 0 ? (
            <div className="entities-list">
              {stats.topEntities.slice(0, 10).map((entity, idx) => (
                <div key={idx} className="entity-item">
                  <div className="entity-rank">{idx + 1}</div>
                  <div className="entity-info">
                    <div className="entity-name">{entity._id || 'Unknown'}</div>
                    <div className="entity-stats">
                      <span>{entity.count} alerts</span>
                      <span>•</span>
                      <span>{entity.maxSeverity || 'N/A'} severity</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">No flagged entities</div>
          )}
        </div>
      </div>

      {/* Engine Summary Panel */}
      <div className="engine-summary-panel">
        <h3>
          <Activity size={20} />
          Detection Engine Summary
        </h3>
        <div className="engine-summary-grid">
          {stats.engineActivity && stats.engineActivity.length > 0 ? (
            stats.engineActivity.map((engine, idx) => (
              <div key={idx} className="engine-summary-card">
                <div className="engine-name">{engine._id}</div>
                <div className="engine-total">{engine.total}</div>
                <div className="engine-breakdown">
                  {engine.critical > 0 && (
                    <span className="breakdown-item critical">
                      {engine.critical} Critical
                    </span>
                  )}
                  {engine.high > 0 && (
                    <span className="breakdown-item high">
                      {engine.high} High
                    </span>
                  )}
                  {engine.medium > 0 && (
                    <span className="breakdown-item medium">
                      {engine.medium} Medium
                    </span>
                  )}
                  {engine.low > 0 && (
                    <span className="breakdown-item low">
                      {engine.low} Low
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">No engine activity data</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
