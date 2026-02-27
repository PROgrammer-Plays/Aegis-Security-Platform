// src/pages/Incidents.js - SMART War Room with Correlation-Aware Resolution
import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, AlertOctagon, Clock, Activity, 
  XCircle, PlayCircle, Target, Zap, Shield, AlertTriangle
} from 'lucide-react';
import './Incidents.css';

const STATUS_OPTIONS = ['New', 'In Progress', 'Resolved', 'False Positive'];

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); //  'all' = Correlation only, 'active' = Engine alerts, 'resolved' = All resolved
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const token = localStorage.getItem('token');

  // Fetch incidents from backend
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching incidents...');
      
      const response = await fetch('http://localhost:5000/api/alerts?limit=200', {
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
      
      const filtered = (data.alerts || []).filter(alert => 
        alert.engine === "CORRELATION BRAIN" || 
        alert.severity === "Critical" ||
        alert.severity === "High"
      );
      
      filtered.sort((a, b) => {
        if (a.engine === 'CORRELATION BRAIN' && b.engine !== 'CORRELATION BRAIN') return -1;
        if (a.engine !== 'CORRELATION BRAIN' && b.engine === 'CORRELATION BRAIN') return 1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      setIncidents(filtered);
      console.log(`✅ Loaded ${filtered.length} incidents`);
    } catch (error) {
      console.error('❌ Error:', error);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 15000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Find related engine alerts for a correlation incident
  const findRelatedAlerts = (correlationIncident) => {
    if (correlationIncident.engine !== 'CORRELATION BRAIN') return [];
    
    const targetEntity = correlationIncident.details?.target_entity;
    if (!targetEntity) return [];
    
    return incidents.filter(inc => 
      inc.engine !== 'CORRELATION BRAIN' &&
      (inc.details?.ip_address === targetEntity ||
       inc.details?.source_ip === targetEntity ||
       inc.details?.target_entity === targetEntity)
    );
  };

  // Find parent correlation incidents for an engine alert
  const findParentCorrelations = (alert) => {
    if (alert.engine === 'CORRELATION BRAIN') return [];
    
    const targetEntity = alert.details?.ip_address || 
                        alert.details?.source_ip || 
                        alert.details?.target_entity;
    
    if (!targetEntity) return [];
    
    return incidents.filter(inc => 
      inc.engine === 'CORRELATION BRAIN' &&
      inc.details?.target_entity === targetEntity &&
      inc.status !== 'Resolved' &&
      inc.status !== 'False Positive'
    );
  };

  // Main status update function with cascade logic
  const updateStatus = async (id, newStatus, skipConfirm = false) => {
    try {
      const incident = incidents.find(inc => inc._id === id);
      if (!incident) return;

      // CASE 1: Resolving Correlation Brain → Cascade to related alerts
      if (incident.engine === 'CORRELATION BRAIN' && 
          (newStatus === 'Resolved' || newStatus === 'False Positive') &&
          !skipConfirm) {
        
        const relatedAlerts = findRelatedAlerts(incident);
        
        if (relatedAlerts.length > 0) {
          setConfirmDialog({
            incident,
            newStatus,
            relatedAlerts,
            message: `This will also mark ${relatedAlerts.length} related alert${relatedAlerts.length > 1 ? 's' : ''} as ${newStatus}. Continue?`
          });
          return;
        }
      }

      // Update the main incident
      await performUpdate(id, newStatus);
      
      // CASE 2: Resolved engine alert → Check if parent correlation should auto-resolve
      if (incident.engine !== 'CORRELATION BRAIN' && 
          (newStatus === 'Resolved' || newStatus === 'False Positive')) {
        
        const parentCorrelations = findParentCorrelations(incident);
        
        for (const correlation of parentCorrelations) {
          const relatedAlerts = findRelatedAlerts(correlation);
          
          // Check if ALL related alerts are now resolved
          const allResolved = relatedAlerts.every(alert => 
            alert._id === id || 
            alert.status === 'Resolved' || 
            alert.status === 'False Positive'
          );
          
          if (allResolved) {
            console.log(`🎯 Auto-resolving correlation ${correlation._id}`);
            await performUpdate(correlation._id, 'Resolved');
            alert('✅ All related alerts resolved. Correlation incident auto-resolved.');
          }
        }
      }
      
      alert(`✅ Incident marked as ${newStatus}`);
      await fetchIncidents(); // Refresh
    } catch (error) {
      console.error('❌ Update failed:', error);
      alert('❌ Failed to update. Please try again.');
    }
  };

  // Perform the actual API update
  const performUpdate = async (id, newStatus) => {
    const response = await fetch(`http://localhost:5000/api/alerts/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });
    
    if (!response.ok) throw new Error(`Update failed: ${response.status}`);
    
    setIncidents(prev => prev.map(inc => 
      inc._id === id ? { ...inc, status: newStatus } : inc
    ));
  };

  // Handle cascade resolution from confirmation dialog
  const handleCascadeResolve = async () => {
    if (!confirmDialog) return;
    
    const { incident, newStatus, relatedAlerts } = confirmDialog;
    
    try {
      // Resolve correlation
      await performUpdate(incident._id, newStatus);
      
      // Resolve all related
      for (const alert of relatedAlerts) {
        await performUpdate(alert._id, newStatus);
      }
      
      alert(`✅ Resolved correlation and ${relatedAlerts.length} related alert${relatedAlerts.length > 1 ? 's' : ''}`);
      setConfirmDialog(null);
      await fetchIncidents();
    } catch (error) {
      console.error('❌ Cascade failed:', error);
      alert('❌ Failed to resolve related alerts');
      setConfirmDialog(null);
    }
  };

  // SMART FILTERING
  const filteredIncidents = incidents.filter(incident => {
    const status = incident.status || 'New';
    
    switch(filter) {
      case 'all':
        // Show ONLY Correlation Brain incidents (not resolved)
        return incident.engine === 'CORRELATION BRAIN' &&
               status !== 'Resolved' && 
               status !== 'False Positive';
               
      case 'active':
        // Show individual engine alerts (not resolved)
        return incident.engine !== 'CORRELATION BRAIN' &&
               status !== 'Resolved' && 
               status !== 'False Positive';
               
      case 'resolved':
        // Show all resolved incidents
        return status === 'Resolved' || status === 'False Positive';
        
      default:
        return true;
    }
  });

  // Stats
  const correlationCount = incidents.filter(i => 
    i.engine === 'CORRELATION BRAIN' && i.status !== 'Resolved' && i.status !== 'False Positive'
  ).length;
  
  const activeCount = incidents.filter(i => 
    i.engine !== 'CORRELATION BRAIN' && i.status !== 'Resolved' && i.status !== 'False Positive'
  ).length;
  
  const resolvedCount = incidents.filter(i => 
    i.status === 'Resolved' || i.status === 'False Positive'
  ).length;

  const getStatusColor = (status) => {
    switch(status) {
      case 'Resolved': return 'success';
      case 'In Progress': return 'warning';
      case 'Review Requested': return 'info';
      case 'False Positive': return 'info';
      default: return 'danger';
    }
  };

  const getIncidentIcon = (incident) => {
    if (incident.engine === 'CORRELATION BRAIN') return <Zap size={20} />;
    return incident.severity === 'Critical' ? <AlertOctagon size={20} /> : <Shield size={20} />;
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="incidents-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading War Room...</p>
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

      {/* Stats */}
      <div className="incidents-stats">
        <div className="stat-card">
          <div className="stat-icon danger"><AlertOctagon size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{incidents.length}</div>
            <div className="stat-label">Total Incidents</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><Activity size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><CheckCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{resolvedCount}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info"><Zap size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{correlationCount}</div>
            <div className="stat-label">Correlated</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-tabs">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          Correlation ({correlationCount})
        </button>
        <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>
          Active Alerts ({activeCount})
        </button>
        <button className={filter === 'resolved' ? 'active' : ''} onClick={() => setFilter('resolved')}>
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Grid */}
      <div className="incidents-grid">
        {filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={64} color="#00C851" />
            <h3>All Clear!</h3>
            <p>
              {filter === 'resolved' ? 'No resolved incidents yet' :
               filter === 'active' ? 'No active engine alerts' :
               'No correlation incidents'}
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
              relatedCount={incident.engine === 'CORRELATION BRAIN' ? findRelatedAlerts(incident).length : 0}
            />
          ))
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle size={32} color="#ff8800" />
              <h2>Confirm Cascade Resolution</h2>
            </div>
            <div className="modal-body">
              <p className="confirm-message">{confirmDialog.message}</p>
              
              <div className="related-alerts-preview">
                <h4>Related Alerts:</h4>
                {confirmDialog.relatedAlerts.map(alert => (
                  <div key={alert._id} className="related-alert-item">
                    <span className={`severity-badge severity-${alert.severity?.toLowerCase()}`}>
                      {alert.severity}
                    </span>
                    <span className="alert-engine">{alert.engine}</span>
                    <span className="alert-type">{alert.alertType}</span>
                  </div>
                ))}
              </div>
              
              <div className="confirm-actions">
                <button className="btn-cancel" onClick={() => setConfirmDialog(null)}>
                  Cancel
                </button>
                <button className="btn-confirm" onClick={handleCascadeResolve}>
                  ✅ Resolve All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusUpdate={updateStatus}
          getStatusColor={getStatusColor}
          relatedAlerts={selectedIncident.engine === 'CORRELATION BRAIN' ? findRelatedAlerts(selectedIncident) : []}
        />
      )}
    </div>
  );
};

// Incident Card
const IncidentCard = ({ incident, onStatusUpdate, onViewDetails, getStatusColor, getIncidentIcon, relatedCount }) => {
  const status = incident.status || 'New';
  const isResolved = status === 'Resolved' || status === 'False Positive';
  
  return (
    <div className={`incident-card ${isResolved ? 'resolved' : ''} ${incident.engine === 'CORRELATION BRAIN' ? 'correlation' : ''}`}>
      <div className="card-header">
        <div className="card-title">
          {getIncidentIcon(incident)}
          <span className="title-text">
            {incident.engine === 'CORRELATION BRAIN' ? 'CORRELATION BRAIN' : incident.engine}
          </span>
          {relatedCount > 0 && (
            <span className="related-count-badge">+{relatedCount}</span>
          )}
        </div>
        <div className="card-meta">
          <span className={`severity-badge severity-${incident.severity?.toLowerCase()}`}>
            {incident.severity}
          </span>
          <Clock size={14} />
          <span>{new Date(incident.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="card-body">
        <h3 className="incident-title">{incident.alertType}</h3>
        
        {(incident.details?.ip_address || incident.details?.target_entity) && (
          <div className="incident-target">
            <Target size={16} />
            <span className="highlight">
              {incident.details.ip_address || incident.details.target_entity}
            </span>
          </div>
        )}

        {incident.engine === 'CORRELATION BRAIN' && incident.details && (
          <div className="correlation-details">
            <div className="correlation-stats">
              <span className="stat-pill">Risk: {incident.details.risk_score}</span>
              <span className="stat-pill">Engines: {incident.details.engine_count}</span>
              <span className="stat-pill">Alerts: {incident.details.alert_count}</span>
            </div>
          </div>
        )}
      </div>

      <div className="card-footer">
        <span className={`status-badge ${getStatusColor(status)}`}>{status}</span>
        
        <div className="action-buttons">
          <button className="btn-view" onClick={onViewDetails}>👁️ View</button>
          
          {!isResolved && status === 'New' && (
            <button className="btn-investigate" onClick={() => onStatusUpdate(incident._id, 'In Progress')}>
              🔍 Investigate
            </button>
          )}
          
          {status === 'In Progress' && (
            <>
              <button className="btn-resolve" onClick={() => onStatusUpdate(incident._id, 'Resolved')}>
                ✅ Resolve
              </button>
              <button className="btn-false-positive" onClick={() => onStatusUpdate(incident._id, 'False Positive')}>
                ❌ False Positive
              </button>
            </>
          )}
          
          {isResolved && status !== 'Resolved' && (
            <button className="btn-investigate" onClick={() => onStatusUpdate(incident._id, 'In Progress')}>
              🔄 Re-investigate
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Detail Modal (simplified for space)
const IncidentDetailModal = ({ incident, onClose, onStatusUpdate, getStatusColor, relatedAlerts }) => {
  const status = incident.status || 'New';
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content incident-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Incident Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-section">
            <h3>Information</h3>
            <div className="detail-grid">
              <div><strong>Engine:</strong> {incident.engine}</div>
              <div><strong>Type:</strong> {incident.alertType}</div>
              <div><strong>Severity:</strong> <span className={`severity-badge severity-${incident.severity?.toLowerCase()}`}>{incident.severity}</span></div>
              <div><strong>Status:</strong> <span className={`status-badge ${getStatusColor(status)}`}>{status}</span></div>
            </div>
          </div>
          
          {relatedAlerts && relatedAlerts.length > 0 && (
            <div className="detail-section">
              <h3>Related Alerts ({relatedAlerts.length})</h3>
              {relatedAlerts.map(alert => (
                <div key={alert._id} className="related-alert-item">
                  <span className={`severity-badge severity-${alert.severity?.toLowerCase()}`}>{alert.severity}</span>
                  <span>{alert.engine} - {alert.alertType}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="detail-section">
            <h3>Actions</h3>
            <div className="status-actions">
              {STATUS_OPTIONS.map(option => (
                <button
                  key={option}
                  className={`status-action-btn ${status === option ? 'active' : ''}`}
                  onClick={() => { onStatusUpdate(incident._id, option); onClose(); }}
                  disabled={status === option}
                >
                  {option}
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