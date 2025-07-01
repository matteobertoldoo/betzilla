import React, { useState, useEffect } from 'react';
import './Portfolio.css';

const Portfolio = ({ 
  account, 
  contract,
  getAllUserBets,
  claimWinnings,
  loading 
}) => {
  const [userBets, setUserBets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'resolved', 'statistics'

  const fetchUserBets = async () => {
    try {
      const bets = await getAllUserBets();
      setUserBets(bets);
    } catch (error) {
      console.error('Error fetching user bets:', error);
    }
  };

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        if (data.success) {
          setMatches(data.markets);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      }
    };

    fetchMatches();
  }, []);

  useEffect(() => {
    if (account && contract) {
      fetchUserBets();
    }
  }, [account, contract, getAllUserBets]);

  const handleClaimWinnings = async (marketId) => {
    try {
      await claimWinnings(marketId);
      alert('Winnings claimed successfully!');
      fetchUserBets();
    } catch (error) {
      alert(`Error claiming winnings: ${error.message}`);
    }
  };

  const formatEther = (wei) => {
    if (!wei) return '0';
    return (parseFloat(wei) / 1e18).toFixed(4);
  };

  if (!account) {
    return (
      <div className="portfolio-page">
        <div className="container">
          <div className="wallet-prompt">
            <div className="prompt-content">
              <h2>🔒 Wallet Connection Required</h2>
              <p>Please connect your MetaMask wallet to view your betting portfolio.</p>
              <div className="prompt-icon">🦊</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeBets = userBets.filter(bet => !bet.market.isResolved);
  const resolvedBets = userBets.filter(bet => bet.market.isResolved);
  const winningBets = resolvedBets.filter(bet => bet.bet.outcome === bet.market.winningOutcome);
  const losingBets = resolvedBets.filter(bet => bet.bet.outcome !== bet.market.winningOutcome);

  const totalWagered = userBets.reduce((total, bet) => total + parseFloat(formatEther(bet.bet.amount)), 0);
  const winRate = resolvedBets.length > 0 ? ((winningBets.length / resolvedBets.length) * 100).toFixed(1) : 0;

  const renderBetCard = (betData) => {
    const match = matches.find(m => m.id === betData.marketId);
    const matchName = match ? `${match.homeTeam} vs ${match.awayTeam}` : `Market #${betData.marketId}`;
    
    const getOutcomeName = (outcome) => {
      if (!match) return `Outcome ${outcome}`;
      if (outcome === 1) return match.homeTeam;
      if (outcome === 2 && match.odds.draw > 0) return 'Draw';
      if ((outcome === 2 && match.odds.draw === 0) || outcome === 3) return match.awayTeam;
      return `Outcome ${outcome}`;
    };

    return (
      <div key={betData.marketId} className="bet-card">
        <div className="bet-header">
          <h3 className="match-name">{matchName}</h3>
          <span className={`status-badge ${betData.market.isResolved ? 'resolved' : 'active'}`}>
            {betData.market.isResolved ? '✅ Resolved' : '⏳ Active'}
          </span>
        </div>
        
        <div className="bet-details">
          <div className="detail-item">
            <span className="detail-label">🎲 Outcome:</span>
            <span className="detail-value">{getOutcomeName(betData.bet.outcome)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">💰 Amount:</span>
            <span className="detail-value">{formatEther(betData.bet.amount)} ETH</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">🧾 Fee:</span>
            <span className="detail-value">{betData.bet.feePercent}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">📅 Placed:</span>
            <span className="detail-value">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        {betData.market.isResolved && (
          <div className="resolution-section">
            <div className="winning-outcome">
              <strong>🏆 Winning Outcome:</strong> {getOutcomeName(betData.market.winningOutcome)}
            </div>
            
            {betData.bet.outcome === betData.market.winningOutcome ? (
              <div className="winning-bet">
                {betData.bet.claimed ? (
                  <span className="claimed-badge">✅ Winnings Claimed</span>
                ) : (
                  <button 
                    className="claim-btn"
                    onClick={() => handleClaimWinnings(betData.marketId)}
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="btn-loading">
                        <span className="loading-spinner"></span>
                        Claiming...
                      </span>
                    ) : (
                      '🎉 Claim Winnings'
                    )}
                  </button>
                )}
              </div>
            ) : (
              <div className="losing-bet">
                <span className="lost-badge">❌ Lost</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="portfolio-page">
      <div className="container">
        <div className="page-header">
          <h1>📊 Your Betting Portfolio</h1>
          <p>Track your bets, winnings, and performance</p>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <button 
            className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            ⏳ Active Bets ({activeBets.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'resolved' ? 'active' : ''}`}
            onClick={() => setActiveTab('resolved')}
          >
            ✅ Resolved Bets ({resolvedBets.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => setActiveTab('statistics')}
          >
            📈 Statistics
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'active' && (
            <div className="active-bets-section">
              {activeBets.length > 0 ? (
                <div className="bets-grid">
                  {activeBets.map(renderBetCard)}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🎯</div>
                  <h3>No Active Bets</h3>
                  <p>You don't have any active bets at the moment.</p>
                  <a href="/bet" className="cta-btn">Place Your First Bet</a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'resolved' && (
            <div className="resolved-bets-section">
              {resolvedBets.length > 0 ? (
                <div className="bets-grid">
                  {resolvedBets.map(renderBetCard)}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📋</div>
                  <h3>No Resolved Bets</h3>
                  <p>You don't have any resolved bets yet.</p>
                  <a href="/bet" className="cta-btn">Start Betting</a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="statistics-section">
              <div className="stats-overview">
                <div className="stat-card primary">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <div className="stat-value">{userBets.length}</div>
                    <div className="stat-label">Total Bets</div>
                  </div>
                </div>
                
                <div className="stat-card success">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <div className="stat-value">{totalWagered.toFixed(4)}</div>
                    <div className="stat-label">Total Wagered (ETH)</div>
                  </div>
                </div>
                
                <div className="stat-card warning">
                  <div className="stat-icon">🏆</div>
                  <div className="stat-content">
                    <div className="stat-value">{winningBets.length}</div>
                    <div className="stat-label">Wins</div>
                  </div>
                </div>
                
                <div className="stat-card error">
                  <div className="stat-icon">❌</div>
                  <div className="stat-content">
                    <div className="stat-value">{losingBets.length}</div>
                    <div className="stat-label">Losses</div>
                  </div>
                </div>
              </div>

              <div className="detailed-stats">
                <div className="stat-section">
                  <h3>📈 Performance Metrics</h3>
                  <div className="metric-grid">
                    <div className="metric-item">
                      <span className="metric-label">Win Rate:</span>
                      <span className={`metric-value ${parseFloat(winRate) >= 50 ? 'positive' : 'negative'}`}>
                        {winRate}%
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Average Bet:</span>
                      <span className="metric-value">
                        {userBets.length > 0 ? (totalWagered / userBets.length).toFixed(4) : '0'} ETH
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Pending Claims:</span>
                      <span className="metric-value">
                        {winningBets.filter(bet => !bet.bet.claimed).length}
                      </span>
                    </div>
                  </div>
                </div>

                {userBets.length > 0 && (
                  <div className="stat-section">
                    <h3>🎯 Betting Patterns</h3>
                    <div className="pattern-grid">
                      <div className="pattern-item">
                        <span className="pattern-label">Most Common Outcome:</span>
                        <span className="pattern-value">Home Team</span>
                      </div>
                      <div className="pattern-item">
                        <span className="pattern-label">Favorite League:</span>
                        <span className="pattern-value">Premier League</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
