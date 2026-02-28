// src/pages/UserManagement.js - COMPLETE with Master Reset Button
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, Lock, Unlock, Key, MoreVertical, AlertTriangle } from 'lucide-react';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showMasterResetModal, setShowMasterResetModal] = useState(false); // NEW!
  const [editingUser, setEditingUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [masterResetConfirmation, setMasterResetConfirmation] = useState(''); // NEW!
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'employee',
    fullName: '',
    email: '',
    assigned_ip: '',
    assigned_host: ''
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.users || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        const response = await fetch(`http://localhost:5000/api/admin/users/${editingUser._id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          alert('✅ User updated successfully');
          fetchUsers();
          closeModal();
        } else {
          const error = await response.json();
          alert(`❌ Error: ${error.error}`);
        }
      } else {
        const response = await fetch('http://localhost:5000/api/admin/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          alert('✅ User created successfully');
          fetchUsers();
          closeModal();
        } else {
          const error = await response.json();
          alert(`❌ Error: ${error.error}`);
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      alert('❌ Failed to save user');
    }
  };

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('✅ User deleted successfully');
        fetchUsers();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('❌ Failed to delete user');
    }
  };

  const handleResetPassword = async (user) => {
    setResetUser(user);
    setTempPassword('');
    
    try {
      const response = await fetch(`http://localhost:5000/api/admin/generate-temp-password/${user._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTempPassword(data.tempPassword);
        setShowResetModal(true);
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error generating temp password:', error);
      alert('❌ Failed to generate temporary password');
    }
  };

  const handleLockUser = async (userId, username) => {
    const reason = prompt(`Enter reason for locking "${username}"'s account:`);
    if (!reason) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}/lock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert(`✅ Account locked successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error locking user:', error);
      alert('❌ Failed to lock account');
    }
  };

  const handleUnlockUser = async (userId, username) => {
    const confirmed = window.confirm(`Unlock "${username}"'s account?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}/unlock`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert(`✅ Account unlocked successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        alert(`❌ Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error unlocking user:', error);
      alert('❌ Failed to unlock account');
    }
  };

  // MASTER RESET - NEW!
  const handleMasterReset = () => {
    setMasterResetConfirmation('');
    setShowMasterResetModal(true);
  };

  const executeMasterReset = async () => {
    if (masterResetConfirmation !== 'RESET_ALL_USERS') {
      alert('❌ Invalid confirmation code. You must type: RESET_ALL_USERS');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/admin/master-reset-passwords', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmationCode: masterResetConfirmation })
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          `✅ MASTER RESET SUCCESSFUL!\n\n` +
          `${data.affectedUsers} users affected.\n\n` +
          `What happens next:\n` +
          `• All affected users will see a password change screen on next login\n` +
          `• They can use their OLD password as a temporary password\n` +
          `• They MUST change their password before accessing the system\n` +
          `• Their old password will expire in 24 hours`
        );
        setShowMasterResetModal(false);
        fetchUsers();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Master reset error:', error);
      alert('❌ Failed to perform master reset');
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'employee',
      fullName: '',
      email: '',
      assigned_ip: '',
      assigned_host: ''
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      fullName: user.fullName || '',
      email: user.email || '',
      assigned_ip: user.assigned_ip || '',
      assigned_host: user.assigned_host || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetUser(null);
    setTempPassword('');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="user-management loading">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management">
      {/* Header */}
      <header className="page-header">
        <div>
          <h1>
            <Users size={32} />
            User Management
          </h1>
          <p>Manage system users and access control</p>
        </div>
        
        {/* Action Buttons - NEW LAYOUT! */}
        <div className="header-actions">
          <button className="btn-create" onClick={openCreateModal}>
            <Plus size={20} />
            Create User
          </button>
          
          {/* MASTER RESET BUTTON - NEW! */}
          <button className="btn-master-reset" onClick={handleMasterReset}>
            <AlertTriangle size={20} />
            Master Reset All Passwords
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="user-stats">
        <div className="stat-card">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">Total Users</div>
        </div>
        <div className="stat-card admin">
          <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
          <div className="stat-label">Administrators</div>
        </div>
        <div className="stat-card senior">
          <div className="stat-value">{users.filter(u => u.role === 'senior').length}</div>
          <div className="stat-label">Senior Analysts</div>
        </div>
        <div className="stat-card employee">
          <div className="stat-value">{users.filter(u => u.role === 'employee').length}</div>
          <div className="stat-label">Employees</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table-clean">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Assigned IP</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar-small">
                      {(user.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="user-info-cell">
                      <div className="user-name-cell">{user.fullName || user.username}</div>
                      <div className="user-email-cell">{user.email || `@${user.username}`}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-indicator ${user.isLocked ? 'locked' : 'active'}`}>
                    {user.isLocked ? '🔒 Locked' : '✓ Active'}
                  </span>
                </td>
                <td className="ip-cell">
                  {user.assigned_ip ? (
                    <code className="ip-code">{user.assigned_ip}</code>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  <ActionsDropdown
                    user={user}
                    isOpen={openDropdown === user._id}
                    onToggle={() => setOpenDropdown(openDropdown === user._id ? null : user._id)}
                    onEdit={() => openEditModal(user)}
                    onDelete={() => handleDelete(user._id, user.username)}
                    onResetPassword={() => handleResetPassword(user)}
                    onLock={() => handleLockUser(user._id, user.username)}
                    onUnlock={() => handleUnlockUser(user._id, user.username)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                    disabled={editingUser !== null}
                  />
                </div>

                <div className="form-group">
                  <label>Password {!editingUser && '*'}</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave blank to keep current' : ''}
                  />
                </div>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required
                  >
                    <option value="employee">Employee</option>
                    <option value="senior">Senior Analyst</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Assigned IP</label>
                  <input
                    type="text"
                    value={formData.assigned_ip}
                    onChange={(e) => setFormData({...formData, assigned_ip: e.target.value})}
                    placeholder="e.g., 192.168.1.100"
                  />
                </div>

                <div className="form-group full-width">
                  <label>Assigned Hostname</label>
                  <input
                    type="text"
                    value={formData.assigned_host}
                    onChange={(e) => setFormData({...formData, assigned_host: e.target.value})}
                    placeholder="e.g., DESKTOP-ABC123"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Password Modal */}
      {showResetModal && resetUser && (
        <div className="modal-overlay" onClick={closeResetModal}>
          <div className="modal-content password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Temporary Password Generated</h2>
              <button className="modal-close" onClick={closeResetModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="success-message">
                <Shield size={48} color="#00C851" />
                <p>Temporary password generated for <strong>{resetUser.username}</strong></p>
              </div>

              <div className="password-display">
                <label>Temporary Password:</label>
                <div className="password-box">
                  <code className="temp-password">{tempPassword}</code>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(tempPassword)}
                    type="button"
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className="info-box warning">
                <h4>⚠️ Important:</h4>
                <ul>
                  <li>This password expires in <strong>24 hours</strong></li>
                  <li>User must change it on first login</li>
                  <li>Send this password securely to the user</li>
                </ul>
              </div>

              <div className="modal-actions">
                <button className="btn-primary" onClick={closeResetModal}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MASTER RESET MODAL - NEW! */}
      {showMasterResetModal && (
        <div className="modal-overlay" onClick={() => setShowMasterResetModal(false)}>
          <div className="modal-content master-reset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header danger">
              <AlertTriangle size={48} color="#ff4444" />
              <h2>Master Password Reset</h2>
              <button className="modal-close" onClick={() => setShowMasterResetModal(false)}>×</button>
            </div>

            <div className="modal-body">
              <div className="danger-warning">
                <h3>⚠️ CRITICAL WARNING</h3>
                <p>This action will force ALL non-admin users to change their password on next login.</p>
                <p><strong>Use this only in emergency situations:</strong></p>
                <ul>
                  <li>Security breach detected</li>
                  <li>Suspected password compromise</li>
                  <li>Company-wide security policy update</li>
                </ul>
              </div>

              <div className="info-box">
                <h4>What will happen:</h4>
                <ul>
                  <li>All employee and senior analyst accounts affected</li>
                  <li>Admin accounts NOT affected</li>
                  <li>Users can login with their OLD password</li>
                  <li>They MUST change password before accessing system</li>
                  <li>Old passwords expire in 24 hours</li>
                </ul>
              </div>

              <div className="confirmation-input">
                <label>Type <strong>RESET_ALL_USERS</strong> to confirm:</label>
                <input
                  type="text"
                  value={masterResetConfirmation}
                  onChange={(e) => setMasterResetConfirmation(e.target.value)}
                  placeholder="RESET_ALL_USERS"
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button 
                  className="btn-cancel" 
                  onClick={() => setShowMasterResetModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-danger" 
                  onClick={executeMasterReset}
                  disabled={masterResetConfirmation !== 'RESET_ALL_USERS'}
                >
                  Execute Master Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Actions Dropdown Component
const ActionsDropdown = ({ user, isOpen, onToggle, onEdit, onDelete, onResetPassword, onLock, onUnlock }) => {
  return (
    <div className="actions-dropdown">
      <button 
        className="actions-trigger"
        onClick={onToggle}
      >
        <MoreVertical size={18} />
      </button>
      
      {isOpen && (
        <div className="actions-menu">
          <button onClick={() => { onEdit(); onToggle(); }} className="menu-item">
            <Edit size={16} />
            <span>Edit User</span>
          </button>
          
          <button onClick={() => { onResetPassword(); onToggle(); }} className="menu-item">
            <Key size={16} />
            <span>Reset Password</span>
          </button>
          
          {user.isLocked ? (
            <button onClick={() => { onUnlock(); onToggle(); }} className="menu-item">
              <Unlock size={16} />
              <span>Unlock Account</span>
            </button>
          ) : (
            <button onClick={() => { onLock(); onToggle(); }} className="menu-item">
              <Lock size={16} />
              <span>Lock Account</span>
            </button>
          )}
          
          <div className="menu-divider"></div>
          
          <button 
            onClick={() => { onDelete(); onToggle(); }} 
            className="menu-item danger"
          >
            <Trash2 size={16} />
            <span>Delete User</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagement;