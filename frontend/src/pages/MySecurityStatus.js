// src/pages/MySecurityStatus.js - ENHANCED Employee Panel
import React, { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, Info, Award, TrendingUp } from 'lucide-react';
import './MySecurityStatus.css';

const MySecurityStatus = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const token = localStorage.getItem('token');

  const fetchMyAlerts = useCallback(async () => {
    try {
      // Fetch user profile
      const profileRes = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profileData = await profileRes.json();
      setUser(profileData.user);
      
      // Fetch my alerts (backend filters by assigned_ip)
      const alertsRes = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/alerts?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const alertsData = await alertsRes.json();
      setAlerts(alertsData.alerts || []);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMyAlerts();
    const interval = setInterval(fetchMyAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchMyAlerts]);

  // Mark as "This was me"
  const markFalsePositive = async (alertId) => {
    const confirmed = window.confirm('Are you sure this was your normal activity?');
    if (!confirmed) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'False Positive'
        })
      });
      
      if (response.ok) {
        alert('✅ Marked as false positive');
        fetchMyAlerts();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error || 'Failed to update'}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to update');
    }
  };

  // Request review
  const requestReview = async (alertId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'Review Requested' })
      });
      
      if (response.ok) {
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

  // Report suspicious
  const reportSuspicious = async (alertId) => {
    const details = prompt('Please describe what seems suspicious:');
    if (!details) return;
    
    try {
      // Just mark as needing review with high priority
      const response = await fetch(`http://localhost:5000/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'Review Requested'
        })
      });
      
      if (response.ok) {
        alert('✅ Report submitted! Security team will investigate.');
        fetchMyAlerts();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to submit report');
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
  const resolvedAlerts = alerts.filter(a => a.status === 'Resolved' || a.status === 'False Positive');

  // Calculate security score
  const totalAlerts = alerts.length;
  const baseScore = 100;
  const criticalPenalty = criticalAlerts.length * 15;
  const highPenalty = highAlerts.length * 10;
  const pendingPenalty = pendingReview.length * 5;
  const resolvedBonus = Math.min(resolvedAlerts.length * 5, 30);
  
  const securityScore = Math.max(0, Math.min(100, 
    baseScore - criticalPenalty - highPenalty - pendingPenalty + resolvedBonus
  ));

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
      </div>

      {/* Security Score Breakdown - NEW! */}
      <section className="score-breakdown-section">
        <h2>
          <Award size={24} />
          Score Breakdown
        </h2>
        <div className="breakdown-card">
          <div className="breakdown-items">
            <div className="breakdown-item positive">
              <CheckCircle size={20} />
              <span className="item-text">Base Security Score</span>
              <span className="points">+100</span>
            </div>
            
            {resolvedAlerts.length > 0 && (
              <div className="breakdown-item positive">
                <CheckCircle size={20} />
                <span className="item-text">Resolved alerts promptly ({resolvedAlerts.length})</span>
                <span className="points">+{resolvedBonus}</span>
              </div>
            )}
            
            {criticalAlerts.length > 0 && (
              <div className="breakdown-item negative">
                <AlertTriangle size={20} />
                <span className="item-text">Critical alerts ({criticalAlerts.length})</span>
                <span className="points">-{criticalPenalty}</span>
              </div>
            )}
            
            {highAlerts.length > 0 && (
              <div className="breakdown-item negative">
                <Info size={20} />
                <span className="item-text">High priority alerts ({highAlerts.length})</span>
                <span className="points">-{highPenalty}</span>
              </div>
            )}
            
            {pendingReview.length > 0 && (
              <div className="breakdown-item negative">
                <Clock size={20} />
                <span className="item-text">Pending reviews ({pendingReview.length})</span>
                <span className="points">-{pendingPenalty}</span>
              </div>
            )}
          </div>
          
          <div className="breakdown-total">
            <span className="total-label">Your Current Score:</span>
            <span className={`total-value ${securityScore >= 80 ? 'good' : securityScore >= 50 ? 'warning' : 'danger'}`}>
              {securityScore}%
            </span>
          </div>

          <div className="improvement-tips">
            <h4>
              <TrendingUp size={20} />
              How to Improve Your Score:
            </h4>
            <ul>
              <li>Complete pending reviews to reduce penalties</li>
              <li>Report suspicious activity when you see it</li>
              <li>Mark false positives if alerts were your normal activity</li>
              <li>Follow security best practices</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Security Education - NEW! */}
      <section className="security-education">
        <h2>
          <Info size={24} />
          Security Tips
        </h2>
        <div className="tips-grid">
          <div className="tip-card">
            <div className="tip-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>Why was this flagged?</h3>
            <p>Our AI detected unusual behavior that could indicate a security threat. This might be malware, suspicious network activity, or policy violations.</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">
              <Shield size={32} />
            </div>
            <h3>What should I do?</h3>
            <p>Review each alert carefully. If it was you, click "This was me". If something seems wrong or you didn't do it, click "I need help" to request a security review.</p>
          </div>
          
          <div className="tip-card">
            <div className="tip-icon">
              <CheckCircle size={32} />
            </div>
            <h3>Best Practices</h3>
            <ul>
              <li>Never share your credentials</li>
              <li>Use strong, unique passwords</li>
              <li>Report suspicious emails immediately</li>
              <li>Keep software updated</li>
              <li>Lock your computer when away</li>
            </ul>
          </div>
        </div>
      </section>

      {/* My Alerts */}
      <section className="my-alerts">
        <h2>My Alerts ({alerts.length})</h2>
        
        {alerts.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={64} color="#00C851" />
            <h3>All Clear!</h3>
            <p>No security alerts for your workstation.</p>
            <p className="keep-it-up">Keep up the good work! 🎉</p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map(alert => (
              <AlertCard
                key={alert._id}
                alert={alert}
                onMarkFalse={() => markFalsePositive(alert._id)}
                onRequestReview={() => requestReview(alert._id)}
                onReportSuspicious={() => reportSuspicious(alert._id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// Alert Card Component with Enhanced Actions
const AlertCard = ({ alert, onMarkFalse, onRequestReview, onReportSuspicious }) => {
  const status = alert.status || 'New';
  const isResolved = status === 'Resolved' || status === 'False Positive';
  const isPending = status === 'Review Requested';

  return (
    <div className={`alert-card severity-${alert.severity?.toLowerCase()} ${isResolved ? 'resolved' : ''}`}>
      <div className="alert-header">
        <div className="alert-severity">
          <span className={`severity-badge ${alert.severity?.toLowerCase()}`}>
            {alert.severity}
          </span>
          <span className="alert-engine">{alert.engine}</span>
        </div>
        <span className="alert-time">
          {new Date(alert.timestamp).toLocaleString()}
        </span>
      </div>

      <div className="alert-body">
        <h3 className="alert-title">{alert.alertType}</h3>
        
        {alert.details?.ip_address && (
          <div className="alert-detail">
            <span className="detail-label">Source:</span>
            <span className="detail-value">{alert.details.ip_address}</span>
          </div>
        )}

        {alert.details?.verdict && (
          <div className="alert-detail">
            <span className="detail-label">Verdict:</span>
            <span className="detail-value">{alert.details.verdict}</span>
          </div>
        )}
      </div>

      <div className="alert-footer">
        <span className={`status-badge status-${status.toLowerCase().replace(' ', '-')}`}>
          {status}
        </span>

        {/* Enhanced Action Buttons - NEW! */}
        {!isResolved && !isPending && (
          <div className="alert-actions">
            <button 
              className="action-btn this-was-me"
              onClick={onMarkFalse}
              title="Mark this as your normal activity"
            >
              ✓ This was me
            </button>
            <button 
              className="action-btn need-help"
              onClick={onRequestReview}
              title="Request security team review"
            >
              🆘 I need help
            </button>
            <button 
              className="action-btn report"
              onClick={onReportSuspicious}
              title="Report suspicious activity"
            >
              ⚠️ Suspicious
            </button>
          </div>
        )}

        {isPending && (
          <div className="pending-message">
            ⏳ Review requested - Security team will investigate
          </div>
        )}

        {isResolved && (
          <div className="resolved-message">
            ✅ {status === 'Resolved' ? 'Resolved by security team' : 'Marked as false positive'}
          </div>
        )}
      </div>
    </div>
  );
};

export default MySecurityStatus;