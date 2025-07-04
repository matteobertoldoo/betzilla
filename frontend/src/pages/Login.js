import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import './Login.css';

const Login = () => {
  const { login, register, loading, error, isAuthenticated, loginWithWallet } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!isLoginMode) {
      if (!formData.username) {
        errors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        errors.username = 'Username must be at least 3 characters';
      }

      if (!formData.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const result = isLoginMode
        ? await login(formData.email, formData.password)
        : await register(formData.email, formData.password, formData.username);

      if (!result.success) {
        setFormErrors({ submit: result.message });
      }
    } catch (err) {
      setFormErrors({ submit: 'An unexpected error occurred' });
    }
  };

  const toggleMode = () => {
    setIsLoginMode(prev => !prev);
    setFormData({
      email: '',
      password: '',
      username: '',
      confirmPassword: ''
    });
    setFormErrors({});
  };

  // --- MetaMask login logic ---
  const handleMetaMaskLogin = async () => {
    // For new users, email is required. We can check if we are in sign-up mode.
    if (!isLoginMode && !formData.email) {
      setFormErrors({ email: 'Email is required to register with MetaMask.' });
      return;
    }
    // Optional: Validate email format before proceeding
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setFormErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    try {
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        alert('MetaMask is not installed. Please install it from https://metamask.io');
        return;
      }
      // Pass the email from the form to the login function
      const result = await loginWithWallet(formData.email);
      if (!result.success) {
        // Display error message from backend, which might be about the email.
        setFormErrors({ submit: result.message || 'MetaMask login failed' });
      }
      // The useAuth hook will handle redirection on success
    } catch (err) {
      setFormErrors({ submit: 'MetaMask login error: ' + (err.message || err) });
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>BetZilla</h1>
            <h2>{isLoginMode ? 'Welcome Back' : 'Join BetZilla'}</h2>
            <p>
              {isLoginMode
                ? 'Sign in to your account to start betting'
                : 'Create your account to start your betting journey'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={formErrors.username ? 'error' : ''}
                  placeholder="Enter your username"
                />
                {formErrors.username && <span className="error-message">{formErrors.username}</span>}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={formErrors.email ? 'error' : ''}
                placeholder="Enter your email"
              />
              {formErrors.email && <span className="error-message">{formErrors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={formErrors.password ? 'error' : ''}
                placeholder="Enter your password"
              />
              {formErrors.password && <span className="error-message">{formErrors.password}</span>}
            </div>

            {!isLoginMode && (
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={formErrors.confirmPassword ? 'error' : ''}
                  placeholder="Confirm your password"
                />
                {formErrors.confirmPassword && <span className="error-message">{formErrors.confirmPassword}</span>}
              </div>
            )}

            {(error || formErrors.submit) && (
              <div className="error-banner">{error || formErrors.submit}</div>
            )}

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <span className="loading-spinner">⏳</span>
              ) : (
                isLoginMode ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button type="button" className="toggle-button" onClick={toggleMode}>
                {isLoginMode ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
            <div className="divider">or</div>
            <button type="button" className="metamask-login-btn" onClick={handleMetaMaskLogin}>
              <span role="img" aria-label="fox">🦊</span> Sign in with MetaMask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
