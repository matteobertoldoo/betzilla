import React from 'react';
import './Settings.css';

const Settings = ({ account, contract }) => {
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!account) {
    return (
      <div className="settings-page">
        <div className="container">
          <div className="wallet-prompt">
            <div className="prompt-content">
              <h2>🔒 Wallet Connection Required</h2>
              <p>Please connect your MetaMask wallet to access settings.</p>
              <div className="prompt-icon">🦊</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="container">
        <div className="page-header">
          <h1>⚙️ Settings</h1>
          <p>Manage your account and platform preferences</p>
        </div>

        <div className="settings-grid">
          {/* Account Information */}
          <div className="settings-card">
            <div className="card-header">
              <h2>👤 Account Information</h2>
              <p>Your connected wallet details</p>
            </div>
            
            <div className="account-details">
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">🦊</span>
                  Wallet Address
                </div>
                <div className="detail-value">
                  <span className="address-full">{account}</span>
                  <span className="address-short">{formatAddress(account)}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => copyToClipboard(account)}
                    title="Copy address"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">🌐</span>
                  Network
                </div>
                <div className="detail-value">
                  <span className="network-badge">Hardhat Local</span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">🔗</span>
                  Connection Status
                </div>
                <div className="detail-value">
                  <span className="status-badge connected">✅ Connected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contract Information */}
          <div className="settings-card">
            <div className="card-header">
              <h2>📋 Contract Information</h2>
              <p>Smart contract details</p>
            </div>
            
            <div className="contract-details">
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">📄</span>
                  Contract Address
                </div>
                <div className="detail-value">
                  <span className="address-full">{contract?.target || 'Not connected'}</span>
                  <span className="address-short">{contract?.target ? formatAddress(contract.target) : 'N/A'}</span>
                  {contract?.target && (
                    <button 
                      className="copy-btn"
                      onClick={() => copyToClipboard(contract.target)}
                      title="Copy contract address"
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">⛓️</span>
                  Chain ID
                </div>
                <div className="detail-value">
                  <span className="chain-badge">31337</span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">🔧</span>
                  Version
                </div>
                <div className="detail-value">
                  <span className="version-badge">v1.0.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Information */}
          <div className="settings-card">
            <div className="card-header">
              <h2>🎰 Platform Information</h2>
              <p>BetZilla platform details</p>
            </div>
            
            <div className="platform-details">
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">🏷️</span>
                  Platform Name
                </div>
                <div className="detail-value">
                  <span className="platform-name">BetZilla</span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">📊</span>
                  Platform Type
                </div>
                <div className="detail-value">
                  <span>Decentralized Sports Betting</span>
                </div>
              </div>
              
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">🔐</span>
                  Security
                </div>
                <div className="detail-value">
                  <span className="security-badge">🛡️ Blockchain Secured</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="settings-card">
            <div className="card-header">
              <h2>🎛️ Preferences</h2>
              <p>Customize your experience</p>
            </div>
            
            <div className="preferences-details">
              <div className="preference-item">
                <div className="preference-label">
                  <span className="label-icon">🔔</span>
                  Notifications
                </div>
                <div className="preference-control">
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
              
              <div className="preference-item">
                <div className="preference-label">
                  <span className="label-icon">🌙</span>
                  Dark Mode
                </div>
                <div className="preference-control">
                  <label className="toggle-switch">
                    <input type="checkbox" />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
              
              <div className="preference-item">
                <div className="preference-label">
                  <span className="label-icon">💰</span>
                  Auto-claim Winnings
                </div>
                <div className="preference-control">
                  <label className="toggle-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="settings-card">
            <div className="card-header">
              <h2>❓ Help & Support</h2>
              <p>Get help and contact support</p>
            </div>
            
            <div className="help-section">
              <div className="help-item">
                <div className="help-icon">📖</div>
                <div className="help-content">
                  <h3>Documentation</h3>
                  <p>Learn how to use BetZilla</p>
                </div>
                <button className="help-btn">View Docs</button>
              </div>
              
              <div className="help-item">
                <div className="help-icon">💬</div>
                <div className="help-content">
                  <h3>Community</h3>
                  <p>Join our Discord community</p>
                </div>
                <button className="help-btn">Join Discord</button>
              </div>
              
              <div className="help-item">
                <div className="help-icon">🐛</div>
                <div className="help-content">
                  <h3>Report Bug</h3>
                  <p>Found an issue? Let us know</p>
                </div>
                <button className="help-btn">Report</button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-card danger">
            <div className="card-header">
              <h2>⚠️ Danger Zone</h2>
              <p>Actions that cannot be undone</p>
            </div>
            
            <div className="danger-section">
              <div className="danger-item">
                <div className="danger-content">
                  <h3>Clear Local Data</h3>
                  <p>Remove all locally stored preferences and cache</p>
                </div>
                <button className="danger-btn">Clear Data</button>
              </div>
              
              <div className="danger-item">
                <div className="danger-content">
                  <h3>Disconnect Wallet</h3>
                  <p>Disconnect your wallet from the platform</p>
                </div>
                <button className="danger-btn">Disconnect</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
