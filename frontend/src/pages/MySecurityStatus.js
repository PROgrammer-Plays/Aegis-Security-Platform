// src/pages/MySecurityStatus.js - IMPROVED Employee Dashboard
import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, HelpCircle, BookOpen, TrendingUp } from 'lucide-react';
import './MySecurityStatus.css';

function MySecurityStatus() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showEducation, setShowEducation] = useState(false);

  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  useEffect(() => {
    fetchMyAlerts();
    const interval = setInterval(fetchMyAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyAlerts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/alerts?limit=100', {
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
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
    setLoading(false);
  };

  const handleRequestReview = async (alertId) => {
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
        alert('✅ Review requested successfully. A senior analyst will investigate.');
        fetchMyAlerts();
      } else {
        throw new Error('Failed to request review');
      }
    } catch (error) {
      console.error('Error requesting review:', error);
      alert('❌ Failed to request review. Please try again.');
    }
  };

  const handleMarkFalsePositive = async (alertId) => {
    const confirmed = window.confirm(
      'Are you sure this was you and is a false alarm? A senior analyst will verify this.'
    );
    
    if (confirmed) {
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
          alert('✅ Marked as false positive. A senior analyst will review.');
          fetchMyAlerts();
        }
      } catch (error) {
        console.error('Error marking false positive:', error);
        alert('❌ Failed to submit. Please try again.');
      }
    }
  };

  // Calculate security score
  const calculateScore = () => {
    const total = alerts.length;
    if (total === 0) return 100;
    
    const resolved = alerts.filter(a => 
      a.status === 'Resolved' || a.status === 'False Positive'
    ).length;
    const critical = alerts.filter(a => a.severity === 'Critical').length;
    const pending = alerts.filter(a => a.status === 'New').length;
    
    let score = 100;
    score -= (critical * 15); // -15 for each critical
    score -= (pending * 5);    // -5 for each pending
    score += (resolved * 2);   // +2 for each resolved
    
    return Math.max(0, Math.min(100, score));
  };

  const securityScore = calculateScore();
  const criticalAlerts = alerts.filter(a => a.severity === 'Critical');
  const highAlerts = alerts.filter(a => a.severity === 'High');
  const pendingAlerts = alerts.filter(a => a.status === 'New');

  if (loading) {
    return (
      <div className="my-security-status">
        <div className="loading-state">Loading your security status...</div>
      </div>
    );
  }

  return (
    <div className="my-security-status">
      {/* Header */}
      <div className="employee-header">
        <div>
          <h1>🛡️ My Security Status</h1>
          <p className="header-subtitle">Hello, {username}! Here's your security overview.</p>
        </div>
        <button className="help-btn" onClick={() => setShowEducation(!showEducation)}>
          <BookOpen size={20} />
          <span>{showEducation ? 'Hide' : 'Show'} Security Tips</span>
        </button>
      </div>

      {/* Security Education Panel */}
      {showEducation && (
        <div className="education-panel">
          <div className="education-header">
            <BookOpen size={24} />
            <h2>Understanding Your Security Alerts</h2>
          </div>
          
          <div className="education-grid">
            <div className="education-card">
              <h3>🚨 Critical Alerts</h3>
              <p><strong>What it means:</strong> Serious security threat detected on your device or account.</p>
              <p><strong>What to do:</strong> Request review immediately. Do NOT ignore these.</p>
              <p><strong>Example:</strong> Malware detected, unauthorized access attempts.</p>
            </div>

            <div className="education-card">
              <h3>⚠️ High Priority Alerts</h3>
              <p><strong>What it means:</strong> Suspicious activity that needs your attention.</p>
              <p><strong>What to do:</strong> Review the details. If it wasn't you, request review.</p>
              <p><strong>Example:</strong> Login from unusual location, large file upload.</p>
            </div>

            <div className="education-card">
              <h3>✅ False Positives</h3>
              <p><strong>What it means:</strong> System flagged normal activity as suspicious.</p>
              <p><strong>What to do:</strong> If you recognize the activity, mark as "This was me".</p>
              <p><strong>Example:</strong> Working from home, using VPN, traveling.</p>
            </div>

            <div className="education-card">
              <h3>📊 Your Security Score</h3>
              <p><strong>How it works:</strong> Starts at 100. Decreases with unresolved alerts.</p>
              <p><strong>Improve it:</strong> Resolve pending alerts, report suspicious activity.</p>
              <p><strong>Goal:</strong> Keep your score above 80 for good security posture.</p>
            </div>
          </div>
        </div>
      )}

      {/* Security Score Dashboard */}
      <div className="score-dashboard">
        <div className="score-card-main">
          <div className="score-circle">
            <svg viewBox="0 0 100 100" className="score-svg">
              <circle cx="50" cy="50" r="45" className="score-bg-circle" />
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                className="score-progress-circle"
                style={{
                  strokeDasharray: `${securityScore * 2.827}, 282.7`,
                  stroke: securityScore >= 80 ? '#00C851' : securityScore >= 50 ? '#ffbb33' : '#ff4444'
                }}
              />
            </svg>
            <div className="score-value">
              <span className="score-number">{securityScore}</span>
              <span className="score-max">/100</span>
            </div>
          </div>
          
          <div className="score-info">
            <h2>Your Security Score</h2>
            <p className={`score-status ${securityScore >= 80 ? 'good' : securityScore >= 50 ? 'fair' : 'poor'}`}>
              {securityScore >= 80 ? '✅ Excellent' : securityScore >= 50 ? '⚠️ Fair' : '🚨 Needs Attention'}
            </p>
            
            <div className="score-breakdown">
              <h4>Score Breakdown:</h4>
              <div className="breakdown-item">
                <span>Base score:</span>
                <span className="positive">+100</span>
              </div>
              {criticalAlerts.length > 0 && (
                <div className="breakdown-item">
                  <span>Critical alerts ({criticalAlerts.length}):</span>
                  <span className="negative">-{criticalAlerts.length * 15}</span>
                </div>
              )}
              {pendingAlerts.length > 0 && (
                <div className="breakdown-item">
                  <span>Pending alerts ({pendingAlerts.length}):</span>
                  <span className="negative">-{pendingAlerts.length * 5}</span>
                </div>
              )}
            </div>

            {securityScore < 80 && (
              <div className="improvement-tips">
                <TrendingUp size={16} />
                <span><strong>Tip:</strong> Review and resolve pending alerts to improve your score.</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="stat-item critical">
            <AlertTriangle size={24} />
            <div>
              <div className="stat-number">{criticalAlerts.length}</div>
              <div className="stat-label">Critical</div>
            </div>
          </div>
          <div className="stat-item high">
            <Shield size={24} />
            <div>
              <div className="stat-number">{highAlerts.length}</div>
              <div className="stat-label">High Priority</div>
            </div>
          </div>
          <div className="stat-item pending">
            <HelpCircle size={24} />
            <div>
              <div className="stat-number">{pendingAlerts.length}</div>
              <div className="stat-label">Pending Review</div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="alerts-section">
        <h2>🚨 Your Security Alerts</h2>
        
        {alerts.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={64} color="#00C851" />
            <h3>All Clear!</h3>
            <p>No security alerts for your account. Keep up the good work!</p>
          </div>
        ) : (
          <div className="alerts-grid">
            {/* Critical Alerts First */}
            {criticalAlerts.length > 0 && (
              <div className="alerts-category">
                <h3 className="category-title critical">🚨 Critical - Immediate Action Required</h3>
                {criticalAlerts.map(alert => (
                  <EmployeeAlertCard
                    key={alert._id}
                    alert={alert}
                    onRequestReview={handleRequestReview}
                    onFalsePositive={handleMarkFalsePositive}
                    onViewDetails={() => setSelectedAlert(alert)}
                  />
                ))}
              </div>
            )}

            {/* High Priority Alerts */}
            {highAlerts.length > 0 && (
              <div className="alerts-category">
                <h3 className="category-title high">⚠️ High Priority</h3>
                {highAlerts.map(alert => (
                  <EmployeeAlertCard
                    key={alert._id}
                    alert={alert}
                    onRequestReview={handleRequestReview}
                    onFalsePositive={handleMarkFalsePositive}
                    onViewDetails={() => setSelectedAlert(alert)}
                  />
                ))}
              </div>
            )}

            {/* Other Alerts */}
            {alerts.filter(a => a.severity !== 'Critical' && a.severity !== 'High').length > 0 && (
              <div className="alerts-category">
                <h3 className="category-title other">📋 Other Alerts</h3>
                {alerts
                  .filter(a => a.severity !== 'Critical' && a.severity !== 'High')
                  .map(alert => (
                    <EmployeeAlertCard
                      key={alert._id}
                      alert={alert}
                      onRequestReview={handleRequestReview}
                      onFalsePositive={handleMarkFalsePositive}
                      onViewDetails={() => setSelectedAlert(alert)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content employee-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Alert Details</h2>
              <button className="modal-close" onClick={() => setSelectedAlert(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="modal-section">
                <h3>What was detected?</h3>
                <div className="detail-item">
                  <span className={`severity-badge severity-${selectedAlert.severity?.toLowerCase()}`}>
                    {selectedAlert.severity}
                  </span>
                  <span className="alert-type">{selectedAlert.alertType}</span>
                </div>
              </div>

              <div className="modal-section">
                <h3>When did it happen?</h3>
                <p>{new Date(selectedAlert.timestamp).toLocaleString()}</p>
              </div>

              <div className="modal-section">
                <h3>Why is this concerning?</h3>
                <p className="concern-explanation">
                  {getAlertExplanation(selectedAlert)}
                </p>
              </div>

              <div className="modal-section">
                <h3>What should I do?</h3>
                <div className="action-buttons">
                  <button 
                    className="btn-review"
                    onClick={() => {
                      handleRequestReview(selectedAlert._id);
                      setSelectedAlert(null);
                    }}
                  >
                    🆘 I Need Help
                  </button>
                  <button 
                    className="btn-false-positive"
                    onClick={() => {
                      handleMarkFalsePositive(selectedAlert._id);
                      setSelectedAlert(null);
                    }}
                  >
                    ✅ This Was Me
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Employee Alert Card Component
const EmployeeAlertCard = ({ alert, onRequestReview, onFalsePositive, onViewDetails }) => {
  const status = alert.status || 'New';
  const isResolved = status === 'Resolved' || status === 'False Positive';
  
  return (
    <div className={`employee-alert-card ${alert.severity?.toLowerCase()} ${isResolved ? 'resolved' : ''}`}>
      <div className="alert-header">
        <span className={`severity-badge severity-${alert.severity?.toLowerCase()}`}>
          {alert.severity}
        </span>
        <span className="alert-time">
          {new Date(alert.timestamp).toLocaleDateString()} at {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="alert-content">
        <h3 className="alert-title">{alert.alertType}</h3>
        <p className="alert-description">{getSimpleDescription(alert)}</p>
        
        {status !== 'New' && (
          <div className="alert-status-badge">
            <span className={`status-tag status-${status.toLowerCase().replace(' ', '-')}`}>
              {status}
            </span>
          </div>
        )}
      </div>

      <div className="alert-actions">
        {status === 'New' && (
          <>
            <button 
              className="btn-help"
              onClick={() => onRequestReview(alert._id)}
            >
              🆘 I Need Help
            </button>
            <button 
              className="btn-this-was-me"
              onClick={() => onFalsePositive(alert._id)}
            >
              ✅ This Was Me
            </button>
          </>
        )}
        <button className="btn-details" onClick={onViewDetails}>
          📖 Learn More
        </button>
      </div>
    </div>
  );
};

// Helper: Get simple description for employee
const getSimpleDescription = (alert) => {
  const descriptions = {
    'Port Scan Detected': 'Someone tried to scan your device for open ports.',
    'Malicious File Detected': 'A potentially harmful file was found on your device.',
    'Connection to C2 Server': 'Your device attempted to connect to a suspicious server.',
    'Insider Threat Detected': 'Unusual activity was detected on your account.',
    'Suspicious Login': 'A login attempt was made from an unusual location.',
    'default': 'Suspicious activity was detected related to your account or device.'
  };
  
  return descriptions[alert.alertType] || descriptions.default;
};

// Helper: Get detailed explanation
const getAlertExplanation = (alert) => {
  const explanations = {
    'Port Scan Detected': 'Port scanning is a technique used by attackers to find vulnerabilities in your device. This could be a precursor to an attack.',
    'Malicious File Detected': 'Our system detected a file that matches known malware signatures. This could compromise your device security.',
    'Connection to C2 Server': 'Your device tried to connect to a command-and-control server, which is often used by malware to communicate with attackers.',
    'Insider Threat Detected': 'Unusual patterns in your account activity suggest potential unauthorized access or misuse.',
    'default': 'This activity pattern is unusual for your account and requires investigation to ensure your security.'
  };
  
  return explanations[alert.alertType] || explanations.default;
};

export default MySecurityStatus;
