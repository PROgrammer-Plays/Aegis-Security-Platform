// src/pages/Forensics.js - FIXED with Authentication
import React, { useState, useEffect, useCallback } from 'react';
import './Forensics.css';

function Forensics() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    severity: '',
    engine: '',
    startDate: '',
    endDate: ''
  });
  const [selectedAlert, setSelectedAlert] = useState(null);

  const token = localStorage.getItem('token');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: 100,
        ...filters,
        search: searchTerm
      });
      
      // FIXED: Added Authorization header
      const response = await fetch(`http://localhost:5000/api/alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.clear();
          window.location.href = '/';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setAlerts(data.alerts || []);
      console.log(`✅ Loaded ${data.alerts?.length || 0} alerts for forensics`);
    } catch (error) {
      console.error('❌ Forensics error:', error);
    }
    setLoading(false);
  }, [filters, searchTerm, token]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAlerts();
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      severity: '',
      engine: '',
      startDate: '',
      endDate: ''
    });
    setSearchTerm('');
  };

  return (
    <div className="forensics-page">
      {/* Header */}
      <div className="forensics-header">
        <h1>🔍 Forensics & Historical Search</h1>
        <p className="header-subtitle">Search and analyze security events</p>
        <button className="refresh-btn" onClick={fetchAlerts}>
          🔄 Refresh
        </button>
      </div>

      {/* Search & Filters */}
      <div className="search-panel">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by IP, User ID, Alert Type, or Engine..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">🔍 Search</button>
        </form>

        <div className="filters-row">
          <select
            value={filters.severity}
            onChange={(e) => handleFilterChange('severity', e.target.value)}
            className="filter-select"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={filters.engine}
            onChange={(e) => handleFilterChange('engine', e.target.value)}
            className="filter-select"
          >
            <option value="">All Engines</option>
            <option value="IDS">IDS Engine</option>
            <option value="Traffic">Traffic Engine</option>
            <option value="UEBA">UEBA Engine</option>
            <option value="Artifact">Artifact Engine</option>
            <option value="Threat Intelligence">Threat Intelligence</option>
            <option value="CORRELATION BRAIN">Correlation Brain</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="filter-date"
            placeholder="Start Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="filter-date"
            placeholder="End Date"
          />

          <button onClick={clearFilters} className="clear-btn">
            ✖ Clear
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        <span className="results-count">
          Found {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Results Table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Searching...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <p>🔍 No alerts found</p>
          <p className="empty-hint">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="forensics-table-container">
          <table className="forensics-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>Engine</th>
                <th>Alert Type</th>
                <th>Target</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert._id} className={`severity-${alert.severity?.toLowerCase()}`}>
                  <td className="timestamp-cell">
                    {new Date(alert.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className={`severity-badge severity-${alert.severity?.toLowerCase()}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="engine-cell">{alert.engine}</td>
                  <td className="alert-type-cell">{alert.alertType}</td>
                  <td className="target-cell">
                    {alert.details?.ip_address || alert.details?.target_entity || alert.details?.source_ip || '-'}
                  </td>
                  <td>
                    <span className={`status-badge status-${(alert.status || 'New').toLowerCase().replace(' ', '-')}`}>
                      {alert.status || 'New'}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="view-btn"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      👁️ View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content forensics-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Alert Details</h2>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>×</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="detail-label">Engine:</span>
                    <span className="detail-value">{selectedAlert.engine}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Alert Type:</span>
                    <span className="detail-value">{selectedAlert.alertType}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Severity:</span>
                    <span className={`severity-badge severity-${selectedAlert.severity?.toLowerCase()}`}>
                      {selectedAlert.severity}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Timestamp:</span>
                    <span className="detail-value">{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge status-${(selectedAlert.status || 'New').toLowerCase().replace(' ', '-')}`}>
                      {selectedAlert.status || 'New'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Technical Details</h3>
                <div className="json-details">
                  <pre>{JSON.stringify(selectedAlert.details, null, 2)}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Forensics;