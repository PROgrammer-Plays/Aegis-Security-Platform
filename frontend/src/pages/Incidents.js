// src/pages/Incidents.js - Enhanced War Room with Better Filtering
import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, AlertOctagon, Clock, Activity, 
  XCircle, PlayCircle, Target, Zap, Shield
} from 'lucide-react';
import './Incidents.css';

const STATUS_OPTIONS = ['New', 'Investigating', 'Resolved', 'False Positive'];

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'resolved'
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Fetch incidents from backend
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/alerts?limit=200');
      const data = await response.json();
      
      // Filter for incidents: Correlation Brain OR Critical severity
      const filtered = (data.alerts || []).filter(alert => 
        alert.engine === "CORRELATION BRAIN" || 
        alert.severity === "Critical"
      );
      
      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setIncidents(filtered);
      console.log(`📊 Loaded ${filtered.length} incidents`);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIncidents();
    
    // Refresh every 15 seconds
    const interval = setInterval(fetchIncidents, 15000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Update incident status
  const updateStatus = async (id, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/alerts/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      // Update local state
      setIncidents(prev => prev.map(inc => 
        inc._id === id ? { ...inc, status: newStatus } : inc
      ));
      
      console.log(`✅ Updated incident ${id} to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  // Filter incidents based on selected filter
  const filteredIncidents = incidents.filter(incident => {
    const status = incident.status || 'New';
    
    switch(filter) {
      case 'active':
        return status !== 'Resolved' && status !== 'False Positive';
      case 'resolved':
        return status === 'Resolved' || status === 'False Positive';
      default:
        return true;
    }
  });

  // Get status badge color
  const getStatusColor = (status) => {
    switch(status) {
      case 'Resolved': return 'success';
      case 'Investigating': return 'warning';
      case 'False Positive': return 'info';
      default: return 'danger';
    }
  };

  // Get incident icon
  const getIncidentIcon = (incident) => {
    if (incident.engine === 'CORRELATION BRAIN') return <Zap size={20} />;
    return <Shield size={20} />;
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="incidents-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading incidents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="incidents-page">
      {/* Header */}
      <header className="incidents-header">
        <div className="header-content">
          <div className="header-title">
            <AlertOctagon size={32} color="#ff4444" />
            <div>
              <h1>Incident War Room</h1>
              <p>Manage and resolve high-priority threats</p>
            </div>
          </div>
          <button className="refresh-btn" onClick={fetchIncidents}>
            🔄 Refresh
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="incidents-stats">
        <div className="stat-card">
          <div className="stat-icon danger">
            <AlertOctagon size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{incidents.length}</div>
            <div className="stat-label">Total Incidents</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon warning">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {incidents.filter(i => !i.status || i.status === 'New' || i.status === 'Investigating').length}
            </div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {incidents.filter(i => i.status === 'Resolved').length}
            </div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon info">
            <Zap size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {incidents.filter(i => i.engine === 'CORRELATION BRAIN').length}
            </div>
            <div className="stat-label">Correlated</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''} 
          onClick={() => setFilter('all')}
        >
          All ({incidents.length})
        </button>
        <button 
          className={filter === 'active' ? 'active' : ''} 
          onClick={() => setFilter('active')}
        >
          Active ({incidents.filter(i => !i.status || i.status === 'New' || i.status === 'Investigating').length})
        </button>
        <button 
          className={filter === 'resolved' ? 'active' : ''} 
          onClick={() => setFilter('resolved')}
        >
          Resolved ({incidents.filter(i => i.status === 'Resolved' || i.status === 'False Positive').length})
        </button>
      </div>

      {/* Incidents Grid */}
      <div className="incidents-grid">
        {filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={64} color="#00C851" />
            <h3>All Clear!</h3>
            <p>
              {filter === 'resolved' 
                ? 'No resolved incidents yet'
                : 'No active incidents detected'}
            </p>
            <p className="empty-hint">
              Run simulation: <code>python detector.py simulation</code>
            </p>
          </div>
        ) : (
          filteredIncidents.map(incident => (
            <IncidentCard
              key={incident._id}
              incident={incident}
              onStatusUpdate={updateStatus}
              onViewDetails={() => setSelectedIncident(incident)}
              getStatusColor={getStatusColor}
              getIncidentIcon={getIncidentIcon}
            />
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusUpdate={updateStatus}
          getStatusColor={getStatusColor}
        />
      )}
    </div>
  );
};

// Incident Card Component
const IncidentCard = ({ incident, onStatusUpdate, onViewDetails, getStatusColor, getIncidentIcon }) => {
  const status = incident.status || 'New';
  const isResolved = status === 'Resolved' || status === 'False Positive';
  
  return (
    <div className={`incident-card ${isResolved ? 'resolved' : ''} ${incident.engine === 'CORRELATION BRAIN' ? 'correlation' : ''}`}>
      {/* Card Header */}
      <div className="card-header">
        <div className="card-title">
          {getIncidentIcon(incident)}
          <span>{incident.engine === 'CORRELATION BRAIN' ? 'CORRELATED INCIDENT' : 'CRITICAL ALERT'}</span>
        </div>
        <div className="card-meta">
          <Clock size={14} />
          {new Date(incident.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        <h3 className="incident-title">{incident.alertType}</h3>
        
        {/* Target Entity */}
        <div className="incident-target">
          <Target size={16} />
          <span>Target: </span>
          <span className="highlight">
            {incident.details?.target_entity || 
             incident.details?.ip_address || 
             incident.details?.source_ip ||
             incident.details?.user_id ||
             'Unknown'}
          </span>
        </div>

        {/* Correlation Details */}
        {incident.engine === 'CORRELATION BRAIN' && incident.details && (
          <div className="correlation-details">
            <div className="correlation-stats">
              <span className="stat-pill">Risk: {incident.details.risk_score}</span>
              <span className="stat-pill">Engines: {incident.details.engine_count}</span>
              <span className="stat-pill">Alerts: {incident.details.alert_count}</span>
            </div>
            
            {/* Attack Patterns */}
            {incident.details.attack_patterns && incident.details.attack_patterns.length > 0 && (
              <div className="attack-patterns">
                <strong>Attack Patterns:</strong>
                {incident.details.attack_patterns.map((pattern, idx) => (
                  <span key={idx} className="pattern-badge">{pattern}</span>
                ))}
              </div>
            )}
            
            {/* Attack Chain/Timeline */}
            {incident.details.timeline && incident.details.timeline.length > 0 && (
              <div className="attack-chain">
                <strong>Attack Chain:</strong>
                <ol className="timeline-list">
                  {incident.details.timeline.slice(0, 3).map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                  {incident.details.timeline.length > 3 && (
                    <li className="more-link" onClick={onViewDetails}>
                      +{incident.details.timeline.length - 3} more steps...
                    </li>
                  )}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Regular Alert Details */}
        {incident.engine !== 'CORRELATION BRAIN' && incident.details && (
          <div className="alert-details">
            <div className="detail-item">
              <span className="detail-label">Engine:</span>
              <span className="detail-value">{incident.engine}</span>
            </div>
            {incident.details.verdict && (
              <div className="detail-item">
                <span className="detail-label">Verdict:</span>
                <span className="detail-value">{incident.details.verdict}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="card-footer">
        <div className="status-section">
          <span className={`status-badge ${getStatusColor(status)}`}>
            {status}
          </span>
        </div>
        
        <div className="action-buttons">
          <button className="btn-view" onClick={onViewDetails}>
            View Details
          </button>
          
          {!isResolved && (
            <>
              <button 
                className="btn-investigate" 
                onClick={() => onStatusUpdate(incident._id, 'Investigating')}
                disabled={status === 'Investigating'}
              >
                <PlayCircle size={16} /> Investigate
              </button>
              
              <button 
                className="btn-resolve" 
                onClick={() => onStatusUpdate(incident._id, 'Resolved')}
              >
                <CheckCircle size={16} /> Resolve
              </button>
            </>
          )}
          
          {status === 'Investigating' && (
            <button 
              className="btn-false-positive" 
              onClick={() => onStatusUpdate(incident._id, 'False Positive')}
            >
              <XCircle size={16} /> False Positive
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Incident Detail Modal
const IncidentDetailModal = ({ incident, onClose, onStatusUpdate, getStatusColor }) => {
  const status = incident.status || 'New';
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content incident-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">
            <AlertOctagon size={24} color="#ff4444" />
            <h2>Incident Details</h2>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Basic Info */}
          <div className="detail-section">
            <h3>Overview</h3>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="label">Type:</span>
                <span className="value">{incident.alertType}</span>
              </div>
              <div className="detail-row">
                <span className="label">Engine:</span>
                <span className="value">{incident.engine}</span>
              </div>
              <div className="detail-row">
                <span className="label">Severity:</span>
                <span className={`value severity-${incident.severity?.toLowerCase()}`}>
                  {incident.severity}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Timestamp:</span>
                <span className="value">{new Date(incident.timestamp).toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="label">Status:</span>
                <span className={`status-badge ${getStatusColor(status)}`}>
                  {status}
                </span>
              </div>
            </div>
          </div>

          {/* Correlation Details */}
          {incident.engine === 'CORRELATION BRAIN' && incident.details && (
            <>
              <div className="detail-section">
                <h3>Correlation Analysis</h3>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="label">Target Entity:</span>
                    <span className="value highlight">{incident.details.target_entity}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Risk Score:</span>
                    <span className="value risk-score">{incident.details.risk_score}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Engines Involved:</span>
                    <span className="value">{incident.details.engine_count}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Total Alerts:</span>
                    <span className="value">{incident.details.alert_count}</span>
                  </div>
                </div>
              </div>

              {/* Attack Patterns */}
              {incident.details.attack_patterns && (
                <div className="detail-section">
                  <h3>Detected Attack Patterns</h3>
                  <div className="patterns-list">
                    {incident.details.attack_patterns.map((pattern, idx) => (
                      <div key={idx} className="pattern-item">
                        ⚡ {pattern}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Timeline */}
              {incident.details.timeline && (
                <div className="detail-section">
                  <h3>Complete Attack Timeline</h3>
                  <ol className="full-timeline">
                    {incident.details.timeline.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Engines Involved */}
              {incident.details.engines_involved && (
                <div className="detail-section">
                  <h3>Detection Engines</h3>
                  <div className="engines-list">
                    {incident.details.engines_involved.map((engine, idx) => (
                      <span key={idx} className="engine-badge">{engine}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Raw Details */}
          <div className="detail-section">
            <h3>Technical Details</h3>
            <pre className="json-details">
              {JSON.stringify(incident.details, null, 2)}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="detail-section">
            <h3>Actions</h3>
            <div className="status-actions">
              {STATUS_OPTIONS.map(newStatus => (
                <button
                  key={newStatus}
                  className={`status-action-btn ${status === newStatus ? 'active' : ''}`}
                  onClick={() => {
                    onStatusUpdate(incident._id, newStatus);
                    setTimeout(onClose, 500);
                  }}
                  disabled={status === newStatus}
                >
                  {newStatus}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Incidents;
