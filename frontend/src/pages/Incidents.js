// src/pages/Incidents.js - The ULTIMATE War Room (AI + Cascade Resolution)
import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle, AlertOctagon, Clock, Activity, 
  XCircle, Target, Zap, Shield, AlertTriangle, Brain
} from 'lucide-react';
import AIAnalyst from '../components/AIAnalyst';
import './Incidents.css';

const STATUS_OPTIONS = ['New', 'In Progress', 'Resolved', 'False Positive'];

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' = Correlation only, 'active' = Engine alerts, 'resolved' = All resolved
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  // --- AI ANALYST STATE ---
  const [showAIAnalyst, setShowAIAnalyst] = useState(false);
  const [aiAnalystAlert, setAIAnalystAlert] = useState(null);
  const [isAIMinimized, setIsAIMinimized] = useState(false);

  const token = localStorage.getItem('token');

  // Fetch incidents from backend
  const fetchIncidents = useCallback(async () => {
    try {
      // Don't show loading spinner on refresh to keep UI stable
      // setLoading(true); 
      console.log('🔍 Fetching incidents...');
      
      const response = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/alerts?limit=200', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // localStorage.clear(); // Commented out to prevent aggressive logout
          // window.location.href = '/';
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
        // Priority sort: Correlation -> Critical -> Timestamp
        if (a.engine === 'CORRELATION BRAIN' && b.engine !== 'CORRELATION BRAIN') return -1;
        if (a.engine !== 'CORRELATION BRAIN' && b.engine === 'CORRELATION BRAIN') return 1;
        if (a.severity === 'Critical' && b.severity !== 'Critical') return -1;
        if (a.severity !== 'Critical' && b.severity === 'Critical') return 1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
      
      setIncidents(filtered);
    } catch (error) {
      console.error('❌ Error:', error);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 15000); // Auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  // Find related engine alerts for a correlation incident
  const findRelatedAlerts = (correlationIncident) => {
    if (correlationIncident.engine !== 'CORRELATION BRAIN') return [];
    
    const targetEntity = correlationIncident.details?.target_entity || correlationIncident.details?.ip_address;
    if (!targetEntity) return [];
    
    return incidents.filter(inc => 
      inc.engine !== 'CORRELATION BRAIN' &&
      (inc.details?.ip_address === targetEntity ||
       inc.details?.source_ip === targetEntity ||
       inc.details?.target_entity === targetEntity)
    );
  };

  // Main status update function
  const updateStatus = async (id, newStatus, skipConfirm = false) => {
    try {
      const incident = incidents.find(inc => inc._id === id);
      if (!incident) return;

      // Check for Cascade Resolution Opportunity
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

      await performUpdate(id, newStatus);
      
      // OPTIONAL: Implement Cascade-Up logic here if needed (Alert -> Incident)
      
      await fetchIncidents(); // Refresh UI
    } catch (error) {
      console.error('❌ Update failed:', error);
    }
  };

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

  const handleCascadeResolve = async () => {
    if (!confirmDialog) return;
    
    const { incident, newStatus, relatedAlerts } = confirmDialog;
    
    try {
      await performUpdate(incident._id, newStatus);
      for (const alert of relatedAlerts) {
        await performUpdate(alert._id, newStatus);
      }
      
      setConfirmDialog(null);
      await fetchIncidents();
    } catch (error) {
      console.error('❌ Cascade failed:', error);
      setConfirmDialog(null);
    }
  };

  // --- AI ANALYST HANDLER ---
  const handleOpenAI = (e, alert) => {
    e.stopPropagation(); // Prevent card click
    setAIAnalystAlert(alert);
    setShowAIAnalyst(true);
    setIsAIMinimized(false);
  };

  // SMART FILTERING logic
  const filteredIncidents = incidents.filter(incident => {
    const status = incident.status || 'New';
    
    switch(filter) {
      case 'all': // Correlation Only (Main View)
        return incident.engine === 'CORRELATION BRAIN' && status !== 'Resolved' && status !== 'False Positive';
      case 'active': // Raw Engine Alerts
        return incident.engine !== 'CORRELATION BRAIN' && status !== 'Resolved' && status !== 'False Positive';
      case 'resolved': // History
        return status === 'Resolved' || status === 'False Positive';
      default: return true;
    }
  });

  // Count Stats
  const correlationCount = incidents.filter(i => i.engine === 'CORRELATION BRAIN' && i.status !== 'Resolved' && i.status !== 'False Positive').length;
  const activeCount = incidents.filter(i => i.engine !== 'CORRELATION BRAIN' && i.status !== 'Resolved' && i.status !== 'False Positive').length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved' || i.status === 'False Positive').length;

  const getStatusColor = (status) => {
    switch(status) {
      case 'Resolved': return 'success';
      case 'In Progress': return 'warning';
      case 'Review Requested': return 'info';
      case 'False Positive': return 'secondary';
      default: return 'danger';
    }
  };

  const getIncidentIcon = (incident) => {
    if (incident.engine === 'CORRELATION BRAIN') return <Zap size={20} color="#ffeb3b"/>;
    return incident.severity === 'Critical' ? <AlertOctagon size={20} color="#ff4444"/> : <Shield size={20} color="#00bcd4"/>;
  };

  if (loading && incidents.length === 0) {
    return <div className="incidents-page loading-center"><div className="spinner"></div><p>Connecting to War Room...</p></div>;
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
              <p>Manage, Analyze, and Resolve High-Priority Threats</p>
            </div>
          </div>
          <button className="refresh-btn" onClick={fetchIncidents}>🔄 Refresh</button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="incidents-stats">
        <div className="stat-card">
          <div className="stat-icon info"><Zap size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{correlationCount}</div>
            <div className="stat-label">Active Incidents</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><Activity size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Raw Alerts</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><CheckCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{resolvedCount}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          ⚡ Correlated Incidents ({correlationCount})
        </button>
        <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>
          🛡️ Raw Alerts ({activeCount})
        </button>
        <button className={filter === 'resolved' ? 'active' : ''} onClick={() => setFilter('resolved')}>
          ✅ History ({resolvedCount})
        </button>
      </div>

      {/* Main Grid */}
      <div className="incidents-grid">
        {filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={64} color="#00C851" />
            <h3>All Systems Operational</h3>
            <p>{filter === 'resolved' ? 'No history available.' : 'No active threats detected.'}</p>
          </div>
        ) : (
          filteredIncidents.map(incident => (
            <IncidentCard
              key={incident._id}
              incident={incident}
              onStatusUpdate={updateStatus}
              onViewDetails={() => setSelectedIncident(incident)}
              onOpenAI={handleOpenAI} // Passing the AI handler down
              getStatusColor={getStatusColor}
              getIncidentIcon={getIncidentIcon}
              relatedCount={incident.engine === 'CORRELATION BRAIN' ? findRelatedAlerts(incident).length : 0}
            />
          ))
        )}
      </div>

      {/* --- CONFIRMATION MODAL (Cascade) --- */}
      {confirmDialog && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <AlertTriangle size={32} color="#ff8800" />
              <h2>Confirm Mass Resolution</h2>
            </div>
            <div className="modal-body">
              <p className="confirm-message">{confirmDialog.message}</p>
              
              <div className="related-alerts-preview">
                <h4>Affected Alerts:</h4>
                {confirmDialog.relatedAlerts.map(alert => (
                  <div key={alert._id} className="related-alert-item">
                    <span className={`severity-badge severity-${alert.severity?.toLowerCase()}`}>
                      {alert.severity}
                    </span>
                    <span>{alert.engine}: {alert.alertType}</span>
                  </div>
                ))}
              </div>
              
              <div className="confirm-actions">
                <button className="btn-cancel" onClick={() => setConfirmDialog(null)}>Cancel</button>
                <button className="btn-confirm" onClick={handleCascadeResolve}>✅ Execute</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- INCIDENT DETAIL MODAL --- */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusUpdate={updateStatus}
          onOpenAI={(e) => handleOpenAI(e, selectedIncident)}
          getStatusColor={getStatusColor}
          relatedAlerts={selectedIncident.engine === 'CORRELATION BRAIN' ? findRelatedAlerts(selectedIncident) : []}
        />
      )}

      {/* --- AI ANALYST FLOATING PANEL --- */}
      {showAIAnalyst && aiAnalystAlert && (
        <AIAnalyst
          alert={aiAnalystAlert}
          onClose={() => setShowAIAnalyst(false)}
          isMinimized={isAIMinimized}
          onToggleMinimize={() => setIsAIMinimized(!isAIMinimized)}
        />
      )}
    </div>
  );
};

// --- Sub-Components ---

const IncidentCard = ({ incident, onStatusUpdate, onViewDetails, onOpenAI, getStatusColor, getIncidentIcon, relatedCount }) => {
  const status = incident.status || 'New';
  const isResolved = status === 'Resolved' || status === 'False Positive';
  
  return (
    <div className={`incident-card ${isResolved ? 'resolved' : ''} ${incident.engine === 'CORRELATION BRAIN' ? 'correlation' : ''}`}>
      <div className="card-header">
        <div className="card-title">
          {getIncidentIcon(incident)}
          <span className="title-text">
            {incident.engine === 'CORRELATION BRAIN' ? 'INCIDENT' : incident.engine}
          </span>
          {relatedCount > 0 && <span className="related-count-badge">+{relatedCount} Events</span>}
        </div>
        <div className="card-meta">
          <Clock size={14} />
          <span>{new Date(incident.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="card-body">
        <h3 className="incident-title">{incident.alertType}</h3>
        <div className="incident-target">
          <Target size={16} color="#aaa"/>
          <span className="highlight">
            {incident.details?.ip_address || incident.details?.target_entity || incident.details?.source_ip || "Unknown"}
          </span>
        </div>

        {incident.details?.risk_score && (
          <div className="risk-bar-container">
             <div className="risk-bar" style={{width: `${Math.min(incident.details.risk_score, 100)}%`}}></div>
          </div>
        )}
      </div>

      <div className="card-footer">
        <span className={`status-badge ${getStatusColor(status)}`}>{status}</span>
        
        <div className="action-buttons">
          {/* AI Button on Card */}
          <button className="btn-ai-small" onClick={(e) => { e.stopPropagation(); onOpenAI(e, incident); }} title="Analyze with AI">
            <Brain size={16} />
          </button>
          
          <button className="btn-view" onClick={onViewDetails}>Details</button>
          
          {!isResolved && status === 'New' && (
            <button className="btn-investigate" onClick={() => onStatusUpdate(incident._id, 'In Progress')}>
              Investigate
            </button>
          )}
          
          {status === 'In Progress' && (
            <>
              <button className="btn-resolve" onClick={() => onStatusUpdate(incident._id, 'Resolved')}>
                Resolve
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const IncidentDetailModal = ({ incident, onClose, onStatusUpdate, onOpenAI, getStatusColor, relatedAlerts }) => {
  const status = incident.status || 'New';
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content incident-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Incident Details</h2>
          <div className="header-actions">
            <button className="btn-ai-large" onClick={onOpenAI}>
               <Brain size={18} /> Ask AI Analyst
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="modal-body">
          <div className="detail-section info-box">
             <div className="info-row">
                <span className="label">Type:</span> <span>{incident.alertType}</span>
             </div>
             <div className="info-row">
                <span className="label">Target:</span> <span className="mono">{incident.details?.ip_address || incident.details?.target_entity}</span>
             </div>
             <div className="info-row">
                <span className="label">Engine:</span> <span>{incident.engine}</span>
             </div>
          </div>
          
          {relatedAlerts && relatedAlerts.length > 0 && (
            <div className="detail-section">
              <h3>Attack Chain ({relatedAlerts.length} Events)</h3>
              <div className="timeline-container">
                 {relatedAlerts.map((alert, idx) => (
                    <div key={alert._id} className="timeline-item">
                        <div className="timeline-time">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                        <div className="timeline-content">
                            <span className={`engine-tag ${alert.engine}`}>{alert.engine}</span>
                            <span className="alert-msg">{alert.alertType}</span>
                        </div>
                    </div>
                 ))}
              </div>
            </div>
          )}

          <div className="detail-section raw-json">
             <details>
                 <summary>View Raw Payload</summary>
                 <pre>{JSON.stringify(incident, null, 2)}</pre>
             </details>
          </div>
          
          <div className="detail-section actions-section">
            <h3>Update Status</h3>
            <div className="status-actions">
              {STATUS_OPTIONS.map(option => (
                <button
                  key={option}
                  className={`status-action-btn ${status === option ? 'active' : ''} ${option.toLowerCase().replace(' ', '-')}`}
                  onClick={() => { onStatusUpdate(incident._id, option); }}
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