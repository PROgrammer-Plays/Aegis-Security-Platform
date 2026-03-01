// src/components/Sidebar.js - WITH AI ASSISTANT FOR ALL USERS
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, LayoutDashboard, Activity, AlertOctagon, 
  Search, Users, User, Power, Target, Key, Brain
} from 'lucide-react';
import GeneralAIChat from './GeneralAIChat'; // NEW!
import './Sidebar.css';

const Sidebar = ({ isConnected }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false); // NEW!
  const [isAIMinimized, setIsAIMinimized] = useState(false); // NEW!
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Password changed successfully! Please login with your new password.');
        handleLogout();
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <Shield size={32} color="#00bcd4" />
          <div className="logo-text">
            <h2>AEGIS</h2>
            <div className="status-indicator">
              <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
              <span className="status-text">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="sidebar-user">
          <div className="user-avatar">
            <User size={24} />
          </div>
          <div className="user-info">
            <div className="user-name">{username || 'User'}</div>
            <span className={`role-badge role-${role}`}>{role?.toUpperCase()}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Admin Navigation */}
          {role === 'admin' && (
            <>
              <div className="nav-section-title">ADMINISTRATION</div>
              <Link to="/admin-dashboard" className={`nav-item ${isActive('/admin-dashboard')}`}>
                <LayoutDashboard size={20} />
                <span>Admin Overview</span>
              </Link>
              <Link to="/users" className={`nav-item ${isActive('/users')}`}>
                <Users size={20} />
                <span>User Management</span>
              </Link>
              
              <div className="nav-section-title">OPERATIONS</div>
              <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
                <LayoutDashboard size={20} />
                <span>Ops Dashboard</span>
              </Link>
              <Link to="/feed" className={`nav-item ${isActive('/feed')}`}>
                <Activity size={20} />
                <span>Live Feed</span>
              </Link>
              <Link to="/incidents" className={`nav-item ${isActive('/incidents')}`}>
                <AlertOctagon size={20} />
                <span>War Room</span>
              </Link>
              <Link to="/forensics" className={`nav-item ${isActive('/forensics')}`}>
                <Search size={20} />
                <span>Forensics</span>
              </Link>
            </>
          )}

          {/* Senior Analyst Navigation */}
          {role === 'senior' && (
            <>
              <div className="nav-section-title">SENIOR ANALYST</div>
              <Link to="/senior-dashboard" className={`nav-item ${isActive('/senior-dashboard')}`}>
                <Target size={20} />
                <span>My Dashboard</span>
              </Link>
              <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
                <LayoutDashboard size={20} />
                <span>Ops Dashboard</span>
              </Link>
              <Link to="/feed" className={`nav-item ${isActive('/feed')}`}>
                <Activity size={20} />
                <span>Live Feed</span>
              </Link>
              <Link to="/incidents" className={`nav-item ${isActive('/incidents')}`}>
                <AlertOctagon size={20} />
                <span>War Room</span>
              </Link>
              <Link to="/forensics" className={`nav-item ${isActive('/forensics')}`}>
                <Search size={20} />
                <span>Forensics</span>
              </Link>
            </>
          )}

          {/* Employee Navigation */}
          {role === 'employee' && (
            <>
              <div className="nav-section-title">MY WORKSPACE</div>
              <Link to="/my-status" className={`nav-item ${isActive('/my-status')}`}>
                <Shield size={20} />
                <span>My Security Status</span>
              </Link>
            </>
          )}

          {/* AI ASSISTANT - NEW! AVAILABLE TO ALL ROLES */}
          <div className="nav-section-title">AI ASSISTANT</div>
          <button 
            className={`nav-item nav-button ${showAIChat && !isAIMinimized ? 'active' : ''}`}
            onClick={() => {
              setShowAIChat(true);
              setIsAIMinimized(false);
            }}
          >
            <Brain size={20} />
            <span>AI Security Assistant</span>
            <span className="ai-badge">✨</span>
          </button>

          {/* Account Section */}
          <div className="nav-section-title">ACCOUNT</div>
          <button 
            className="nav-item nav-button"
            onClick={() => setShowChangePassword(true)}
          >
            <Key size={20} />
            <span>Change Password</span>
          </button>
        </nav>

        {/* Sign Out Button */}
        <div className="sidebar-footer">
          {!showLogoutConfirm ? (
            <button className="signout-btn" onClick={() => setShowLogoutConfirm(true)}>
              <Power size={20} />
              <span>Sign Out</span>
            </button>
          ) : (
            <div className="logout-confirm">
              <p>Sign out?</p>
              <div className="confirm-buttons">
                <button className="btn-confirm" onClick={handleLogout}>
                  Yes
                </button>
                <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>
                  No
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Change Password Modal */}
        {showChangePassword && (
          <div className="modal-overlay" onClick={() => setShowChangePassword(false)}>
            <div className="modal-content change-password-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Change Password</h2>
                <button className="modal-close" onClick={() => setShowChangePassword(false)}>×</button>
              </div>

              <div className="modal-body">
                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="password-change-form">
                  <div className="form-group">
                    <label>Current Password:</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label>New Password:</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      required
                      placeholder="At least 8 characters"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password:</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => setShowChangePassword(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit">
                      Change Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* AI CHAT PANEL - NEW! */}
      {showAIChat && (
        <GeneralAIChat
          onClose={() => setShowAIChat(false)}
          isMinimized={isAIMinimized}
          onToggleMinimize={() => setIsAIMinimized(!isAIMinimized)}
        />
      )}
    </>
  );
};

export default Sidebar;
