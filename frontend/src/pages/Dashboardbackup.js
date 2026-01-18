// src/pages/Dashboard.js - Enhanced SOC Dashboard
import React, { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  ShieldAlert, Activity, Server, AlertTriangle,
  TrendingUp, Users, Target, Zap
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

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/stats?hours=${timeRange}`);
      const data = await response.json();
      setStats(data);
      setLoading(false);
      console.log('📊 Dashboard stats updated');
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [timeRange]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading Command Center...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard-error">
        <AlertTriangle size={48} color="#ff4444" />
        <p>Failed to load dashboard statistics</p>
        <button onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  // Format data for charts
  const severityData = stats.severity.map(s => ({ 
    name: s._id, 
    value: s.count,
    color: SEVERITY_COLORS[s._id] 
  }));

  const engineData = stats.engines.map((s, idx) => ({ 
    name: s._id.replace(' Engine', ''), 
    value: s.count,
    color: CHART_COLORS[idx % CHART_COLORS.length]
  }));

  const trendData = stats.hourlyTrend.map(item => ({
    time: new Date(item._id).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    total: item.count,
    critical: item.critical || 0,
    high: item.high || 0
  }));

  // Calculate system health (inverse of critical percentage)
  const criticalCount = severityData.find(s => s.name === 'Critical')?.value || 0;
  const systemHealth = stats.overview.recent > 0 
    ? Math.round((1 - (criticalCount / stats.overview.recent)) * 100)
    : 100;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>🛡️ Security Operations Overview</h1>
          <p className="subtitle">Real-time threat intelligence and system monitoring</p>
        </div>
        
        <div className="dashboard-controls">
          <div className="time-selector">
            <button 
              className={timeRange === 1 ? 'active' : ''} 
              onClick={() => setTimeRange(1)}
            >
              1H
            </button>
            <button 
              className={timeRange === 6 ? 'active' : ''} 
              onClick={() => setTimeRange(6)}
            >
              6H
            </button>
            <button 
              className={timeRange === 24 ? 'active' : ''} 
              onClick={() => setTimeRange(24)}
            >
              24H
            </button>
            <button 
              className={timeRange === 168 ? 'active' : ''} 
              onClick={() => setTimeRange(168)}
            >
              7D
            </button>
          </div>
          
          <button 
            className={`refresh-btn ${autoRefresh ? 'active' : ''}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            🔄 {autoRefresh ? 'Auto' : 'Manual'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.2), rgba(0, 188, 212, 0.05))'}}>
            <Activity size={32} color="#00bcd4" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Alerts</div>
            <div className="kpi-value">{stats.overview.recent}</div>
            <div className="kpi-subtext">Last {timeRange}h</div>
          </div>
        </div>

        <div className="kpi-card critical-card">
          <div className="kpi-icon" style={{background: 'linear-gradient(135deg, rgba(255, 68, 68, 0.2), rgba(255, 68, 68, 0.05))'}}>
            <ShieldAlert size={32} color="#ff4444" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Critical Threats</div>
            <div className="kpi-value">{criticalCount}</div>
            <div className="kpi-subtext">Immediate action required</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{background: 'linear-gradient(135deg, rgba(255, 136, 0, 0.2), rgba(255, 136, 0, 0.05))'}}>
            <Zap size={32} color="#ff8800" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Active Incidents</div>
            <div className="kpi-value">{stats.overview.incidentCount}</div>
            <div className="kpi-subtext">Correlation Brain</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{background: 'linear-gradient(135deg, rgba(0, 200, 81, 0.2), rgba(0, 200, 81, 0.05))'}}>
            <Server size={32} color="#00C851" />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">System Health</div>
            <div className="kpi-value">{systemHealth}%</div>
            <div className="kpi-subtext">{systemHealth >= 80 ? 'Operational' : 'Degraded'}</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Severity Distribution */}
        <div className="chart-card">
          <h3>🎯 Threat Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={severityData} 
                dataKey="value" 
                nameKey="name" 
                cx="50%" 
                cy="50%" 
                outerRadius={90}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  background: '#1e2433', 
                  border: '1px solid #2d3748',
                  borderRadius: '8px' 
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Engine Activity */}
        <div className="chart-card">
          <h3>🔧 Detection Engine Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={engineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis 
                dataKey="name" 
                stroke="#9aa0a6"
                tick={{ fill: '#9aa0a6' }}
              />
              <YAxis 
                stroke="#9aa0a6"
                tick={{ fill: '#9aa0a6' }}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#1e2433', 
                  border: '1px solid #2d3748',
                  borderRadius: '8px',
                  color: '#e8eaed'
                }}
                cursor={{fill: '#252b3b'}}
              />
              <Bar dataKey="value" fill="#00bcd4" radius={[8, 8, 0, 0]}>
                {engineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Trend */}
        <div className="chart-card full-width">
          <h3>📈 Alert Trend Analysis (Last {timeRange}h)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis 
                dataKey="time" 
                stroke="#9aa0a6"
                tick={{ fill: '#9aa0a6', fontSize: 12 }}
              />
              <YAxis 
                stroke="#9aa0a6"
                tick={{ fill: '#9aa0a6' }}
              />
              <Tooltip 
                contentStyle={{ 
                  background: '#1e2433', 
                  border: '1px solid #2d3748',
                  borderRadius: '8px',
                  color: '#e8eaed'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#00bcd4" 
                strokeWidth={3}
                dot={{ r: 4 }}
                name="Total Alerts"
              />
              <Line 
                type="monotone" 
                dataKey="critical" 
                stroke="#ff4444" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Critical"
              />
              <Line 
                type="monotone" 
                dataKey="high" 
                stroke="#ff8800" 
                strokeWidth={2}
                dot={{ r: 3 }}
                name="High"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-grid">
        {/* Recent Critical Incidents */}
        <div className="incidents-panel">
          <h3>🚨 Recent Critical Alerts</h3>
          {stats.recentCritical.length === 0 ? (
            <p className="no-data">No critical alerts in this time period ✅</p>
          ) : (
            <div className="incidents-list">
              {stats.recentCritical.map((alert, idx) => (
                <div key={idx} className="incident-item">
                  <div className="incident-header">
                    <span className="incident-badge">CRITICAL</span>
                    <span className="incident-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="incident-title">{alert.alertType}</div>
                  <div className="incident-details">
                    <span className="engine-tag">{alert.engine}</span>
                    {alert.details?.ip_address && (
                      <span className="ip-tag">📍 {alert.details.ip_address}</span>
                    )}
                    {alert.details?.target_entity && (
                      <span className="ip-tag">🎯 {alert.details.target_entity}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Targeted Entities */}
        <div className="entities-panel">
          <h3>🎯 Most Targeted Entities</h3>
          {stats.topEntities.length === 0 ? (
            <p className="no-data">No entity data available</p>
          ) : (
            <div className="entities-list">
              {stats.topEntities.slice(0, 8).map((entity, idx) => (
                <div key={idx} className="entity-item">
                  <div className="entity-rank">#{idx + 1}</div>
                  <div className="entity-info">
                    <div className="entity-name">{entity._id}</div>
                    <div className="entity-stats">
                      <span>{entity.count} alerts</span>
                      <span className={`severity-badge severity-${entity.maxSeverity?.toLowerCase()}`}>
                        {entity.maxSeverity}
                      </span>
                      <span>{entity.engines.length} engines</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Engine Activity Summary */}
      {stats.engineActivity && stats.engineActivity.length > 0 && (
        <div className="engine-summary-panel">
          <h3>🔧 Engine Performance Summary</h3>
          <div className="engine-summary-grid">
            {stats.engineActivity.map((engine, idx) => (
              <div key={idx} className="engine-summary-card">
                <div className="engine-name">{engine._id}</div>
                <div className="engine-total">{engine.total} alerts</div>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
