// src/App.js - Merged Real-Time + RBAC
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';

// --- Import Pages (From your local files) ---
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Incidents from './pages/Incidents';
import Forensics from './pages/Forensics';

// --- Import Admin/Employee Pages (From RBAC Sprint) ---
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import MySecurityStatus from './pages/MySecurityStatus';

// --- Import Components ---
import Toast from './components/Toast';

const SOCKET_SERVER_URL = "http://localhost:5000";

function App() {
  // --- 1. Combined State (Auth + Data) ---
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [loading, setLoading] = useState(true);

  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState(null);

  // --- 2. Auth Check on Mount ---
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (storedToken) {
      setToken(storedToken);
      setRole(storedRole);
    }
    setLoading(false);
  }, []);

  // --- 3. Socket.IO Connection (Only runs if authenticated) ---
  useEffect(() => {
    if (!token) return;

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
      
      setAlerts(prevAlerts => [newAlert, ...prevAlerts]);
      
      // Toast Logic from Old Code
      if (newAlert.engine === "CORRELATION BRAIN") {
        setToast({
          type: 'critical',
          title: '🚨 CRITICAL INCIDENT',
          message: newAlert.alertType,
          duration: 10000
        });
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
  }, [token]);

  // --- 4. Data Fetching (Only runs if authenticated) ---
  useEffect(() => {
    if (!token) return;

    const fetchInitialAlerts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/alerts?limit=100', {
            headers: { 'Authorization': token }
        });
        const data = await response.json();
        setAlerts(Array.isArray(data) ? data : data.alerts || []);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/stats', {
            headers: { 'Authorization': token }
        });
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchInitialAlerts();
    fetchStats();
    
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // --- 5. Render Logic ---

  if (loading) return <div className="app-loading">Loading...</div>;

  // If not logged in, show Login
  if (!token) {
    return <Login setToken={(t, r) => {
        localStorage.setItem('token', t);
        localStorage.setItem('role', r); // Ensure Login page passes role back
        setToken(t);
        setRole(r);
    }} />;
  }

  return (
    <Router>
      <div className="app-container">
        {/* Pass role to Navigation to hide/show links */}
        <Navigation isConnected={isConnected} role={role} />
        
        <main className="main-content">
          <Routes>
            {/* --- ADMIN ROUTES --- */}
            {role === 'admin' && (
              <>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/admin-dashboard" element={<AdminDashboard />} />
                <Route path="/users" element={<UserManagement />} />
                {/* Admin can also view operational pages */}
                <Route path="/dashboard" element={<Dashboard stats={stats} />} />
                <Route path="/feed" element={<LiveFeed alerts={alerts} />} />
                <Route path="/incidents" element={<Incidents alerts={alerts} />} />
                <Route path="/forensics" element={<Forensics />} />
              </>
            )}
            
            {/* --- SENIOR ROUTES --- */}
            {role === 'senior' && (
              <>
                <Route path="/" element={<Dashboard stats={stats} />} />
                <Route path="/dashboard" element={<Dashboard stats={stats} />} />
                <Route path="/feed" element={<LiveFeed alerts={alerts} />} />
                <Route path="/incidents" element={<Incidents alerts={alerts} />} />
                <Route path="/forensics" element={<Forensics />} />
              </>
            )}
            
            {/* --- EMPLOYEE ROUTES --- */}
            {role === 'employee' && (
              <>
                <Route path="/" element={<MySecurityStatus alerts={alerts} />} />
                <Route path="/my-status" element={<MySecurityStatus alerts={alerts} />} />
              </>
            )}

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
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

// --- Combined Navigation Component ---
function Navigation({ isConnected, role }) {
  const location = useLocation();
  
  // Define menu items per role
  let navItems = [];

  if (role === 'admin') {
    navItems = [
        { path: '/', label: 'Admin Overview', icon: '👑' },
        { path: '/users', label: 'User Mgmt', icon: '👥' },
        { path: '/dashboard', label: 'Ops Dashboard', icon: '📊' },
        { path: '/feed', label: 'Live Feed', icon: '📡' },
        { path: '/incidents', label: 'War Room', icon: '🚨' },
        { path: '/forensics', label: 'Forensics', icon: '🔍' }
    ];
  } else if (role === 'senior') {
    navItems = [
        { path: '/', label: 'Dashboard', icon: '📊' },
        { path: '/feed', label: 'Live Feed', icon: '📡' },
        { path: '/incidents', label: 'War Room', icon: '🚨' },
        { path: '/forensics', label: 'Forensics', icon: '🔍' }
    ];
  } else if (role === 'employee') {
    navItems = [
        { path: '/', label: 'My Status', icon: '🛡️' }
    ];
  }
  
  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <h1 className="logo">🛡️ AEGIS</h1>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="status-dot"></span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
        <div className="user-role-badge">{role ? role.toUpperCase() : ''}</div>
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
        <button onClick={() => {
            localStorage.clear();
            window.location.reload();
        }} className="logout-btn">
            Sign Out
        </button>
      </div>
    </nav>
  );
}

export default App;