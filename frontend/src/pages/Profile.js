import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Profile.css';

const Profile = ({ account, contract }) => {
  const { user, logout } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const token = localStorage.getItem('betzilla_token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/betting/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'Not connected';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
    alert('Copied to clipboard!');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatEther = (wei) => {
    if (!wei || wei === '0') return '0.00';
    return (parseFloat(wei) / 1e18).toFixed(4);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    // This would require implementing user profile update API
    console.log('Profile update functionality not implemented yet');
    setIsEditing(false);
  };

  const updateWalletAddress = async () => {
    if (!account || !user) return;

    try {
      const token = localStorage.getItem('betzilla_token');
      const response = await fetch('http://localhost:4000/api/auth/wallet', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ walletAddress: account })
      });

      if (response.ok) {
        alert('Wallet address updated successfully!');
      }
    } catch (error) {
      console.error('Failed to update wallet address:', error);
    }
  };

  if (!user) {
    return (
      <div className="profile-page">
        <div className="container">
          <div className="auth-prompt">
            <div className="prompt-content">
              <h2>🔒 Authentication Required</h2>
              <p>Please log in to view your profile.</p>
              <div className="prompt-icon">👤</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="container">
        <div className="page-header">
          <div className="header-content">
            <div className="user-avatar">
              <span className="avatar-icon">👤</span>
            </div>
            <div className="header-text">
              <h1>👤 My Profile</h1>
              <p>Manage your account information and preferences</p>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="edit-btn"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? '❌ Cancel' : '✏️ Edit'}
            </button>
            <button 
              className="logout-btn"
              onClick={logout}
            >
              🚪 Logout
            </button>
          </div>
        </div>

        <div className="profile-grid">
          {/* Personal Information */}
          <div className="profile-card">
            <div className="card-header">
              <h2>📋 Personal Information</h2>
              <p>Your account details</p>
            </div>
            
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="edit-form">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm(prev => ({...prev, username: e.target.value}))}
                    placeholder="Enter username"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({...prev, email: e.target.value}))}
                    placeholder="Enter email"
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="save-btn">💾 Save Changes</button>
                </div>
              </form>
            ) : (
              <div className="personal-details">
                <div className="detail-row">
                  <div className="detail-label">
                    <span className="label-icon">👤</span>
                    Username
                  </div>
                  <div className="detail-value">
                    <span>{user.username}</span>
                  </div>
                </div>
                
                <div className="detail-row">
                  <div className="detail-label">
                    <span className="label-icon">📧</span>
                    Email
                  </div>
                  <div className="detail-value">
                    <span>{user.email}</span>
                  </div>
                </div>
                
                <div className="detail-row">
                  <div className="detail-label">
                    <span className="label-icon">📅</span>
                    Member Since
                  </div>
                  <div className="detail-value">
                    <span>{formatDate(user.createdAt)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Information */}
          <div className="profile-card">
            <div className="card-header">
              <h2>🦊 Wallet Information</h2>
              <p>Your connected wallet details</p>
            </div>
            
            <div className="wallet-details">
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">🔗</span>
                  Connection Status
                </div>
                <div className="detail-value">
                  <span className={`status-badge ${account ? 'connected' : 'disconnected'}`}>
                    {account ? '✅ Connected' : '❌ Not Connected'}
                  </span>
                </div>
              </div>
              
              {account && (
                <>
                  <div className="detail-row">
                    <div className="detail-label">
                      <span className="label-icon">🏠</span>
                      Address
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

                  {user.walletAddress !== account && (
                    <div className="wallet-actions">
                      <button 
                        className="update-wallet-btn"
                        onClick={updateWalletAddress}
                      >
                        🔗 Link This Wallet
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Betting Statistics */}
          <div className="profile-card">
            <div className="card-header">
              <h2>📊 Betting Statistics</h2>
              <p>Your betting performance</p>
            </div>
            
            {loading ? (
              <div className="loading-stats">
                <span>⏳ Loading statistics...</span>
              </div>
            ) : userStats ? (
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-icon">🎯</div>
                  <div className="stat-content">
                    <div className="stat-value">{userStats.totalBets}</div>
                    <div className="stat-label">Total Bets</div>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-content">
                    <div className="stat-value">{userStats.wins}</div>
                    <div className="stat-label">Wins</div>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-icon">❌</div>
                  <div className="stat-content">
                    <div className="stat-value">{userStats.losses}</div>
                    <div className="stat-label">Losses</div>
                  </div>
                </div>
                
                <div className="stat-item">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-content">
                    <div className="stat-value">{userStats.pending}</div>
                    <div className="stat-label">Pending</div>
                  </div>
                </div>
                
                <div className="stat-item wide">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatEther(userStats.totalWagered)} ETH</div>
                    <div className="stat-label">Total Wagered</div>
                  </div>
                </div>
                
                <div className="stat-item wide">
                  <div className="stat-icon">💎</div>
                  <div className="stat-content">
                    <div className="stat-value">{formatEther(userStats.totalWinnings)} ETH</div>
                    <div className="stat-label">Total Winnings</div>
                  </div>
                </div>
                
                <div className="stat-item full-width">
                  <div className="stat-icon">📈</div>
                  <div className="stat-content">
                    <div className="stat-value">{userStats.winRate}%</div>
                    <div className="stat-label">Win Rate</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="no-stats">
                <span>📊 No betting statistics available</span>
              </div>
            )}
          </div>

          {/* Smart Contract Info */}
          <div className="profile-card">
            <div className="card-header">
              <h2>📋 Smart Contract</h2>
              <p>Contract connection details</p>
            </div>
            
            <div className="contract-details">
              <div className="detail-row">
                <div className="detail-label">
                  <span className="label-icon">📄</span>
                  Contract Address
                </div>
                <div className="detail-value">
                  {contract?.target ? (
                    <>
                      <span className="address-full">{contract.target}</span>
                      <span className="address-short">{formatAddress(contract.target)}</span>
                      <button 
                        className="copy-btn"
                        onClick={() => copyToClipboard(contract.target)}
                        title="Copy contract address"
                      >
                        📋
                      </button>
                    </>
                  ) : (
                    <span className="not-connected">Not connected</span>
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
            </div>
          </div>

          {/* Security Settings */}
          <div className="profile-card">
            <div className="card-header">
              <h2>🔐 Security</h2>
              <p>Account security settings</p>
            </div>
            
            <div className="security-section">
              <div className="security-item">
                <div className="security-content">
                  <h3>Change Password</h3>
                  <p>Update your account password</p>
                </div>
                <button className="security-btn">Change</button>
              </div>
              
              <div className="security-item">
                <div className="security-content">
                  <h3>Two-Factor Authentication</h3>
                  <p>Add extra security to your account</p>
                </div>
                <button className="security-btn">Enable</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
