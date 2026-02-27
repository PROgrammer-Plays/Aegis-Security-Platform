import React, { useState } from 'react';
import './RequestPasswordReset.css';

const RequestPasswordReset = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await fetch('http://localhost:5000/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      // Always show success (don't reveal if email exists)
      setSuccess(true);
    } catch (error) {
      setSuccess(true); // Still show success for security
    }
    
    setLoading(false);
  };
  
  if (success) {
    return (
      <div className="request-reset-page">
        <div className="reset-card success">
          <h1>✉️ Check Your Email</h1>
          <p>If an account exists with that email, we've sent password reset instructions.</p>
          <p className="security-note">
            <strong>Security Note:</strong> The reset link expires in 1 hour.
          </p>
          <a href="/login" className="back-btn">← Back to Login</a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="request-reset-page">
      <div className="reset-card">
        <h1>Forgot Password?</h1>
        <p>Enter your email address and we'll send you a reset link.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <a href="/login" className="back-link">← Back to Login</a>
      </div>
    </div>
  );
};

export default RequestPasswordReset;