// src/App.js (Enhanced Version with All Features)
import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';
import AlertDetails from './components/AlertDetails';

const SOCKET_SERVER_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function App() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // Filter states
  const [severityFilter, setSeverityFilter] = useState('all');
  const [engineFilter, setEngineFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch historical alerts on mount
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(`${SOCKET_SERVER_URL}/api/alerts?limit=50`);
        const data = await response.json();
        setAlerts(data.alerts || []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching alerts:", error);
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${SOCKET_SERVER_URL}/api/alerts/stats/summary`);
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching statistics:", error);
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    
    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    });
    
    socket.on('new-alert', (newAlert) => {
      console.log('Received new alert:', newAlert);
      setAlerts(prevAlerts => [newAlert, ...prevAlerts]);
      
      // Update stats
      setStats(prev => prev ? {
        ...prev,
        total: prev.total + 1,
        recentLast24h: prev.recentLast24h + 1,
        bySeverity: {
          ...prev.bySeverity,
          [newAlert.severity]: (prev.bySeverity[newAlert.severity] || 0) + 1
        },
        byEngine: {
          ...prev.byEngine,
          [newAlert.engine]: (prev.byEngine[newAlert.engine] || 0) + 1
        }
      } : null);
      
      // Show browser notification if permitted
      if (Notification.permission === "granted") {
        new Notification(`${newAlert.severity} Alert`, {
          body: `${newAlert.engine}: ${newAlert.alertType}`,
          icon: '/alert-icon.png'
        });
      }
    });
    
    return () => { 
      socket.disconnect(); 
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleAlertClick = (alertId) => {
    setExpandedAlertId(currentId => currentId === alertId ? null : alertId);
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    // Severity filter
    if (severityFilter !== 'all' && alert.severity !== severityFilter) {
      return false;
    }
    
    // Engine filter
    if (engineFilter !== 'all' && alert.engine !== engineFilter) {
      return false;
    }
    
    // Search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        alert.alertType.toLowerCase().includes(searchLower) ||
        alert.engine.toLowerCase().includes(searchLower) ||
        JSON.stringify(alert.details).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Clear all filters
  const clearFilters = () => {
    setSeverityFilter('all');
    setEngineFilter('all');
    setSearchTerm('');
  };

  const hasActiveFilters = severityFilter !== 'all' || engineFilter !== 'all' || searchTerm !== '';

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-title">
            <h1>🛡️ AI-Based Security Monitoring</h1>
            <p className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
              <span className="status-indicator"></span>
              {isConnected ? 'Live' : 'Disconnected'}
            </p>
          </div>
          
          {stats && (
            <div className="header-stats">
              <div className="stat-card">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Alerts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.recentLast24h}</div>
                <div className="stat-label">Last 24h</div>
              </div>
              <div className="stat-card critical">
                <div className="stat-value">{stats.bySeverity?.Critical || 0}</div>
                <div className="stat-label">Critical</div>
              </div>
              <div className="stat-card high">
                <div className="stat-value">{stats.bySeverity?.High || 0}</div>
                <div className="stat-label">High</div>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="controls-container">
        <div className="filters">
          <div className="filter-group">
            <label>Severity:</label>
            <select 
              value={severityFilter} 
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Engine:</label>
            <select 
              value={engineFilter} 
              onChange={(e) => setEngineFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Engines</option>
              <option value="IDS">IDS</option>
              <option value="Traffic Engine">Traffic Engine</option>
              <option value="Threat Intelligence">Threat Intelligence</option>
              <option value="UEBA">UEBA</option>
              <option value="Artifact Engine">Artifact Engine</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          )}
        </div>

        <div className="results-info">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>
      
      <div className="alert-container">
        {loading ? (
          <div className="loading">Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="no-alerts">
            {hasActiveFilters ? (
              <p>No alerts match your filters.</p>
            ) : (
              <p>No alerts received yet. Waiting for security events...</p>
            )}
          </div>
        ) : (
          <ul className="alert-list">
            {filteredAlerts.map((alert) => (
              <li key={alert._id} 
                  className={`alert-item severity-${alert.severity.toLowerCase()}`}
                  onClick={() => handleAlertClick(alert._id)}>
                
                <div className="alert-summary">
                  <div className="alert-header">
                    <span className={`alert-engine engine-${alert.engine.replace(/\s+/g, '-').toLowerCase()}`}>
                      {alert.engine}
                    </span>
                    <span className="alert-timestamp">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="alert-body">
                    <div className="alert-title">
                      <span className={`severity-badge severity-${alert.severity.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                      <strong>{alert.alertType}</strong>
                    </div>
                    <div className="alert-preview">
                      {alert.details.ip_address && (
                        <span className="detail-chip">IP: {alert.details.ip_address}</span>
                      )}
                      {alert.details.threat_score && (
                        <span className="detail-chip">Score: {alert.details.threat_score}</span>
                      )}
                      {alert.details.reconstruction_error && (
                        <span className="detail-chip">
                          Error: {alert.details.reconstruction_error.toFixed(6)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="expand-indicator">
                    {expandedAlertId === alert._id ? '▼' : '▶'}
                  </div>
                </div>

                {expandedAlertId === alert._id && (
                  <div className="alert-details-container">
                    <AlertDetails alert={alert} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
