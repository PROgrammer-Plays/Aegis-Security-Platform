// src/pages/Forensics.js - Search & History
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: 100,
        ...filters,
        search: searchTerm
      });
      
      const response = await fetch(`http://localhost:5000/api/alerts?${params}`);
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
    setLoading(false);
  };

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
        <h1>🔍 Forensics & Search</h1>
        <button className="export-btn" onClick={fetchAlerts}>
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
          <button type="submit" className="search-btn">Search</button>
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
            <option value="IDS">IDS</option>
            <option value="Traffic Engine">Traffic Engine</option>
            <option value="UEBA">UEBA</option>
            <option value="Artifact Engine">Artifact Engine</option>
            <option value="Threat Intelligence">Threat Intelligence</option>
            <option value="CORRELATION BRAIN">Correlation Brain</option>
          </select>

          <input
            type="datetime-local"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="filter-date"
          />

          <input
            type="datetime-local"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="filter-date"
          />

          <button onClick={clearFilters} className="clear-btn">Clear</button>
        </div>
      </div>

      {/* Results */}
      <div className="forensics-content">
        {/* Table View */}
        <div className="table-container">
          <div className="table-header">
            <h3>Alert History ({alerts.length} results)</h3>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              <p>No alerts found matching your criteria</p>
            </div>
          ) : (
            <table className="forensics-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Severity</th>
                  <th>Engine</th>
                  <th>Alert Type</th>
                  <th>Entity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, idx) => (
                  <tr
                    key={alert._id || idx}
                    className={`severity-row-${alert.severity?.toLowerCase()}`}
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <td>{new Date(alert.timestamp).toLocaleString()}</td>
                    <td>
                      <span className={`severity-badge severity-${alert.severity?.toLowerCase()}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td>{alert.engine}</td>
                    <td>{alert.alertType}</td>
                    <td>
                      {alert.details?.ip_address || 
                       alert.details?.source_ip || 
                       alert.details?.user_id || 
                       alert.details?.target_entity || 
                       '-'}
                    </td>
                    <td>
                      <button className="view-btn">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Alert Details</h2>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Engine:</span>
                <span className="detail-value">{selectedAlert.engine}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
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
              <div className="detail-row full-width">
                <span className="detail-label">Details:</span>
                <pre className="detail-json">{JSON.stringify(selectedAlert.details, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Forensics;
