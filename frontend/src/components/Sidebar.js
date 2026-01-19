// src/components/Sidebar.js - Complete RBAC Sidebar
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Shield, LayoutDashboard, Activity, AlertOctagon, 
  Search, Users, LogOut, User
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const role = localStorage.getItem('role');
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
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
          <span className={`role-badge ${role}`}>{role?.toUpperCase()}</span>
        </div>
      </div>

      {/* User Info */}
      <div className="sidebar-user">
        <div className="user-avatar">
          <User size={24} />
        </div>
        <div className="user-info">
          <div className="user-name">{username}</div>
          <div className="user-role">{role}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Admin Navigation */}
        {role === 'admin' && (
          <>
            <Link to="/admin-dashboard" className={`nav-item ${isActive('/admin-dashboard') || isActive('/')}`}>
              <LayoutDashboard size={20} />
              <span>Executive Dashboard</span>
            </Link>
            <Link to="/users" className={`nav-item ${isActive('/users')}`}>
              <Users size={20} />
              <span>Manage Users</span>
            </Link>
          </>
        )}

        {/* Senior Analyst Navigation */}
        {role === 'senior' && (
          <>
            <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') || isActive('/')}`}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
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
            <Link to="/my-status" className={`nav-item ${isActive('/my-status') || isActive('/')}`}>
              <Shield size={20} />
              <span>My Security Status</span>
            </Link>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
