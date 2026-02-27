// AdminDashboard.js - Complete Admin Dashboard with All Features
import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAlerts: 0,
        criticalAlerts: 0,
        activeUsers: 0
    });
    const [warRoomData, setWarRoomData] = useState({
        criticalAlerts: [],
        escalatedAlerts: [],
        total: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log('🔍 Fetching admin dashboard data...');
            
            // Fetch stats
            const statsRes = await fetch('http://localhost:5000/api/stats', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!statsRes.ok) {
                throw new Error(`Stats API error: ${statsRes.status}`);
            }
            
            const statsData = await statsRes.json();
            console.log('✅ Stats data:', statsData);
            
            setStats({
                totalUsers: statsData.overview?.total || 0,
                totalAlerts: statsData.overview?.total || 0,
                criticalAlerts: statsData.overview?.criticalCount || 0,
                activeUsers: statsData.overview?.recent || 0
            });

            // Fetch war room data
            const warRoomRes = await fetch('http://localhost:5000/api/stats/war-room', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (warRoomRes.ok) {
                const warRoom = await warRoomRes.json();
                console.log('✅ War room data:', warRoom);
                setWarRoomData(warRoom);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('❌ Dashboard error:', error);
            setError(error.message);
            setLoading(false);
        }
    };

    if (loading && !stats.totalAlerts) {
        return (
            <div className="admin-dashboard">
                <div className="loading">Loading dashboard...</div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <h1>🛡️ AEGIS Command Center</h1>
                <p className="subtitle">Executive Operations Dashboard</p>
            </div>

            {error && (
                <div className="error-banner">
                    <strong>Error:</strong> {error}
                    <button onClick={fetchDashboardData}>Retry</button>
                </div>
            )}

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon">👥</div>
                    <div className="kpi-content">
                        <h3>Total Users</h3>
                        <p className="kpi-value">{stats.totalUsers}</p>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon">🚨</div>
                    <div className="kpi-content">
                        <h3>Total Alerts</h3>
                        <p className="kpi-value">{stats.totalAlerts}</p>
                    </div>
                </div>
                <div className="kpi-card critical">
                    <div className="kpi-icon">⚠️</div>
                    <div className="kpi-content">
                        <h3>Critical Alerts</h3>
                        <p className="kpi-value">{stats.criticalAlerts}</p>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon">✅</div>
                    <div className="kpi-content">
                        <h3>Active Users</h3>
                        <p className="kpi-value">{stats.activeUsers}</p>
                    </div>
                </div>
            </div>

            {/* War Room Preview */}
            <div className="dashboard-section">
                <h2>⚔️ War Room - Critical Incidents</h2>
                {warRoomData.total > 0 ? (
                    <div className="war-room-preview">
                        <div className="war-room-stats">
                            <span className="stat-badge critical">
                                {warRoomData.criticalAlerts?.length || 0} Critical
                            </span>
                            <span className="stat-badge escalated">
                                {warRoomData.escalatedAlerts?.length || 0} Escalated
                            </span>
                            <span className="stat-badge total">
                                {warRoomData.total} Total
                            </span>
                        </div>
                        <div className="recent-incidents">
                            {warRoomData.criticalAlerts?.slice(0, 5).map((alert, idx) => (
                                <div key={idx} className={`incident-item ${alert.isEscalated ? 'escalated' : ''}`}>
                                    <div className="incident-severity">
                                        <span className={`badge ${alert.severity?.toLowerCase()}`}>
                                            {alert.severity}
                                        </span>
                                        {alert.isEscalated && (
                                            <span className="badge escalated-badge">
                                                {alert.escalationPriority}
                                            </span>
                                        )}
                                    </div>
                                    <div className="incident-details">
                                        <strong>{alert.engine}</strong>
                                        <span>{alert.alertType}</span>
                                    </div>
                                    <div className="incident-time">
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <a href="/war-room" className="view-all-link">
                            View All Incidents →
                        </a>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>✅ No critical incidents in the last 24 hours</p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section">
                <h2>⚡ Quick Actions</h2>
                <div className="quick-actions">
                    <a href="/user-management" className="action-card">
                        <div className="action-icon">👥</div>
                        <div className="action-content">
                            <h3>User Management</h3>
                            <p>Manage users, roles, and permissions</p>
                        </div>
                    </a>
                    <a href="/war-room" className="action-card">
                        <div className="action-icon">⚔️</div>
                        <div className="action-content">
                            <h3>War Room</h3>
                            <p>Monitor critical incidents</p>
                        </div>
                    </a>
                    <a href="/forensics" className="action-card">
                        <div className="action-icon">🔍</div>
                        <div className="action-content">
                            <h3>Forensics</h3>
                            <p>Investigate security events</p>
                        </div>
                    </a>
                </div>
            </div>

            {/* System Status */}
            <div className="dashboard-section">
                <h2>📊 System Status</h2>
                <div className="status-grid">
                    <div className="status-item">
                        <span className="status-label">Backend</span>
                        <span className="status-indicator online">Online</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">Database</span>
                        <span className="status-indicator online">Connected</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">WebSocket</span>
                        <span className="status-indicator online">Active</span>
                    </div>
                    <div className="status-item">
                        <span className="status-label">Last Updated</span>
                        <span className="status-time">{new Date().toLocaleTimeString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
