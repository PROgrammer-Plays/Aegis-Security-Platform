// src/pages/MySecurityStatus.js - Employee/Intern View
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react';
import './MySecurityStatus.css';

const MySecurityStatus = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const fetchMyAlerts = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user profile
      const profileRes = await fetch('http://localhost:5000/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profileData = await profileRes.json();
      setUser(profileData.user);
      
      // Fetch my alerts (backend filters by assigned_ip)
      const alertsRes = await fetch('http://localhost:5000/api/alerts?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const alertsData = await alertsRes.json();
      setAlerts(alertsData.alerts || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyAlerts();
    const interval = setInterval(fetchMyAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchMyAlerts]);

  const requestReview = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Review Requested' })
      });
      
      if (response.ok) {
        // Update local state
        setAlerts(prev => prev.map(alert => 
          alert._id === alertId ? { ...alert, status: 'Review Requested' } : alert
        ));
        alert('✅ Review requested! A senior analyst will investigate.');
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Failed to request review'}`);
      }
    } catch (error) {
      console.error('Error requesting review:', error);
      alert('❌ Failed to request review');
    }
  };

  if (loading) {
    return (
      <div className="my-status loading">
        <div className="spinner"></div>
        <p>Loading your security status...</p>
      </div>
    );
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'Critical');
  const highAlerts = alerts.filter(a => a.severity === 'High');
  const pendingReview = alerts.filter(a => a.status === 'Review Requested');
  const resolvedAlerts = alerts.filter(a => a.status === 'Resolved');

  // Calculate security score
  const securityScore = alerts.length > 0
    ? Math.round((resolvedAlerts.length / alerts.length) * 100)
    : 100;

  return (
    <div className="my-security-status">
      {/* Header */}
      <header className="status-header">
        <div className="header-content">
          <Shield size={40} color="#00bcd4" />
          <div>
            <h1>My Security Status</h1>
            <p>
              Welcome, <strong>{user?.fullName || user?.username}</strong>
              {user?.assigned_ip && (
                <span className="assigned-ip"> • Monitoring: {user.assigned_ip}</span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Status Overview */}
      <div className="status-overview">
        <div className="status-card security-score">
          <div className="card-icon">
            <Shield size={48} color={securityScore >= 80 ? '#00C851' : securityScore >= 50 ? '#ffbb33' : '#ff4444'} />
          </div>
          <div className="card-content">
            <div className="score-value">{securityScore}%</div>
            <div className="score-label">Security Score</div>
            <div className="score-status">
              {securityScore >= 80 ? '✅ Good Standing' : 
               securityScore >= 50 ? '⚠️ Needs Attention' : 
               '❌ Action Required'}
            </div>
          </div>
        </div>

        <div className="status-card critical">
          <div className="card-icon">
            <AlertTriangle size={32} />
          </div>
          <div className="card-content">
            <div className="card-value">{criticalAlerts.length}</div>
            <div className="card-label">Critical Alerts</div>
          </div>
        </div>

        <div className="status-card high">
          <div className="card-icon">
            <Info size={32} />
          </div>
          <div className="card-content">
            <div className="card-value">{highAlerts.length}</div>
            <div className="card-label">High Priority</div>
          </div>
        </div>

        <div className="status-card pending">
          <div className="card-icon">
            <Clock size={32} />
          </div>
          <div className="card-content">
            <div className="card-value">{pendingReview.length}</div>
            <div className="card-label">Pending Review</div>
          </div>
        </div>

        <div className="status-card resolved">
          <div className="card-icon">
            <CheckCircle size={32} />
          </div>
          <div className="card-content">
            <div className="card-value">{resolvedAlerts.length}</div>
            <div className="card-label">Resolved</div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!user?.assigned_ip && (
        <div className="info-banner warning">
          <AlertTriangle size={20} />
          <div>
            <strong>No IP Address Assigned</strong>
            <p>Contact your administrator to assign an IP address to your account.</p>
          </div>
        </div>
      )}

      {alerts.length === 0 && user?.assigned_ip && (
        <div className="info-banner success">
          <CheckCircle size={20} />
          <div>
            <strong>All Clear!</strong>
            <p>No security alerts detected for your device ({user.assigned_ip}).</p>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2>Security Alerts for Your Device</h2>
          
          {/* Critical Alerts First */}
          {criticalAlerts.length > 0 && (
            <div className="alert-category">
              <h3 className="category-title critical">
                <AlertTriangle size={20} />
                Critical Alerts ({criticalAlerts.length})
              </h3>
              <div className="alerts-list">
                {criticalAlerts.map(alert => (
                  <AlertCard 
                    key={alert._id} 
                    alert={alert} 
                    onRequestReview={requestReview}
                  />
                ))}
              </div>
            </div>
          )}

          {/* High Priority */}
          {highAlerts.length > 0 && (
            <div className="alert-category">
              <h3 className="category-title high">
                <Info size={20} />
                High Priority Alerts ({highAlerts.length})
              </h3>
              <div className="alerts-list">
                {highAlerts.map(alert => (
                  <AlertCard 
                    key={alert._id} 
                    alert={alert} 
                    onRequestReview={requestReview}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Other Alerts */}
          {alerts.filter(a => a.severity !== 'Critical' && a.severity !== 'High').length > 0 && (
            <div className="alert-category">
              <h3 className="category-title other">
                Other Alerts ({alerts.filter(a => a.severity !== 'Critical' && a.severity !== 'High').length})
              </h3>
              <div className="alerts-list">
                {alerts.filter(a => a.severity !== 'Critical' && a.severity !== 'High').map(alert => (
                  <AlertCard 
                    key={alert._id} 
                    alert={alert} 
                    onRequestReview={requestReview}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Help Section */}
      <div className="help-section">
        <h3>What should I do?</h3>
        <div className="help-cards">
          <div className="help-card">
            <div className="help-number">1</div>
            <div className="help-content">
              <h4>Review the Alert</h4>
              <p>Read the alert details carefully to understand what was detected.</p>
            </div>
          </div>
          <div className="help-card">
            <div className="help-number">2</div>
            <div className="help-content">
              <h4>Request Review</h4>
              <p>Click "Request Review" to notify a senior analyst if you need help.</p>
            </div>
          </div>
          <div className="help-card">
            <div className="help-number">3</div>
            <div className="help-content">
              <h4>Wait for Response</h4>
              <p>A senior analyst will investigate and take appropriate action.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Alert Card Component
const AlertCard = ({ alert, onRequestReview }) => {
  const [expanded, setExpanded] = useState(false);
  const isResolved = alert.status === 'Resolved' || alert.status === 'False Positive';
  const isPending = alert.status === 'Review Requested';

  return (
    <div className={`alert-card ${alert.severity?.toLowerCase()} ${isResolved ? 'resolved' : ''}`}>
      <div className="alert-header">
        <div className="alert-title">
          <span className={`severity-badge ${alert.severity?.toLowerCase()}`}>
            {alert.severity}
          </span>
          <h4>{alert.alertType}</h4>
        </div>
        <div className="alert-time">
          <Clock size={14} />
          {new Date(alert.timestamp).toLocaleString()}
        </div>
      </div>

      <div className="alert-body">
        <div className="alert-info">
          <span className="info-label">Engine:</span>
          <span className="info-value">{alert.engine}</span>
        </div>
        {alert.details?.ip_address && (
          <div className="alert-info">
            <span className="info-label">IP Address:</span>
            <span className="info-value">{alert.details.ip_address}</span>
          </div>
        )}
        {alert.details?.verdict && (
          <div className="alert-info">
            <span className="info-label">Verdict:</span>
            <span className="info-value verdict">{alert.details.verdict}</span>
          </div>
        )}
      </div>

      {expanded && alert.details && (
        <div className="alert-details">
          <h5>Technical Details:</h5>
          <pre>{JSON.stringify(alert.details, null, 2)}</pre>
        </div>
      )}

      <div className="alert-footer">
        <button 
          className="btn-details"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>

        {!isResolved && !isPending && (
          <button 
            className="btn-request-review"
            onClick={() => onRequestReview(alert._id)}
          >
            📨 Request Review
          </button>
        )}

        {isPending && (
          <div className="status-badge pending">
            ⏳ Review Requested
          </div>
        )}

        {isResolved && (
          <div className="status-badge resolved">
            ✅ {alert.status}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySecurityStatus;
