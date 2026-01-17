// src/pages/Incidents.js - Correlation War Room
import React, { useState } from 'react';
import './Incidents.css';

function Incidents({ alerts }) {
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Filter for correlation brain incidents only
  const incidents = alerts.filter(alert => alert.engine === 'CORRELATION BRAIN');

  return (
    <div className="incidents-page">
      <div className="incidents-header">
        <h1>🚨 Incident War Room</h1>
        <div className="incidents-stats">
          <span className="stat-badge critical">{incidents.length} Active Incidents</span>
        </div>
      </div>

      {incidents.length === 0 ? (
        <div className="no-incidents">
          <div className="no-incidents-icon">✅</div>
          <h2>No Critical Incidents</h2>
          <p>All clear! The Correlation Brain has not detected any multi-vector attacks.</p>
        </div>
      ) : (
        <div className="incidents-grid">
          {/* Incidents List */}
          <div className="incidents-list">
            {incidents.map((incident, idx) => (
              <div
                key={incident._id || idx}
                className={`incident-card ${selectedIncident?._id === incident._id ? 'selected' : ''}`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="incident-card-header">
                  <span className="incident-number">#{incidents.length - idx}</span>
                  <span className="incident-time">
                    {new Date(incident.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <h3 className="incident-title">{incident.alertType}</h3>
                
                <div className="incident-meta">
                  <div className="meta-item">
                    <span className="meta-label">Target:</span>
                    <span className="meta-value">{incident.details?.target_entity || 'Unknown'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Risk Score:</span>
                    <span className="meta-value risk-score">{incident.details?.risk_score || 0}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Engines:</span>
                    <span className="meta-value">{incident.details?.engine_count || 0}</span>
                  </div>
                </div>

                {incident.details?.attack_patterns && (
                  <div className="incident-patterns">
                    {incident.details.attack_patterns.slice(0, 2).map((pattern, idx) => (
                      <span key={idx} className="pattern-badge">
                        {pattern.split(':')[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Incident Details Panel */}
          <div className="incident-details-panel">
            {selectedIncident ? (
              <IncidentDetails incident={selectedIncident} />
            ) : (
              <div className="select-incident">
                <p>← Select an incident to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Incident Details Component
function IncidentDetails({ incident }) {
  const details = incident.details || {};

  return (
    <div className="incident-full-details">
      {/* Header */}
      <div className="details-header">
        <div className="details-title">
          <h2>{incident.alertType}</h2>
          <span className="severity-badge-large critical">CRITICAL</span>
        </div>
        <div className="details-timestamp">
          {new Date(incident.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">🎯</div>
          <div className="summary-content">
            <div className="summary-label">Target Entity</div>
            <div className="summary-value">{details.target_entity || 'Unknown'}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">⚡</div>
          <div className="summary-content">
            <div className="summary-label">Risk Score</div>
            <div className="summary-value">{details.risk_score || 0}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">🔗</div>
          <div className="summary-content">
            <div className="summary-label">Engines Involved</div>
            <div className="summary-value">{details.engine_count || 0}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <div className="summary-label">Total Alerts</div>
            <div className="summary-value">{details.alert_count || 0}</div>
          </div>
        </div>
      </div>

      {/* Attack Patterns */}
      {details.attack_patterns && details.attack_patterns.length > 0 && (
        <div className="details-section">
          <h3>🔥 Detected Attack Patterns</h3>
          <div className="patterns-list">
            {details.attack_patterns.map((pattern, idx) => (
              <div key={idx} className="pattern-item">
                <span className="pattern-icon">⚡</span>
                <span className="pattern-text">{pattern}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {details.timeline && details.timeline.length > 0 && (
        <div className="details-section">
          <h3>📅 Attack Timeline</h3>
          <div className="timeline">
            {details.timeline.map((event, idx) => (
              <div key={idx} className="timeline-item">
                <div className="timeline-marker">{idx + 1}</div>
                <div className="timeline-content">
                  <div className="timeline-text">{event}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Engines Involved */}
      {details.engines_involved && (
        <div className="details-section">
          <h3>🔧 Detection Engines</h3>
          <div className="engines-grid">
            {details.engines_involved.map((engine, idx) => (
              <div key={idx} className="engine-chip">
                {getEngineIcon(engine)} {engine}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Severity Breakdown */}
      {details.severity_breakdown && (
        <div className="details-section">
          <h3>📊 Severity Breakdown</h3>
          <div className="severity-grid">
            {Object.entries(details.severity_breakdown).map(([severity, count]) => (
              count > 0 && (
                <div key={severity} className={`severity-item severity-${severity.toLowerCase()}`}>
                  <span className="severity-count">{count}</span>
                  <span className="severity-name">{severity}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Response Actions */}
      <div className="details-section">
        <h3>⚙️ Response Actions</h3>
        <div className="action-buttons">
          <button className="action-btn block">
            🚫 Block Entity
          </button>
          <button className="action-btn quarantine">
            🔒 Quarantine
          </button>
          <button className="action-btn investigate">
            🔍 Deep Scan
          </button>
          <button className="action-btn export">
            📄 Export Report
          </button>
        </div>
        <p className="action-note">
          * These actions are simulated. In production, they would trigger automated response workflows.
        </p>
      </div>
    </div>
  );
}

function getEngineIcon(engine) {
  const icons = {
    'IDS': '🛡️',
    'Traffic Engine': '📊',
    'UEBA': '👤',
    'Artifact Engine': '🦠',
    'Threat Intelligence': '🔍',
    'CORRELATION BRAIN': '🧠'
  };
  return icons[engine] || '📡';
}

export default Incidents;
