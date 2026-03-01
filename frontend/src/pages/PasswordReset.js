// src/pages/PasswordReset.js - Reset Password with Token Component
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff, Check, X } from 'lucide-react';
import './PasswordReset.css';

const PasswordReset = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      const response = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Password reset failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="password-reset-page">
        <div className="reset-card success-card">
          <div className="success-icon check">
            <Check size={64} />
          </div>
          
          <h1>Password Reset Successful!</h1>
          <p className="success-message">
            Your password has been reset successfully. You can now login with your new password.
          </p>
          
          <div className="redirect-message">
            Redirecting to login page in 3 seconds...
          </div>
          
          <Link to="/login" className="login-btn">
            Go to Login Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="password-reset-page">
      <div className="reset-card">
        <div className="brand-header">
          <Shield size={48} color="#00bcd4" />
          <h1>AEGIS</h1>
        </div>

        <h2>Reset Your Password</h2>
        <p className="subtitle">
          Enter your new password below. Make it strong and memorable!
        </p>

        {error && (
          <div className="error-message">
            <X size={20} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-form">
          {/* New Password */}
          <div className="form-group">
            <label htmlFor="newPassword">
              <Lock size={20} />
              New Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoFocus
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
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
              Confirm Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
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

          {/* Password Requirements */}
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

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading || !passwordsMatch || newPassword.length < 8}
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>

        <div className="form-footer">
          <Link to="/login" className="back-link">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PasswordReset;