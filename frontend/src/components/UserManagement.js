// UserManagement.js - Enhanced User Management with All Admin Features
import React, { useState, useEffect } from 'react';
import './UserManagement.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [customRoles, setCustomRoles] = useState([]);
    const [unlockRequests, setUnlockRequests] = useState([]);
    const [passwordResetRequests, setPasswordResetRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        fullName: '',
        email: '',
        role: 'employee',
        customRole: '',
        assigned_ip: '',
        assigned_host: ''
    });
    const [roleForm, setRoleForm] = useState({
        name: '',
        displayName: '',
        description: '',
        permissions: {
            viewAlerts: true,
            createAlerts: false,
            updateAlerts: false,
            deleteAlerts: false,
            viewUsers: false,
            manageUsers: false,
            viewStats: true,
            viewDetailedStats: false,
            accessWarRoom: false,
            accessForensics: false
        }
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchAllData();
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // Fetch users
            const usersRes = await fetch('http://localhost:5000/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (usersRes.ok) {
                const data = await usersRes.json();
                setUsers(data.users || []);
            }

            // Fetch custom roles
            const rolesRes = await fetch('http://localhost:5000/api/admin/custom-roles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (rolesRes.ok) {
                const data = await rolesRes.json();
                setCustomRoles(data.roles || []);
            }

            // Fetch unlock requests
            const unlockRes = await fetch('http://localhost:5000/api/admin/unlock-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (unlockRes.ok) {
                const data = await unlockRes.json();
                setUnlockRequests(data.requests || []);
            }

            // Fetch password reset requests
            const resetRes = await fetch('http://localhost:5000/api/admin/password-reset-requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resetRes.ok) {
                const data = await resRes.json();
                setPasswordResetRequests(data.requests || []);
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const handleLockUser = async (userId) => {
        const reason = prompt('Enter reason for locking this account:');
        if (!reason) return;

        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/lock`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (res.ok) {
                alert('User account locked successfully');
                fetchAllData();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error locking user: ' + error.message);
        }
    };

    const handleUnlockUser = async (userId) => {
        if (!confirm('Unlock this user account?')) return;

        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/unlock`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('User account unlocked successfully');
                fetchAllData();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error unlocking user: ' + error.message);
        }
    };

    const handleEnablePasswordlessLogin = async (userId) => {
        if (!confirm('Enable passwordless login for this user? They will need to set a new password on next login.')) return;

        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/approve-password-reset`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('Passwordless login enabled. User can now login without password and will be prompted to set a new one.');
                fetchAllData();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleToggleStatus = async (userId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${userId}/toggle-status`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchAllData();
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Delete this user permanently?')) return;

        try {
            const res = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                alert('User deleted successfully');
                fetchAllData();
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch('http://localhost:5000/api/admin/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userForm)
            });

            if (res.ok) {
                alert('User created successfully');
                setShowUserModal(false);
                setUserForm({
                    username: '',
                    password: '',
                    fullName: '',
                    email: '',
                    role: 'employee',
                    customRole: '',
                    assigned_ip: '',
                    assigned_host: ''
                });
                fetchAllData();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch('http://localhost:5000/api/admin/custom-roles', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(roleForm)
            });

            if (res.ok) {
                alert('Custom role created successfully');
                setShowRoleModal(false);
                setRoleForm({
                    name: '',
                    displayName: '',
                    description: '',
                    permissions: {
                        viewAlerts: true,
                        createAlerts: false,
                        updateAlerts: false,
                        deleteAlerts: false,
                        viewUsers: false,
                        manageUsers: false,
                        viewStats: true,
                        viewDetailedStats: false,
                        accessWarRoom: false,
                        accessForensics: false
                    }
                });
                fetchAllData();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    if (loading) {
        return <div className="user-management"><div className="loading">Loading...</div></div>;
    }

    return (
        <div className="user-management">
            <div className="page-header">
                <h1>👥 User Management</h1>
                <div className="header-actions">
                    <button onClick={() => setShowRoleModal(true)} className="btn-secondary">
                        ✨ Create Custom Role
                    </button>
                    <button onClick={() => setShowUserModal(true)} className="btn-primary">
                        ➕ Create User
                    </button>
                </div>
            </div>

            {/* Pending Requests Section */}
            {(unlockRequests.length > 0 || passwordResetRequests.length > 0) && (
                <div className="requests-section">
                    <h2>📬 Pending Requests</h2>
                    
                    {unlockRequests.length > 0 && (
                        <div className="request-group">
                            <h3>🔓 Unlock Requests ({unlockRequests.length})</h3>
                            {unlockRequests.map(req => (
                                <div key={req._id} className="request-card">
                                    <div className="request-info">
                                        <strong>{req.username}</strong>
                                        <p>{req.unlockRequestMessage}</p>
                                        <small>Requested: {new Date(req.unlockRequestedAt).toLocaleString()}</small>
                                    </div>
                                    <button 
                                        onClick={() => handleUnlockUser(req._id)}
                                        className="btn-approve"
                                    >
                                        Approve
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {passwordResetRequests.length > 0 && (
                        <div className="request-group">
                            <h3>🔒 Password Reset Requests ({passwordResetRequests.length})</h3>
                            {passwordResetRequests.map(req => (
                                <div key={req._id} className="request-card">
                                    <div className="request-info">
                                        <strong>{req.username}</strong>
                                        <p>{req.passwordResetRequestMessage}</p>
                                        <small>Requested: {new Date(req.passwordResetRequestedAt).toLocaleString()}</small>
                                    </div>
                                    <button 
                                        onClick={() => handleEnablePasswordlessLogin(req._id)}
                                        className="btn-approve"
                                    >
                                        Approve Passwordless Login
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Users Table */}
            <div className="users-section">
                <h2>All Users ({users.length})</h2>
                <div className="users-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Username</th>
                                <th>Full Name</th>
                                <th>Role</th>
                                <th>Assigned IP</th>
                                <th>Last Login</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user._id} className={user.isLocked ? 'locked-row' : ''}>
                                    <td>
                                        {user.username}
                                        {user.allowPasswordlessLogin && (
                                            <span className="badge passwordless">Passwordless</span>
                                        )}
                                    </td>
                                    <td>{user.fullName || '-'}</td>
                                    <td>
                                        <span className={`role-badge ${user.role}`}>
                                            {user.role}
                                        </span>
                                        {user.customRole && (
                                            <span className="custom-role-name">{user.customRole}</span>
                                        )}
                                    </td>
                                    <td>{user.assigned_ip || '-'}</td>
                                    <td>
                                        {user.lastLogin 
                                            ? new Date(user.lastLogin).toLocaleString()
                                            : 'Never'
                                        }
                                    </td>
                                    <td>
                                        {user.isLocked ? (
                                            <span className="status-badge locked">🔒 Locked</span>
                                        ) : user.isActive ? (
                                            <span className="status-badge active">✅ Active</span>
                                        ) : (
                                            <span className="status-badge inactive">❌ Inactive</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {user.isLocked ? (
                                                <button 
                                                    onClick={() => handleUnlockUser(user._id)}
                                                    className="btn-unlock"
                                                    title="Unlock Account"
                                                >
                                                    🔓 Unlock
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleLockUser(user._id)}
                                                    className="btn-lock"
                                                    title="Lock Account"
                                                >
                                                    🔒 Lock
                                                </button>
                                            )}
                                            
                                            <button 
                                                onClick={() => handleToggleStatus(user._id)}
                                                className="btn-toggle"
                                                title={user.isActive ? 'Disable' : 'Enable'}
                                            >
                                                {user.isActive ? '❌ Disable' : '✅ Enable'}
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleEnablePasswordlessLogin(user._id)}
                                                className="btn-passwordless"
                                                title="Enable Passwordless Login"
                                            >
                                                🔓 Passwordless
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleDeleteUser(user._id)}
                                                className="btn-delete"
                                                title="Delete User"
                                            >
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showUserModal && (
                <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Create New User</h2>
                        <form onSubmit={handleCreateUser}>
                            <input
                                type="text"
                                placeholder="Username"
                                value={userForm.username}
                                onChange={e => setUserForm({...userForm, username: e.target.value})}
                                required
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={userForm.password}
                                onChange={e => setUserForm({...userForm, password: e.target.value})}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Full Name"
                                value={userForm.fullName}
                                onChange={e => setUserForm({...userForm, fullName: e.target.value})}
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={userForm.email}
                                onChange={e => setUserForm({...userForm, email: e.target.value})}
                            />
                            <select
                                value={userForm.role}
                                onChange={e => setUserForm({...userForm, role: e.target.value})}
                            >
                                <option value="employee">Employee</option>
                                <option value="senior">Senior Analyst</option>
                                <option value="admin">Admin</option>
                                <option value="custom">Custom Role</option>
                            </select>
                            {userForm.role === 'custom' && (
                                <select
                                    value={userForm.customRole}
                                    onChange={e => setUserForm({...userForm, customRole: e.target.value})}
                                >
                                    <option value="">Select Custom Role</option>
                                    {customRoles.map(role => (
                                        <option key={role._id} value={role.name}>
                                            {role.displayName}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <input
                                type="text"
                                placeholder="Assigned IP (for employees)"
                                value={userForm.assigned_ip}
                                onChange={e => setUserForm({...userForm, assigned_ip: e.target.value})}
                            />
                            <input
                                type="text"
                                placeholder="Assigned Host"
                                value={userForm.assigned_host}
                                onChange={e => setUserForm({...userForm, assigned_host: e.target.value})}
                            />
                            <div className="modal-actions">
                                <button type="submit" className="btn-primary">Create User</button>
                                <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Role Modal */}
            {showRoleModal && (
                <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Create Custom Role</h2>
                        <form onSubmit={handleCreateRole}>
                            <input
                                type="text"
                                placeholder="Role Name (e.g., analyst)"
                                value={roleForm.name}
                                onChange={e => setRoleForm({...roleForm, name: e.target.value})}
                                required
                            />
                            <input
                                type="text"
                                placeholder="Display Name (e.g., Security Analyst)"
                                value={roleForm.displayName}
                                onChange={e => setRoleForm({...roleForm, displayName: e.target.value})}
                                required
                            />
                            <textarea
                                placeholder="Description"
                                value={roleForm.description}
                                onChange={e => setRoleForm({...roleForm, description: e.target.value})}
                            />
                            <h3>Permissions</h3>
                            <div className="permissions-grid">
                                {Object.keys(roleForm.permissions).map(perm => (
                                    <label key={perm}>
                                        <input
                                            type="checkbox"
                                            checked={roleForm.permissions[perm]}
                                            onChange={e => setRoleForm({
                                                ...roleForm,
                                                permissions: {
                                                    ...roleForm.permissions,
                                                    [perm]: e.target.checked
                                                }
                                            })}
                                        />
                                        {perm.replace(/([A-Z])/g, ' $1').trim()}
                                    </label>
                                ))}
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn-primary">Create Role</button>
                                <button type="button" onClick={() => setShowRoleModal(false)} className="btn-secondary">
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

export default UserManagement;
