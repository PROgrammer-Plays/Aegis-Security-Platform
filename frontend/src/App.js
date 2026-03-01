// src/App.js - UPDATED with Password Change Enforcement
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';
import './styles/mobile-responsive.css';

// --- Pages ---
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Incidents from './pages/Incidents';
import Forensics from './pages/Forensics';

// --- Admin/Senior/Employee Pages ---
import AdminDashboard from './pages/AdminDashboard';
import SeniorDashboard from './pages/SeniorDashboard';
import UserManagement from './pages/UserManagement';
import MySecurityStatus from './pages/MySecurityStatus';

// --- Password Reset Pages ---
import RequestPasswordReset from './pages/RequestPasswordReset';
import PasswordReset from './pages/PasswordReset';

// --- Components ---
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import ChangePasswordModal from './components/ChangePasswordModal'; // NEW!

const SOCKET_SERVER_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [mustChangePassword, setMustChangePassword] = useState(localStorage.getItem('mustChangePassword') === 'true'); // NEW!
  const [passwordChangeReason, setPasswordChangeReason] = useState(localStorage.getItem('passwordChangeReason') || 'temporary'); // NEW!
  const [loading, setLoading] = useState(true);

  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState(null);

  // Auth check on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    const storedMustChange = localStorage.getItem('mustChangePassword') === 'true';
    const storedReason = localStorage.getItem('passwordChangeReason') || 'temporary';
    
    if (storedToken) {
      setToken(storedToken);
      setRole(storedRole);
      setMustChangePassword(storedMustChange);
      setPasswordChangeReason(storedReason);
    }
    setLoading(false);
  }, []);

  // Socket.IO Connection (Only if authenticated AND password changed)
  useEffect(() => {
    if (!token || mustChangePassword) return;

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
      
      // Toast notifications
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
  }, [token, mustChangePassword]);

  // Data Fetching (Only if authenticated AND password changed)
  useEffect(() => {
    if (!token || mustChangePassword) return;

    const fetchInitialAlerts = async () => {
      try {
        const response = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/alerts?limit=100', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setAlerts(Array.isArray(data) ? data : data.alerts || []);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
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
  }, [token, mustChangePassword]);

  // Handle password changed - logout and redirect to login
  const handlePasswordChanged = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setMustChangePassword(false);
    window.location.href = '/login';
  };

  if (loading) return <div className="app-loading">Loading...</div>;

  // PUBLIC ROUTES (No authentication required)
  if (!token) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login setToken={(t, r, mustChange, reason) => {
            localStorage.setItem('token', t);
            localStorage.setItem('role', r);
            localStorage.setItem('mustChangePassword', mustChange ? 'true' : 'false');
            localStorage.setItem('passwordChangeReason', reason || 'temporary');
            setToken(t);
            setRole(r);
            setMustChangePassword(mustChange || false);
            setPasswordChangeReason(reason || 'temporary');
          }} />} />
          
          {/* Password Reset Routes */}
          <Route path="/request-password-reset" element={<RequestPasswordReset />} />
          <Route path="/reset-password/:token" element={<PasswordReset />} />
          
          {/* Redirect all other routes to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // FORCE PASSWORD CHANGE (if mustChangePassword is true)
  if (mustChangePassword) {
    return (
      <ChangePasswordModal 
        reason={passwordChangeReason}
        onPasswordChanged={handlePasswordChanged}
      />
    );
  }

  // AUTHENTICATED ROUTES (normal dashboard access)
  return (
    <Router>
      <div className="app-container">
        <Sidebar isConnected={isConnected} />
        
        <main className="main-content">
          <Routes>
            {/* --- ADMIN ROUTES --- */}
            {role === 'admin' && (
              <>
                <Route path="/" element={<Navigate to="/admin-dashboard" />} />
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
                <Route path="/" element={<Navigate to="/senior-dashboard" />} />
                <Route path="/senior-dashboard" element={<SeniorDashboard />} />
                <Route path="/dashboard" element={<Dashboard stats={stats} />} />
                <Route path="/feed" element={<LiveFeed alerts={alerts} />} />
                <Route path="/incidents" element={<Incidents alerts={alerts} />} />
                <Route path="/forensics" element={<Forensics />} />
              </>
            )}
            
            {/* --- EMPLOYEE ROUTES --- */}
            {role === 'employee' && (
              <>
                <Route path="/" element={<Navigate to="/my-status" />} />
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

export default App;