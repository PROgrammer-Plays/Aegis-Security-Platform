// src/pages/AdminDashboard.js - High-level Overview for Admins
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Users, Activity, AlertTriangle, 
  TrendingUp, Server, Eye
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import './AdminDashboard.css';

const SEVERITY_COLORS = {
  'Critical': '#ff4444',
  'High': '#ff8800',
  'Medium': '#ffbb33',
  'Low': '#00C851'
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(24);

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch stats
      const statsRes = await fetch(`http://localhost:5000/api/stats?hours=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      setStats(statsData);
      
      // Fetch users
      const usersRes = await fetch('http://localhost:5000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      setUsers(usersData.users || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="spinner"></div>
        <p>Loading Executive Dashboard...</p>
      </div>
    );
  }

  const overview = stats?.overview || { total: 0, recent: 0, criticalCount: 0, incidentCount: 0 };
  const severityData = (stats?.severity || []).map(s => ({
    name: s._id,
    value: s.count,
    color: SEVERITY_COLORS[s._id]
  }));
  const engineData = (stats?.engines || []).map(e => ({
    name: e._id?.replace(' Engine', '') || 'Unknown',
    value: e.count
  }));

  // User stats
  const userStats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    seniors: users.filter(u => u.role === 'senior').length,
    employees: users.filter(u => u.role === 'employee').length,
    active: users.filter(u => u.isActive).length
  };

  // System health
  const systemHealth = overview.recent > 0 
    ? Math.round((1 - (overview.criticalCount / overview.recent)) * 100)
    : 100;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <Shield size={40} color="#00bcd4" />
          <div>
            <h1>Executive Security Dashboard</h1>
            <p>High-level security posture and system overview</p>
          </div>
        </div>
        <div className="time-selector">
          <button 
            className={timeRange === 1 ? 'active' : ''} 
            onClick={() => setTimeRange(1)}
          >
            1H
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
      </header>

      {/* Executive KPIs */}
      <div className="executive-kpis">
        <div className="kpi-card critical">
          <div className="kpi-icon">
            <AlertTriangle size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{overview.criticalCount}</div>
            <div className="kpi-label">Critical Threats</div>
            <div className="kpi-trend">Last {timeRange}h</div>
          </div>
        </div>

        <div className="kpi-card incidents">
          <div className="kpi-icon">
            <Activity size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{overview.incidentCount}</div>
            <div className="kpi-label">Active Incidents</div>
            <div className="kpi-trend">Correlation Brain</div>
          </div>
        </div>

        <div className="kpi-card health">
          <div className="kpi-icon">
            <Server size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{systemHealth}%</div>
            <div className="kpi-label">System Health</div>
            <div className="kpi-trend">
              {systemHealth >= 80 ? '✅ Nominal' : '⚠️ Degraded'}
            </div>
          </div>
        </div>

        <div className="kpi-card total">
          <div className="kpi-icon">
            <Eye size={32} />
          </div>
          <div className="kpi-content">
            <div className="kpi-value">{overview.recent}</div>
            <div className="kpi-label">Total Alerts</div>
            <div className="kpi-trend">Last {timeRange}h</div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="admin-charts">
        {/* Threat Distribution */}
        <div className="chart-card">
          <h3>Threat Severity Distribution</h3>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No data available</p>
          )}
        </div>

        {/* Detection Coverage */}
        <div className="chart-card">
          <h3>Detection Engine Coverage</h3>
          {engineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={engineData}>
                <XAxis dataKey="name" tick={{ fill: '#9aa0a6', fontSize: 12 }} />
                <YAxis tick={{ fill: '#9aa0a6' }} />
                <Tooltip 
                  contentStyle={{ 
                    background: '#1e2433', 
                    border: '1px solid #2d3748',
                    borderRadius: '8px',
                    color: '#e8eaed'
                  }}
                />
                <Bar dataKey="value" fill="#00bcd4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="no-data">No data available</p>
          )}
        </div>
      </div>

      {/* User Management Overview */}
      <div className="user-management-section">
        <div className="section-header">
          <h2>
            <Users size={24} />
            User Management Overview
          </h2>
          <button 
            className="manage-btn"
            onClick={() => window.location.href = '/users'}
          >
            Manage Users →
          </button>
        </div>

        <div className="user-stats-grid">
          <div className="user-stat-card">
            <div className="stat-value">{userStats.total}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="user-stat-card admin">
            <div className="stat-value">{userStats.admins}</div>
            <div className="stat-label">Administrators</div>
          </div>
          <div className="user-stat-card senior">
            <div className="stat-value">{userStats.seniors}</div>
            <div className="stat-label">Senior Analysts</div>
          </div>
          <div className="user-stat-card employee">
            <div className="stat-value">{userStats.employees}</div>
            <div className="stat-label">Employees</div>
          </div>
          <div className="user-stat-card active">
            <div className="stat-value">{userStats.active}</div>
            <div className="stat-label">Active Accounts</div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="recent-users">
          <h3>Recent User Activity</h3>
          <div className="users-list">
            {users.slice(0, 5).map(user => (
              <div key={user._id} className="user-item">
                <div className="user-info">
                  <div className="user-name">{user.fullName || user.username}</div>
                  <div className="user-meta">
                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                    {user.assigned_ip && (
                      <span className="ip-badge">{user.assigned_ip}</span>
                    )}
                  </div>
                </div>
                <div className="user-status">
                  {user.lastLogin ? (
                    <span className="last-login">
                      Last login: {new Date(user.lastLogin).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="never-logged">Never logged in</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Summary */}
      <div className="security-summary">
        <h2>
          <TrendingUp size={24} />
          Security Posture Summary
        </h2>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">🛡️</div>
            <div className="summary-content">
              <h4>Detection Coverage</h4>
              <p>{engineData.length} active detection engines monitoring traffic</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">⚡</div>
            <div className="summary-content">
              <h4>Correlation Engine</h4>
              <p>{overview.incidentCount} correlated incidents detected in last {timeRange}h</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">👥</div>
            <div className="summary-content">
              <h4>Team Status</h4>
              <p>{userStats.seniors} senior analysts and {userStats.employees} employees monitored</p>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">📊</div>
            <div className="summary-content">
              <h4>Alert Volume</h4>
              <p>{overview.recent} alerts processed in last {timeRange}h</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
