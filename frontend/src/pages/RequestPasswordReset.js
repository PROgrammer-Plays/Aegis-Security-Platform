// src/pages/RequestPasswordReset.js - Request Password Reset Component
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, ArrowLeft } from 'lucide-react';
import './PasswordReset.css';

const RequestPasswordReset = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState(''); // For dev mode

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch((process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000') + '/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      // Always show success (security best practice - don't reveal if email exists)
      setSuccess(true);
      
      // DEV MODE: Show reset URL if available
      if (data.devMode && data.devMode.resetUrl) {
        setResetUrl(data.devMode.resetUrl);
      }
    } catch (error) {
      // Still show success (don't reveal errors)
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="password-reset-page">
        <div className="reset-card success-card">
          <div className="success-icon">
            <Mail size={64} />
          </div>
          
          <h1>Check Your Email</h1>
          <p className="success-message">
            If an account exists with <strong>{email}</strong>, we've sent password reset instructions.
          </p>
          
          <div className="info-box">
            <h3>📧 What to do next:</h3>
            <ul>
              <li>Check your email inbox</li>
              <li>Look for an email from AEGIS Security</li>
              <li>Click the reset link (expires in 1 hour)</li>
              <li>Set your new password</li>
            </ul>
          </div>

          {/* DEV MODE: Show reset link directly */}
          {resetUrl && (
            <div className="dev-mode-box">
              <h3>🔧 DEV MODE (Remove in Production)</h3>
              <p>Email system not configured. Use this link:</p>
              <a href={resetUrl} className="reset-link-direct">
                {resetUrl}
              </a>
            </div>
          )}
          
          <div className="security-note">
            <strong>🔒 Security Note:</strong> The reset link expires in 1 hour for your protection.
          </div>
          
          <Link to="/login" className="back-btn">
            <ArrowLeft size={20} />
            Back to Login
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

        <h2>Forgot Password?</h2>
        <p className="subtitle">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="reset-form">
          <div className="form-group">
            <label htmlFor="email">
              <Mail size={20} />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              required
              autoFocus
            />
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="btn-spinner"></div>
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="form-footer">
          <Link to="/login" className="back-link">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RequestPasswordReset;