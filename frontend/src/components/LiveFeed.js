// src/pages/LiveFeed.js - Live Monitor with WORKING AI Integration
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Activity, Brain, Search, Pause, Play } from 'lucide-react';
import AlertAIAnalyst from '../components/AlertAIAnalyst'; // UPDATED IMPORT
import './LiveFeed.css';

const SOCKET_SERVER_URL = "http://localhost:5000";

const LiveFeed = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // AI Analyst State
  const [showAIAnalyst, setShowAIAnalyst] = useState(false);
  const [aiAnalystAlert, setAIAnalystAlert] = useState(null);
  const [isAIMinimized, setIsAIMinimized] = useState(false);

  const socketRef = useRef();
  const token = localStorage.getItem('token');

  // Initial Fetch
  useEffect(() => {
    fetchAlerts();
  }, []);

  // Socket Connection
  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on('new-alert', (newAlert) => {
      if (!isPaused) {
        setAlerts(prev => [newAlert, ...prev]);
      }
    });

    return () => socketRef.current.disconnect();
  }, [isPaused]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/alerts?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Error fetching feed:", error);
    }
    setLoading(false);
  };

  const handleOpenAI = (alert) => {
    setAIAnalystAlert(alert);
    setShowAIAnalyst(true);
    setIsAIMinimized(false);
  };

  // Filter alerts based on search
  const filteredAlerts = alerts.filter(a => 
    a.alertType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.engine.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.details?.ip_address && a.details.ip_address.includes(searchTerm))
  );

  return (
    <div className="live-feed-page">
      {/* Header & Controls */}
      <div className="feed-header">
        <div className="header-title">
          <Activity size={32} color="#00bcd4" />
          <div>
            <h1>Live Monitor</h1>
            <p>Real-time telemetry stream</p>
          </div>
        </div>

        <div className="feed-controls">
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Search IPs, Engines..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            className={`control-btn ${isPaused ? 'paused' : ''}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play size={18}/> : <Pause size={18}/>}
            {isPaused ? 'Resume Feed' : 'Pause Feed'}
          </button>
        </div>
      </div>

      {/* Alert Feed List */}
      <div className="feed-list-container">
        {loading ? (
          <div className="feed-loading">Loading stream...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="feed-empty">No alerts found matching your criteria.</div>
        ) : (
          filteredAlerts.map((alert) => (
            <AlertItem 
              key={alert._id} 
              alert={alert} 
              onAskAI={() => handleOpenAI(alert)} 
            />
          ))
        )}
      </div>

      {/* AI Analyst Panel */}
      {showAIAnalyst && aiAnalystAlert && (
        <AlertAIAnalyst
          alert={aiAnalystAlert}
          onClose={() => setShowAIAnalyst(false)}
          isMinimized={isAIMinimized}
          onToggleMinimize={() => setIsAIMinimized(!isAIMinimized)}
        />
      )}
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ alert, onAskAI }) => {
  const getSeverityColor = (sev) => {
    switch(sev) {
      case 'Critical': return '#ff4444';
      case 'High': return '#ff8800';
      case 'Medium': return '#ffbb33';
      case 'Low': return '#00C851';
      default: return '#aaa';
    }
  };

  const timeAgo = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
    return `${Math.floor(seconds/3600)}h ago`;
  };

  return (
    <div className={`feed-item severity-${alert.severity.toLowerCase()}`}>
      <div className="feed-item-status" style={{ background: getSeverityColor(alert.severity) }}></div>
      
      <div className="feed-item-content">
        <div className="feed-item-top">
          <div className="feed-meta">
            <span className="feed-engine">{alert.engine}</span>
            <span className="feed-time">{timeAgo(alert.timestamp)}</span>
          </div>
          <span className={`severity-tag ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
        </div>

        <div className="feed-main-info">
          <h3 className="feed-type">{alert.alertType}</h3>
          
          <div className="feed-target">
            {(alert.details?.ip_address || alert.details?.source_ip) && (
              <code className="ip-tag">
                {alert.details.ip_address || alert.details.source_ip}
              </code>
            )}
            {alert.details?.threat_score > 0 && (
              <span className="score-tag">Risk: {alert.details.threat_score}</span>
            )}
          </div>
        </div>
      </div>

      {/* AI Button */}
      <div className="feed-item-actions">
        <button className="btn-quick-ai" onClick={onAskAI} title="Analyze with AI">
          <Brain size={20} />
          <span>Ask AI</span>
        </button>
      </div>
    </div>
  );
};

export default LiveFeed;
