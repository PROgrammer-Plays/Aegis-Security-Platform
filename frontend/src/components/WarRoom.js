// WarRoom.js - War Room for Critical Incident Management
import React, { useState, useEffect } from 'react';
import './WarRoom.css';

const WarRoom = () => {
    const [warRoomData, setWarRoomData] = useState({
        criticalAlerts: [],
        escalatedAlerts: [],
        correlationIncidents: [],
        total: 0
    });
    const [loading, setLoading] = useState(true);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [showEscalateModal, setShowEscalateModal] = useState(false);
    const [escalationForm, setEscalationForm] = useState({
        priority: 'High',
        reason: '',
        assignTo: '',
        notes: ''
    });

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');

    useEffect(() => {
        fetchWarRoomData();
        const interval = setInterval(fetchWarRoomData, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchWarRoomData = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/stats/war-room', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setWarRoomData(data);
            }
            setLoading(false);
        } catch (error) {
            console.error('War room error:', error);
            setLoading(false);
        }
    };

    const handleEscalate = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch(`http://localhost:5000/api/alerts/${selectedAlert._id}/escalate`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(escalationForm)
            });

            if (res.ok) {
                alert('Alert escalated successfully');
                setShowEscalateModal(false);
                setSelectedAlert(null);
                fetchWarRoomData();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleInvestigate = async (alertId) => {
        const note = prompt('Enter investigation note:');
        if (!note) return;

        try {
            const res = await fetch(`http://localhost:5000/api/alerts/${alertId}/investigate`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ note })
            });

            if (res.ok) {
                alert('Investigation started');
                fetchWarRoomData();
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleResolve = async (alertId) => {
        const notes = prompt('Enter resolution notes:');
        if (!notes) return;

        try {
            const res = await fetch(`http://localhost:5000/api/alerts/${alertId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'Resolved',
                    resolutionNotes: notes
                })
            });

            if (res.ok) {
                alert('Alert resolved');
                fetchWarRoomData();
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    if (loading) {
        return <div className="war-room"><div className="loading">Loading war room...</div></div>;
    }

    return (
        <div className="war-room">
            <div className="page-header">
                <h1>⚔️ War Room - Critical Incident Management</h1>
                <div className="war-room-stats">
                    <span className="stat-badge critical">
                        {warRoomData.criticalAlerts?.length || 0} Critical
                    </span>
                    <span className="stat-badge escalated">
                        {warRoomData.escalatedAlerts?.length || 0} Escalated
                    </span>
                    <span className="stat-badge total">
                        {warRoomData.total || 0} Total
                    </span>
                </div>
            </div>

            {warRoomData.total === 0 ? (
                <div className="empty-state">
                    <h2>✅ All Clear</h2>
                    <p>No critical incidents in the last 24 hours</p>
                </div>
            ) : (
                <>
                    {/* Escalated Alerts Section */}
                    {warRoomData.escalatedAlerts?.length > 0 && (
                        <div className="alert-section">
                            <h2>🚨 Escalated Incidents ({warRoomData.escalatedAlerts.length})</h2>
                            <div className="alerts-grid">
                                {warRoomData.escalatedAlerts.map(alert => (
                                    <div key={alert._id} className="alert-card escalated">
                                        <div className="alert-header">
                                            <span className={`severity-badge ${alert.severity?.toLowerCase()}`}>
                                                {alert.severity}
                                            </span>
                                            <span className={`priority-badge ${alert.escalationPriority?.toLowerCase()}`}>
                                                {alert.escalationPriority}
                                            </span>
                                        </div>
                                        <div className="alert-body">
                                            <h3>{alert.engine}</h3>
                                            <p className="alert-type">{alert.alertType}</p>
                                            {alert.escalationReason && (
                                                <p className="escalation-reason">
                                                    <strong>Reason:</strong> {alert.escalationReason}
                                                </p>
                                            )}
                                            {alert.assignedTo && (
                                                <p className="assigned-to">
                                                    <strong>Assigned to:</strong> {alert.assignedTo}
                                                </p>
                                            )}
                                            <p className="alert-time">
                                                {new Date(alert.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="alert-actions">
                                            {userRole === 'senior' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleInvestigate(alert._id)}
                                                        className="btn-investigate"
                                                    >
                                                        🔍 Investigate
                                                    </button>
                                                    <button 
                                                        onClick={() => handleResolve(alert._id)}
                                                        className="btn-resolve"
                                                    >
                                                        ✅ Resolve
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Critical Alerts Section */}
                    {warRoomData.criticalAlerts?.length > 0 && (
                        <div className="alert-section">
                            <h2>⚠️ Critical & High Severity ({warRoomData.criticalAlerts.length})</h2>
                            <div className="alerts-grid">
                                {warRoomData.criticalAlerts.map(alert => (
                                    <div key={alert._id} className="alert-card">
                                        <div className="alert-header">
                                            <span className={`severity-badge ${alert.severity?.toLowerCase()}`}>
                                                {alert.severity}
                                            </span>
                                            <span className="status-badge">{alert.status}</span>
                                        </div>
                                        <div className="alert-body">
                                            <h3>{alert.engine}</h3>
                                            <p className="alert-type">{alert.alertType}</p>
                                            <p className="alert-time">
                                                {new Date(alert.timestamp).toLocaleString()}
                                            </p>
                                            {alert.details && (
                                                <div className="alert-details">
                                                    {alert.details.ip_address && (
                                                        <span>IP: {alert.details.ip_address}</span>
                                                    )}
                                                    {alert.details.source_ip && (
                                                        <span>Source: {alert.details.source_ip}</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="alert-actions">
                                            {userRole === 'admin' && !alert.isEscalated && (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedAlert(alert);
                                                        setShowEscalateModal(true);
                                                    }}
                                                    className="btn-escalate"
                                                >
                                                    🚨 Escalate
                                                </button>
                                            )}
                                            {(userRole === 'admin' || userRole === 'senior') && (
                                                <>
                                                    <button 
                                                        onClick={() => handleInvestigate(alert._id)}
                                                        className="btn-investigate"
                                                    >
                                                        🔍 Investigate
                                                    </button>
                                                    <button 
                                                        onClick={() => handleResolve(alert._id)}
                                                        className="btn-resolve"
                                                    >
                                                        ✅ Resolve
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Correlation Brain Incidents */}
                    {warRoomData.correlationIncidents?.length > 0 && (
                        <div className="alert-section">
                            <h2>🧠 Correlation Brain Incidents ({warRoomData.correlationIncidents.length})</h2>
                            <div className="alerts-grid">
                                {warRoomData.correlationIncidents.map(alert => (
                                    <div key={alert._id} className="alert-card correlation">
                                        <div className="alert-header">
                                            <span className={`severity-badge ${alert.severity?.toLowerCase()}`}>
                                                {alert.severity}
                                            </span>
                                        </div>
                                        <div className="alert-body">
                                            <h3>{alert.alertType}</h3>
                                            <p className="alert-time">
                                                {new Date(alert.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Escalate Modal */}
            {showEscalateModal && selectedAlert && (
                <div className="modal-overlay" onClick={() => setShowEscalateModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>🚨 Escalate Alert</h2>
                        <form onSubmit={handleEscalate}>
                            <div className="form-group">
                                <label>Priority Level</label>
                                <select
                                    value={escalationForm.priority}
                                    onChange={e => setEscalationForm({...escalationForm, priority: e.target.value})}
                                >
                                    <option value="Normal">Normal</option>
                                    <option value="High">High</option>
                                    <option value="Critical">Critical</option>
                                    <option value="Immediate">Immediate</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Reason</label>
                                <textarea
                                    value={escalationForm.reason}
                                    onChange={e => setEscalationForm({...escalationForm, reason: e.target.value})}
                                    placeholder="Why is this being escalated?"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Assign To (optional)</label>
                                <input
                                    type="text"
                                    value={escalationForm.assignTo}
                                    onChange={e => setEscalationForm({...escalationForm, assignTo: e.target.value})}
                                    placeholder="Senior analyst username"
                                />
                            </div>
                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    value={escalationForm.notes}
                                    onChange={e => setEscalationForm({...escalationForm, notes: e.target.value})}
                                    placeholder="Additional notes"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-primary">Escalate</button>
                                <button type="button" onClick={() => setShowEscalateModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WarRoom;