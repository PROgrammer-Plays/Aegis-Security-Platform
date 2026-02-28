// src/components/ChangePasswordModal.js - Force Password Change on First Login
import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Check, X, AlertTriangle } from 'lucide-react';
import './ChangePasswordModal.css';

const ChangePasswordModal = ({ reason, onPasswordChanged }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');

  // Password strength validation
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, text: '', color: '' };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    if (score <= 2) return { score, text: 'Weak', color: '#ff4444' };
    if (score <= 4) return { score, text: 'Fair', color: '#ffbb33' };
    return { score, text: 'Strong', color: '#00C851' };
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          currentPassword, 
          newPassword 
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Success - logout and redirect to login
        alert('✅ Password changed successfully! Please login with your new password.');
        localStorage.clear();
        onPasswordChanged();
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="force-change-overlay">
      <div className="force-change-modal">
        {/* Warning Header */}
        <div className="warning-header">
          <AlertTriangle size={64} color="#ff8800" />
          <h1>Password Change Required</h1>
          {reason && (
            <div className="reason-box">
              <strong>Reason:</strong> {reason}
            </div>
          )}
          <p className="warning-text">
            You must change your password before accessing the dashboard.
            {reason === 'temporary' && ' Your current password is temporary and expires in 24 hours.'}
          </p>
        </div>

        {error && (
          <div className="error-message">
            <X size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="change-password-form">
          {/* Current Password */}
          <div className="form-group">
            <label htmlFor="currentPassword">
              <Lock size={20} />
              Current Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="currentPassword"
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your temporary password"
                required
                autoFocus
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowCurrent(!showCurrent)}
              >
                {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="form-group">
            <label htmlFor="newPassword">
              <Lock size={20} />
              New Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Strength */}
            {newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill" 
                    style={{ 
                      width: `${(passwordStrength.score / 6) * 100}%`,
                      background: passwordStrength.color
                    }}
                  ></div>
                </div>
                <span 
                  className="strength-text"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.text}
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword">
              <Lock size={20} />
              Confirm New Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Match Indicator */}
            {confirmPassword && (
              <div className={`match-indicator ${passwordsMatch ? 'match' : 'no-match'}`}>
                {passwordsMatch ? (
                  <>
                    <Check size={16} />
                    Passwords match
                  </>
                ) : (
                  <>
                    <X size={16} />
                    Passwords do not match
                  </>
                )}
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="password-requirements">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={newPassword.length >= 8 ? 'met' : ''}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(newPassword) ? 'met' : ''}>
                One uppercase letter
              </li>
              <li className={/[a-z]/.test(newPassword) ? 'met' : ''}>
                One lowercase letter
              </li>
              <li className={/[0-9]/.test(newPassword) ? 'met' : ''}>
                One number
              </li>
            </ul>
          </div>

          {/* Security Tips */}
          {reason === 'master_reset' && (
            <div className="security-tips">
              <h4>⚠️ Important Security Tips:</h4>
              <ul>
                <li>Choose a strong, unique password you haven't used before</li>
                <li>Don't share your password with anyone, including IT staff</li>
                <li>This reset was done to protect your account security</li>
                <li>Contact your administrator if you have questions</li>
              </ul>
            </div>
          )}

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading || !passwordsMatch || newPassword.length < 8}
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                Changing Password...
              </>
            ) : (
              'Change Password & Logout'
            )}
          </button>
        </form>

        <div className="cannot-skip">
          🔒 You cannot skip this step. Contact your administrator if you need help.
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;
