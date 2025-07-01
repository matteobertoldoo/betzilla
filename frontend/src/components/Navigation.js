import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation = ({ account, connectWallet, loading }) => {
  const location = useLocation();

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <nav className="navigation">
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
            to="/portfolio" 
            className={`nav-link ${location.pathname === '/portfolio' ? 'active' : ''}`}
          >
            📊 Portfolio
          </Link>
          <Link 
            to="/settings" 
            className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
          >
            ⚙️ Settings
          </Link>
        </div>

        <div className="wallet-section">
          {account ? (
            <div className="wallet-connected">
              <div className="metamask-icon">🦊</div>
              <span className="wallet-address">{formatAddress(account)}</span>
            </div>
          ) : (
            <button 
              className="wallet-connect-btn"
              onClick={connectWallet}
              disabled={loading}
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
