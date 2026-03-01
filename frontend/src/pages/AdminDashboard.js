// AdminDashboard.js - COMPLETE FIXED VERSION with proper navigation
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalAlerts: 0,
        criticalAlerts: 0,
        activeUsers: 0
    });
    const [warRoomData, setWarRoomData] = useState({
        criticalAlerts: [],
        escalatedAlerts: [],
        correlationIncidents: [],
        total: 0,
        escalatedCount: 0
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
            
            // Fetch stats with auth
            const statsRes = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/stats', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!statsRes.ok) {
                if (statsRes.status === 401) {
                    localStorage.clear();
                    window.location.href = '/';
                    return;
                }
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

            // Fetch war room data with auth
            const warRoomRes = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/stats/war-room', {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (warRoomRes.ok) {
                const warRoom = await warRoomRes.json();
                console.log('✅ War room data:', warRoom);
                setWarRoomData({
                    criticalAlerts: warRoom.criticalAlerts || [],
                    escalatedAlerts: warRoom.escalatedAlerts || [],
                    correlationIncidents: warRoom.correlationIncidents || [],
                    total: warRoom.total || 0,
                    escalatedCount: warRoom.escalatedCount || 0
                });
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

    const hasCriticalIncidents = (
        (warRoomData.criticalAlerts && warRoomData.criticalAlerts.length > 0) ||
        (warRoomData.escalatedAlerts && warRoomData.escalatedAlerts.length > 0) ||
        (warRoomData.correlationIncidents && warRoomData.correlationIncidents.length > 0)
    );

    return (
        <div className="admin-dashboard">
            {/* Dashboard Header */}
            <div className="dashboard-header">
                <div className="header-content">
                    <h1>🛡️ AEGIS Command Center</h1>
                    <p>Executive Operations Dashboard</p>
                </div>
            </div>

            {error && (
                <div className="error-banner">
                    <strong>Error:</strong> {error}
                    <button onClick={fetchDashboardData}>Retry</button>
                </div>
            )}

            {/* Executive KPI Cards */}
            <div className="executive-kpis">
                <div className="kpi-card total">
                    <div className="kpi-icon">
                        <span style={{fontSize: '32px'}}>👥</span>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{stats.totalUsers}</div>
                        <div className="kpi-label">Total Users</div>
                        <div className="kpi-trend">System-wide</div>
                    </div>
                </div>

                <div className="kpi-card total">
                    <div className="kpi-icon">
                        <span style={{fontSize: '32px'}}>🚨</span>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{stats.totalAlerts}</div>
                        <div className="kpi-label">Total Alerts</div>
                        <div className="kpi-trend">Last 24 hours</div>
                    </div>
                </div>

                <div className="kpi-card critical">
                    <div className="kpi-icon">
                        <span style={{fontSize: '32px'}}>⚠️</span>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{stats.criticalAlerts}</div>
                        <div className="kpi-label">Critical Alerts</div>
                        <div className="kpi-trend">Requires attention</div>
                    </div>
                </div>

                <div className="kpi-card health">
                    <div className="kpi-icon">
                        <span style={{fontSize: '32px'}}>✅</span>
                    </div>
                    <div className="kpi-content">
                        <div className="kpi-value">{stats.activeUsers}</div>
                        <div className="kpi-label">Active Users</div>
                        <div className="kpi-trend">Currently active</div>
                    </div>
                </div>
            </div>

            {/* War Room Preview */}
            <div className="dashboard-section war-room-section">
                <h2>⚔️ War Room - Critical Incidents</h2>
                {hasCriticalIncidents ? (
                    <div className="war-room-preview">
                        <div className="war-room-stats">
                            <span className="stat-badge critical">
                                {warRoomData.criticalAlerts?.length || 0} Critical/High
                            </span>
                            <span className="stat-badge escalated">
                                {warRoomData.escalatedAlerts?.length || 0} Escalated
                            </span>
                            <span className="stat-badge correlation">
                                {warRoomData.correlationIncidents?.length || 0} Correlation
                            </span>
                            <span className="stat-badge total">
                                {(warRoomData.criticalAlerts?.length || 0) + 
                                 (warRoomData.escalatedAlerts?.length || 0) + 
                                 (warRoomData.correlationIncidents?.length || 0)} Total
                            </span>
                        </div>
                        <div className="recent-incidents">
                            {warRoomData.criticalAlerts?.slice(0, 5).map((alert, idx) => (
                                <div key={`crit-${idx}`} className={`incident-item ${alert.isEscalated ? 'escalated' : ''}`}>
                                    <div className="incident-severity">
                                        <span className={`severity-badge severity-${alert.severity?.toLowerCase()}`}>
                                            {alert.severity}
                                        </span>
                                        {alert.isEscalated && (
                                            <span className="badge escalated-badge">
                                                {alert.escalationPriority || 'ESCALATED'}
                                            </span>
                                        )}
                                        {alert.engine === 'CORRELATION BRAIN' && (
                                            <span className="badge correlation-badge">
                                                CORRELATION
                                            </span>
                                        )}
                                    </div>
                                    <div className="incident-details">
                                        <strong>{alert.engine}</strong>
                                        <span>{alert.alertType}</span>
                                    </div>
                                    <div className="incident-meta">
                                        {alert.details?.ip_address && (
                                            <span className="meta-tag">🎯 {alert.details.ip_address}</span>
                                        )}
                                        {alert.details?.target_entity && (
                                            <span className="meta-tag">🎯 {alert.details.target_entity}</span>
                                        )}
                                    </div>
                                    <div className="incident-time">
                                        {new Date(alert.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button 
                            className="view-all-link"
                            onClick={() => navigate('/incidents')}
                        >
                            View All Incidents in War Room →
                        </button>
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>✅ No critical incidents in the last 24 hours</p>
                        <p className="empty-subtext">All systems operating normally</p>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="dashboard-section">
                <h2>⚡ Quick Actions</h2>
                <div className="quick-actions-grid">
                    <button 
                        className="action-card"
                        onClick={() => navigate('/users')}
                    >
                        <div className="action-icon">👥</div>
                        <div className="action-content">
                            <h3>User Management</h3>
                            <p>Manage users, roles, and permissions</p>
                        </div>
                    </button>

                    <button 
                        className="action-card"
                        onClick={() => navigate('/incidents')}
                    >
                        <div className="action-icon">⚔️</div>
                        <div className="action-content">
                            <h3>War Room</h3>
                            <p>Monitor critical incidents</p>
                        </div>
                    </button>

                    <button 
                        className="action-card"
                        onClick={() => navigate('/forensics')}
                    >
                        <div className="action-icon">🔍</div>
                        <div className="action-content">
                            <h3>Forensics</h3>
                            <p>Investigate security events</p>
                        </div>
                    </button>

                    <button 
                        className="action-card"
                        onClick={() => navigate('/feed')}
                    >
                        <div className="action-icon">📡</div>
                        <div className="action-content">
                            <h3>Live Feed</h3>
                            <p>Real-time alert monitoring</p>
                        </div>
                    </button>
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