// src/pages/UserManagement.js - Admin User Management Interface
import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Shield, CheckCircle, XCircle } from 'lucide-react';
import './UserManagement.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'employee',
    fullName: '',
    email: '',
    assigned_ip: '',
    assigned_host: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');

    try {
      if (editingUser) {
        // Update existing user
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
        // Create new user
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

    const token = localStorage.getItem('token');
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
      password: '', // Don't populate password
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
        <button className="btn-create" onClick={openCreateModal}>
          <Plus size={20} />
          Create User
        </button>
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
        <table className="users-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Assigned IP</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id}>
                <td>
                  <div className="user-cell">
                    <div className="user-avatar">
                      <Shield size={20} />
                    </div>
                    <div>
                      <div className="user-name">{user.fullName || user.username}</div>
                      <div className="user-username">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  {user.assigned_ip ? (
                    <code className="ip-code">{user.assigned_ip}</code>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {user.isActive ? (
                    <span className="status-badge active">
                      <CheckCircle size={14} />
                      Active
                    </span>
                  ) : (
                    <span className="status-badge inactive">
                      <XCircle size={14} />
                      Inactive
                    </span>
                  )}
                </td>
                <td>
                  {user.lastLogin ? (
                    <span>{new Date(user.lastLogin).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-muted">Never</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="btn-edit"
                      onClick={() => openEditModal(user)}
                      title="Edit user"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(user._id, user.username)}
                      title="Delete user"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
                  <label>Assigned IP (for employees)</label>
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
    </div>
  );
};

export default UserManagement;
