// OpsDashboard.js - Fixed 401 Error
import React, { useState, useEffect } from 'react';
import './OpsDashboard.css';

const OpsDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            setError('');

            const res = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();
            setStats(data);
            setLoading(false);
        } catch (err) {
            console.error('Stats error:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    if (loading && !stats) {
        return (
            <div className="ops-dashboard">
                <div className="loading">Loading dashboard statistics...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ops-dashboard">
                <div className="error-container">
                    <h2>⚠️ Failed to load dashboard statistics</h2>
                    <p>Error: {error}</p>
                    <button onClick={fetchStats} className="retry-button">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="ops-dashboard">
            <h1>📊 Operations Dashboard</h1>

            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Alerts</h3>
                    <p className="stat-number">{stats?.overview?.total || 0}</p>
                </div>
                <div className="stat-card critical">
                    <h3>Critical</h3>
                    <p className="stat-number">{stats?.overview?.criticalCount || 0}</p>
                </div>
                <div className="stat-card high">
                    <h3>High</h3>
                    <p className="stat-number">{stats?.overview?.highCount || 0}</p>
                </div>
                <div className="stat-card medium">
                    <h3>Medium</h3>
                    <p className="stat-number">{stats?.overview?.mediumCount || 0}</p>
                </div>
                <div className="stat-card low">
                    <h3>Low</h3>
                    <p className="stat-number">{stats?.overview?.lowCount || 0}</p>
                </div>
            </div>

            {stats?.engines && stats.engines.length > 0 && (
                <div className="engines-section">
                    <h2>Detection Engines</h2>
                    <div className="engines-grid">
                        {stats.engines.map((engine, idx) => (
                            <div key={idx} className="engine-card">
                                <h4>{engine._id}</h4>
                                <p>{engine.count} alerts</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OpsDashboard;
