// src/pages/Dashboard.js - Tactical Overview
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, PieChart, Pie, Cell, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import './Dashboard.css';

const COLORS = {
  Critical: '#ff4444',
  High: '#ff8800',
  Medium: '#ffbb33',
  Low: '#00C851'
};

function Dashboard({ stats, refreshStats }) {
  const [timeRange, setTimeRange] = useState(24);

  useEffect(() => {
    if (refreshStats) {
      refreshStats();
    }
  }, [timeRange]);

  if (!stats) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const { overview, severityCounts, engineCounts, hourlyTrend, topEntities, recentIncidents } = stats;

  // Prepare data for charts
  const severityData = Object.entries(severityCounts).map(([name, value]) => ({
    name,
    value,
    color: COLORS[name]
  }));

  const engineData = Object.entries(engineCounts).map(([name, value]) => ({
    name: name.replace(' Engine', ''),
    value
  }));

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>🛡️ AEGIS Command Center</h1>
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
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon critical">🚨</div>
          <div className="kpi-content">
            <div className="kpi-value">{overview.incidents}</div>
            <div className="kpi-label">Active Incidents</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon high">⚠️</div>
          <div className="kpi-content">
            <div className="kpi-value">{overview.recent}</div>
            <div className="kpi-label">Alerts ({timeRange}h)</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon info">📊</div>
          <div className="kpi-content">
            <div className="kpi-value">{overview.total}</div>
            <div className="kpi-label">Total Alerts</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon success">✅</div>
          <div className="kpi-content">
            <div className="kpi-value">
              {Math.round((1 - (severityCounts.Critical || 0) / overview.recent) * 100)}%
            </div>
            <div className="kpi-label">System Health</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Severity Distribution */}
        <div className="chart-card">
          <h3>Threat Severity Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={severityData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Engine Activity */}
        <div className="chart-card">
          <h3>Detection Engine Activity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={engineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
              />
              <Bar dataKey="value" fill="#00bcd4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Trend */}
        <div className="chart-card full-width">
          <h3>Alert Trend (Last {timeRange}h)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={hourlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="_id" 
                stroke="#888"
                tickFormatter={(value) => new Date(value).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              />
              <YAxis stroke="#888" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                labelFormatter={(value) => new Date(value).toLocaleString()}
              />
              <Line type="monotone" dataKey="count" stroke="#00bcd4" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-grid">
        {/* Recent Incidents */}
        <div className="incidents-panel">
          <h3>🚨 Recent Critical Incidents</h3>
          {recentIncidents.length === 0 ? (
            <p className="no-data">No critical incidents in this time period</p>
          ) : (
            <div className="incidents-list">
              {recentIncidents.map(incident => (
                <div key={incident._id} className="incident-item">
                  <div className="incident-header">
                    <span className="incident-badge">CRITICAL</span>
                    <span className="incident-time">
                      {new Date(incident.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="incident-title">{incident.alertType}</div>
                  <div className="incident-details">
                    Target: {incident.details.target_entity} | 
                    Risk: {incident.details.risk_score} | 
                    Engines: {incident.details.engine_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Entities */}
        <div className="entities-panel">
          <h3>🎯 Top Targeted Entities</h3>
          {topEntities.length === 0 ? (
            <p className="no-data">No entity data available</p>
          ) : (
            <div className="entities-list">
              {topEntities.map((entity, idx) => (
                <div key={idx} className="entity-item">
                  <div className="entity-rank">#{idx + 1}</div>
                  <div className="entity-info">
                    <div className="entity-name">{entity._id}</div>
                    <div className="entity-stats">
                      {entity.count} alerts | Severity: {entity.maxSeverity}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
