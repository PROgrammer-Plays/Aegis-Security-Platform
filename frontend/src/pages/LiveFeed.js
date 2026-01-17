// src/pages/LiveFeed.js - Real-time Alert Monitor
import React, { useState, useEffect, useRef } from 'react';
import AlertDetails from '../components/AlertDetails';
import './LiveFeed.css';

function LiveFeed({ alerts }) {
  const [isPaused, setIsPaused] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filters, setFilters] = useState({
    IDS: true,
    'Traffic Engine': true,
    'UEBA': true,
    'Artifact Engine': true,
    'Threat Intelligence': true,
    'CORRELATION BRAIN': true
  });
  const feedRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to top when new alert arrives (if not paused)
  useEffect(() => {
    if (!isPaused && autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [alerts, isPaused, autoScroll]);

  const toggleFilter = (engine) => {
    setFilters(prev => ({ ...prev, [engine]: !prev[engine] }));
  };

  const filteredAlerts = alerts.filter(alert => filters[alert.engine]);

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'Critical': return '🔴';
      case 'High': return '🟠';
      case 'Medium': return '🟡';
      case 'Low': return '🟢';
      default: return '⚪';
    }
  };

  const getEngineIcon = (engine) => {
    switch(engine) {
      case 'IDS': return '🛡️';
      case 'Traffic Engine': return '📊';
      case 'UEBA': return '👤';
      case 'Artifact Engine': return '🦠';
      case 'Threat Intelligence': return '🔍';
      case 'CORRELATION BRAIN': return '🧠';
      default: return '📡';
    }
  };

  return (
    <div className="live-feed">
      {/* Header Controls */}
      <div className="feed-header">
        <div className="feed-title">
          <h1>📡 Live Alert Feed</h1>
          <div className="feed-stats">
            <span>{filteredAlerts.length} alerts</span>
            <span className={isPaused ? 'paused' : 'live'}>
              {isPaused ? '⏸️ PAUSED' : '🔴 LIVE'}
            </span>
          </div>
        </div>
        
        <div className="feed-controls">
          <button 
            className={`control-btn ${isPaused ? 'active' : ''}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          
          <button 
            className={`control-btn ${autoScroll ? 'active' : ''}`}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? '📌 Pin' : '🔄 Auto-scroll'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        {Object.entries(filters).map(([engine, enabled]) => (
          <button
            key={engine}
            className={`filter-chip ${enabled ? 'active' : 'inactive'}`}
            onClick={() => toggleFilter(engine)}
          >
            {getEngineIcon(engine)} {engine}
          </button>
        ))}
      </div>

      {/* Alert Feed */}
      <div className="feed-container" ref={feedRef}>
        {filteredAlerts.length === 0 ? (
          <div className="feed-empty">
            <div className="empty-icon">📭</div>
            <p>No alerts matching current filters</p>
          </div>
        ) : (
          <div className="alerts-list">
            {filteredAlerts.map((alert, index) => (
              <div
                key={alert._id || index}
                className={`alert-card severity-${alert.severity?.toLowerCase()} ${
                  alert.engine === 'CORRELATION BRAIN' ? 'correlation' : ''
                } ${expandedId === alert._id ? 'expanded' : ''}`}
                onClick={() => setExpandedId(expandedId === alert._id ? null : alert._id)}
              >
                {/* Alert Header */}
                <div className="alert-card-header">
                  <div className="alert-left">
                    <span className="severity-icon">
                      {getSeverityIcon(alert.severity)}
                    </span>
                    <span className="engine-badge">
                      {getEngineIcon(alert.engine)} {alert.engine}
                    </span>
                  </div>
                  
                  <div className="alert-right">
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="severity-badge severity-${alert.severity?.toLowerCase()}">
                      {alert.severity}
                    </span>
                  </div>
                </div>

                {/* Alert Body */}
                <div className="alert-card-body">
                  <h3 className="alert-type">{alert.alertType}</h3>
                  
                  {/* Quick Info */}
                  <div className="alert-quick-info">
                    {alert.details?.ip_address && (
                      <span className="info-tag">
                        📍 {alert.details.ip_address}
                      </span>
                    )}
                    {alert.details?.source_ip && (
                      <span className="info-tag">
                        📍 {alert.details.source_ip}
                      </span>
                    )}
                    {alert.details?.user_id && (
                      <span className="info-tag">
                        👤 {alert.details.user_id}
                      </span>
                    )}
                    {alert.details?.target_entity && (
                      <span className="info-tag">
                        🎯 {alert.details.target_entity}
                      </span>
                    )}
                  </div>

                  {/* Correlation Special Display */}
                  {alert.engine === 'CORRELATION BRAIN' && alert.details && (
                    <div className="correlation-summary">
                      <div className="correlation-stats">
                        <span>Risk: {alert.details.risk_score}</span>
                        <span>Engines: {alert.details.engine_count}</span>
                        <span>Alerts: {alert.details.alert_count}</span>
                      </div>
                      {alert.details.attack_patterns && (
                        <div className="attack-patterns">
                          {alert.details.attack_patterns.map((pattern, idx) => (
                            <span key={idx} className="pattern-tag">
                              ⚡ {pattern}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedId === alert._id && (
                  <div className="alert-card-details">
                    <AlertDetails alert={alert} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveFeed;
