// src/App.js - AEGIS Command Center
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';

// Import pages
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Incidents from './pages/Incidents';
import Forensics from './pages/Forensics';

// Import components
import Toast from './components/Toast';

const SOCKET_SERVER_URL = "http://localhost:5000";

function App() {
  const [alerts, setAlerts] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState(null);

  // Socket.io connection
  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to AEGIS backend');
    });
    
    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from AEGIS backend');
    });
    
    socket.on('new-alert', (newAlert) => {
      console.log('🚨 New alert received:', newAlert.alertType);
      
      // Add to alerts list
      setAlerts(prevAlerts => [newAlert, ...prevAlerts]);
      
      // Show toast notification
      if (newAlert.engine === "CORRELATION BRAIN") {
        // Critical incident - special notification
        setToast({
          type: 'critical',
          title: '🚨 CRITICAL INCIDENT',
          message: newAlert.alertType,
          duration: 10000
        });
        
        // Play sound (optional)
        playAlertSound();
      } else if (newAlert.severity === 'Critical') {
        setToast({
          type: 'error',
          title: 'Critical Alert',
          message: `${newAlert.engine}: ${newAlert.alertType}`,
          duration: 5000
        });
      }
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchInitialAlerts();
    fetchStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchInitialAlerts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/alerts?limit=100');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const playAlertSound = () => {
    // Optional: Add alert sound
    // const audio = new Audio('/alert-sound.mp3');
    // audio.play().catch(e => console.log('Could not play sound'));
  };

  return (
    <Router>
      <div className="app-container">
        <Navigation isConnected={isConnected} />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard stats={stats} refreshStats={fetchStats} />} />
            <Route path="/feed" element={<LiveFeed alerts={alerts} />} />
            <Route path="/incidents" element={<Incidents alerts={alerts} />} />
            <Route path="/forensics" element={<Forensics />} />
          </Routes>
        </main>
        
        {toast && (
          <Toast 
            {...toast} 
            onClose={() => setToast(null)} 
          />
        )}
      </div>
    </Router>
  );
}

// Navigation Component
function Navigation({ isConnected }) {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/feed', label: 'Live Feed', icon: '📡' },
    { path: '/incidents', label: 'Incidents', icon: '🚨' },
    { path: '/forensics', label: 'Forensics', icon: '🔍' }
  ];
  
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">🛡️ AEGIS</h1>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      <ul className="nav-menu">
        {navItems.map(item => (
          <li key={item.path} className={location.pathname === item.path ? 'active' : ''}>
            <Link to={item.path}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      
      <div className="sidebar-footer">
        <div className="system-info">
          <div className="info-item">
            <span className="info-label">Version</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-item">
            <span className="info-label">System</span>
            <span className="info-value">Operational</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default App;
