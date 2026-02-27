// src/components/Sidebar.js - COMPLETE with Senior Dashboard
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, LayoutDashboard, Activity, AlertOctagon, 
  Search, Users, User, Power, Target
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ isConnected }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    window.location.reload();
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
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
        {/* Admin Navigation - FULL ACCESS */}
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
      </nav>

      {/* Sign Out Button - IMPROVED */}
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
    </aside>
  );
};

export default Sidebar;
