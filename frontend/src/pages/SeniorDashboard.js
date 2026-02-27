// src/pages/SeniorDashboard.js - Senior Analyst Specific Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Target, Clock, CheckCircle, TrendingUp, Users, 
  AlertOctagon, Activity, Award, Zap
} from 'lucide-react';
import './SeniorDashboard.css';

const SeniorDashboard = () => {
  const [myAssignments, setMyAssignments] = useState([]);
  const [teamStats, setTeamStats] = useState([]);
  const [myStats, setMyStats] = useState({
    assigned: 0,
    inProgress: 0,
    resolved: 0,
    avgResolutionTime: 0
  });
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch my assigned alerts
      const assignedRes = await fetch('http://localhost:5000/api/alerts?limit=50', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const assignedData = await assignedRes.json();
      
      // Filter for alerts assigned to me or that I'm working on
      const myAlerts = (assignedData.alerts || []).filter(alert => 
        alert.assignedTo === username || 
        (alert.status === 'In Progress' && alert.investigatedBy === username)
      );
      
      setMyAssignments(myAlerts);

      // Calculate my stats
      const assigned = myAlerts.filter(a => !a.status || a.status === 'New').length;
      const inProgress = myAlerts.filter(a => a.status === 'In Progress').length;
      const resolved = myAlerts.filter(a => a.status === 'Resolved').length;
      
      setMyStats({
        assigned,
        inProgress,
        resolved,
        avgResolutionTime: 24 // TODO: Calculate from backend
      });

      // Fetch team stats (mocked for now - should come from backend)
      setTeamStats([
        { name: username, assigned: myAlerts.length, resolved, status: 'active' },
        // Add other team members from backend
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      setLoading(false);
    }
  }, [token, username]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const acceptAssignment = async (alertId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status: 'In Progress',
          investigatedBy: username
        })
      });

      if (response.ok) {
        alert('✅ Assignment accepted! Starting investigation...');
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      alert('❌ Failed to accept assignment');
    }
  };

  if (loading) {
    return (
      <div className="senior-dashboard loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="senior-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <Target size={40} color="#00bcd4" />
          <div>
            <h1>Senior Analyst Dashboard</h1>
            <p>Welcome back, <strong>{username}</strong> • Your assigned investigations</p>
          </div>
        </div>
      </header>

      {/* My Performance Stats */}
      <section className="performance-section">
        <h2>My Performance</h2>
        <div className="stats-grid">
          <div className="stat-card assigned">
            <div className="stat-icon">
              <Target size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{myStats.assigned}</div>
              <div className="stat-label">Assigned to Me</div>
            </div>
          </div>

          <div className="stat-card in-progress">
            <div className="stat-icon">
              <Activity size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{myStats.inProgress}</div>
              <div className="stat-label">Investigating</div>
            </div>
          </div>

          <div className="stat-card resolved">
            <div className="stat-icon">
              <CheckCircle size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{myStats.resolved}</div>
              <div className="stat-label">Resolved</div>
            </div>
          </div>

          <div className="stat-card avg-time">
            <div className="stat-icon">
              <Clock size={32} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{myStats.avgResolutionTime}h</div>
              <div className="stat-label">Avg Resolution</div>
            </div>
          </div>
        </div>
      </section>

      {/* My Assignments */}
      <section className="assignments-section">
        <div className="section-header">
          <h2>My Active Assignments</h2>
          <span className="assignment-count">{myAssignments.length} active</span>
        </div>

        {myAssignments.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={64} color="#00C851" />
            <h3>No Active Assignments</h3>
            <p>You're all caught up! Check the War Room for new incidents.</p>
          </div>
        ) : (
          <div className="assignments-grid">
            {myAssignments.map(alert => (
              <AssignmentCard 
                key={alert._id}
                alert={alert}
                onAccept={() => acceptAssignment(alert._id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Team Overview */}
      <section className="team-section">
        <h2>Team Overview</h2>
        <div className="team-grid">
          {teamStats.map((member, idx) => (
            <div key={idx} className="team-card">
              <div className="team-member-info">
                <div className="member-avatar">
                  <Users size={24} />
                </div>
                <div className="member-details">
                  <div className="member-name">{member.name}</div>
                  <span className={`member-status ${member.status}`}>
                    {member.status === 'active' ? 'Active' : 'Away'}
                  </span>
                </div>
              </div>
              <div className="member-stats">
                <div className="stat-item">
                  <span className="stat-label">Assigned:</span>
                  <span className="stat-value">{member.assigned}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Resolved:</span>
                  <span className="stat-value">{member.resolved}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <a href="/incidents" className="action-card">
            <AlertOctagon size={32} />
            <span>War Room</span>
          </a>
          <a href="/forensics" className="action-card">
            <Target size={32} />
            <span>Forensics</span>
          </a>
          <a href="/feed" className="action-card">
            <Activity size={32} />
            <span>Live Feed</span>
          </a>
        </div>
      </section>
    </div>
  );
};

// Assignment Card Component
const AssignmentCard = ({ alert, onAccept }) => {
  const isNew = !alert.status || alert.status === 'New';
  const isAssigned = alert.assignedTo;

  return (
    <div className={`assignment-card severity-${alert.severity?.toLowerCase()}`}>
      <div className="card-header">
        <div className="assignment-badges">
          <span className={`severity-badge ${alert.severity?.toLowerCase()}`}>
            {alert.severity}
          </span>
          {alert.engine === 'CORRELATION BRAIN' && (
            <span className="correlation-badge">
              <Zap size={14} /> Correlation
            </span>
          )}
        </div>
        <span className="assignment-time">
          {new Date(alert.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="card-body">
        <h3 className="assignment-title">{alert.alertType}</h3>
        <div className="assignment-details">
          <div className="detail-item">
            <span className="label">Engine:</span>
            <span className="value">{alert.engine}</span>
          </div>
          <div className="detail-item">
            <span className="label">Target:</span>
            <span className="value">
              {alert.details?.ip_address || alert.details?.target_entity || '-'}
            </span>
          </div>
        </div>

        {isAssigned && (
          <div className="assignment-info">
            <Target size={16} />
            <span>Assigned by admin</span>
          </div>
        )}
      </div>

      <div className="card-footer">
        <span className={`status-badge ${alert.status?.toLowerCase().replace(' ', '-') || 'new'}`}>
          {alert.status || 'New'}
        </span>
        
        {isNew && (
          <button className="accept-btn" onClick={onAccept}>
            ✓ Accept & Investigate
          </button>
        )}
        
        {alert.status === 'In Progress' && (
          <a href={`/incidents`} className="view-btn">
            👁️ Continue Investigation
          </a>
        )}
      </div>
    </div>
  );
};

export default SeniorDashboard;
