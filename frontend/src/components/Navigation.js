import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Navigation.css';

const Navigation = ({ account, connectWallet, loading }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      // Display a user-friendly error message
      const errorMessage = error?.message || error?.reason || 'Failed to connect wallet';
      alert(`Error connecting wallet: ${errorMessage}`);
    }
  };

  // Public navigation for non-authenticated users
  if (!isAuthenticated) {
    return (
      <nav className="navigation public-nav">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <span className="logo-icon">🎰</span>
            <span className="logo-text">BetZilla</span>
          </Link>
          
          <div className="nav-menu">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              🏠 Home
            </Link>
            <Link 
              to="/about" 
              className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
            >
              👥 Who We Are
            </Link>
            <Link 
              to="/faq" 
              className={`nav-link ${location.pathname === '/faq' ? 'active' : ''}`}
            >
              ❓ FAQ
            </Link>
          </div>

          <div className="auth-section">
            <Link to="/login" className="login-btn">
              🚀 Login / Register
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  // Authenticated navigation
  return (
    <nav className="navigation auth-nav">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">🎰</span>
          <span className="logo-text">BetZilla</span>
        </Link>
        
        <div className="nav-menu">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            🏠 Home
          </Link>
          <Link 
            to="/bet" 
            className={`nav-link ${location.pathname === '/bet' ? 'active' : ''}`}
          >
            🎯 Bet
          </Link>
          <Link 
            to="/odds" 
            className={`nav-link ${location.pathname === '/odds' ? 'active' : ''}`}
          >
            📈 Live Odds
          </Link>
          <Link 
            to="/portfolio" 
            className={`nav-link ${location.pathname === '/portfolio' ? 'active' : ''}`}
          >
            📊 Portfolio
          </Link>
          <Link 
            to="/profile" 
            className={`nav-link ${location.pathname === '/profile' ? 'active' : ''}`}
          >
            👤 {user?.username || 'Profile'}
          </Link>
        </div>

        <div className="wallet-section">
          {account ? (
            <div className="wallet-connected" title={`Connected: ${account}`}>
              <div className="metamask-icon">🦊</div>
              <span className="wallet-address">{formatAddress(account)}</span>
            </div>
          ) : (
            <button 
              className="wallet-connect-btn"
              onClick={handleConnectWallet}
              disabled={loading}
              title="Connect your MetaMask wallet"
            >
              <div className="metamask-icon">🦊</div>
              {loading ? <span className="loading"></span> : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
