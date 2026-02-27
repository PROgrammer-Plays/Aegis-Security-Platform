// src/App.js - COMPLETE with Senior Dashboard
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import io from 'socket.io-client';
import './App.css';

// --- Pages ---
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Incidents from './pages/Incidents';
import Forensics from './pages/Forensics';

// --- Admin/Senior/Employee Pages ---
import AdminDashboard from './pages/AdminDashboard';
import SeniorDashboard from './pages/SeniorDashboard'; // NEW!
import UserManagement from './pages/UserManagement';
import MySecurityStatus from './pages/MySecurityStatus';

// --- Components ---
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';

const SOCKET_SERVER_URL = "http://localhost:5000";

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [loading, setLoading] = useState(true);

  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [toast, setToast] = useState(null);

  // Auth check on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRole = localStorage.getItem('role');
    if (storedToken) {
      setToken(storedToken);
      setRole(storedRole);
    }
    setLoading(false);
  }, []);

  // Socket.IO Connection (Only if authenticated)
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
  }, [token]);

  // Data Fetching (Only if authenticated)
  useEffect(() => {
    if (!token) return;

    const fetchInitialAlerts = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/alerts?limit=100', {
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
        const response = await fetch('http://localhost:5000/api/stats', {
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
  }, [token]);

  if (loading) return <div className="app-loading">Loading...</div>;

  // If not logged in, show Login
  if (!token) {
    return <Login setToken={(t, r) => {
      localStorage.setItem('token', t);
      localStorage.setItem('role', r);
      setToken(t);
      setRole(r);
    }} />;
  }

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
