// src/pages/Login.js - Enhanced Login with RBAC
import React, { useState } from 'react';
import { Shield, User, Lock, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store authentication data
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.user.role);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('fullName', data.user.fullName || data.user.username);
        localStorage.setItem('assigned_ip', data.user.assigned_ip || '');

        console.log('✅ Login successful:', data.user.role);

        // Call parent callback
        if (onLogin) {
          onLogin();
        }

        // Redirect based on role
        setTimeout(() => {
          if (data.user.role === 'admin') {
            window.location.href = '/admin-dashboard';
          } else if (data.user.role === 'senior') {
            window.location.href = '/dashboard';
          } else if (data.user.role === 'employee') {
            window.location.href = '/my-status';
          } else {
            window.location.href = '/';
          }
        }, 100);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <Shield size={80} color="#00bcd4" />
            <h1>AEGIS Security</h1>
            <p>Advanced Enterprise Guardian & Intelligence System</p>
            <div className="branding-features">
              <div className="feature">
                <div className="feature-icon">🛡️</div>
                <div>Real-time Threat Detection</div>
              </div>
              <div className="feature">
                <div className="feature-icon">🧠</div>
                <div>AI-Powered Correlation</div>
              </div>
              <div className="feature">
                <div className="feature-icon">⚡</div>
                <div>Instant Response</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="login-form-container">
            <h2>Welcome Back</h2>
            <p className="login-subtitle">Sign in to access your security dashboard</p>

            {error && (
              <div className="login-error">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="username">
                  <User size={18} />
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  <Lock size={18} />
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button 
                type="submit" 
                className="login-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="btn-spinner"></div>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Shield size={20} />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>

            <div className="login-info">
              <div className="info-box">
                <strong>Default Credentials:</strong>
                <p>Admin: <code>admin / admin</code></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;