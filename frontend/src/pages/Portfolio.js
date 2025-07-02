import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Portfolio.css';

const Portfolio = ({ 
  account, 
  contract,
  getAllUserBets,
  claimWinnings,
  loading 
}) => {
  const { user } = useAuth();
  const [userBets, setUserBets] = useState([]);
  const [databaseBets, setDatabaseBets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'resolved', 'statistics'

  // Fetch bets from database
  const fetchDatabaseBets = useCallback(async () => {
    if (!user) {
      console.log('📊 No user authenticated, skipping database bets fetch');
      return;
    }
    
    try {
      const token = localStorage.getItem('betzilla_token');
      if (!token) {
        console.log('📊 No auth token found, skipping database bets fetch');
        return;
      }

      console.log('📊 Fetching database bets for user:', user.username);
      const response = await fetch('http://localhost:4000/api/betting/bets', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        console.log('📊 Database bets fetched successfully:', data.bets.length, 'bets');
        console.log('📊 Database bets details:', data.bets);
        setDatabaseBets(data.bets);
      } else {
        console.error('📊 Failed to fetch database bets:', data.message);
      }
    } catch (error) {
      console.error('📊 Error fetching database bets:', error);
    }
  }, [user]);

  const fetchUserBets = useCallback(async () => {
    try {
      const bets = await getAllUserBets();
      setUserBets(bets);
    } catch (error) {
      console.error('Error fetching user bets:', error);
    }
  }, [getAllUserBets]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/matches?upcoming=true&limit=30');
        const data = await response.json();
        if (data.success) {
          // Use the same transformation logic as Bet.js to ensure ID consistency
          // Remove duplicates based on title and teams
          const uniqueMatches = data.data.filter((match, index, self) => 
            index === self.findIndex(m => 
              m.title === match.title && 
              m.home_team === match.home_team && 
              m.away_team === match.away_team
            )
          );
          
          // Map to contract market IDs (1-30) to match Bet.js logic
          const transformedMatches = uniqueMatches
            .slice(0, 30) // Only take first 30 matches since contract has 30 markets
            .map((match, index) => ({
              id: index + 1, // This is the contract market ID (1-30) - same as Bet.js
              homeTeam: match.home_team,
              awayTeam: match.away_team,
              league: match.league,
              description: match.description,
              startTime: match.start_time,
              sport: match.sport,
              category: match.category
            }));
          setMatches(transformedMatches);
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
    if (user) {
      fetchDatabaseBets();
    }
  }, [account, contract, user, fetchUserBets, fetchDatabaseBets]);

  // Refresh all bet data
  const refreshAllBets = useCallback(async () => {
    if (account && contract) {
      await fetchUserBets();
    }
    if (user) {
      await fetchDatabaseBets();
    }
  }, [account, contract, user, fetchUserBets, fetchDatabaseBets]);

  // Expose refresh function globally for other components to use
  useEffect(() => {
    window.refreshPortfolio = refreshAllBets;
    return () => {
      delete window.refreshPortfolio;
    };
  }, [refreshAllBets]);

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

  // Database bets (pending, confirmed, etc.)
  const pendingDbBets = databaseBets.filter(bet => bet.status === 'pending' || bet.status === 'confirmed');
  const resolvedDbBets = databaseBets.filter(bet => bet.status === 'won' || bet.status === 'lost');

  // Merge and deduplicate bets: prioritize blockchain bets over database bets
  // If a bet exists in both blockchain and database (same marketId + similar amount), show only the blockchain version
  const mergeAndDeduplicateBets = (blockchainBets, databaseBets) => {
    const deduplicatedDatabaseBets = databaseBets.filter(dbBet => {
      // Check if this database bet has a corresponding blockchain bet
      const hasBlockchainVersion = blockchainBets.some(bcBet => {
        const sameMarket = bcBet.marketId === dbBet.marketId;
        const bcAmountEth = parseFloat(formatEther(bcBet.bet.amount));
        const dbAmountEth = parseFloat(dbBet.amountWei) / 1e18;
        const similarAmount = Math.abs(bcAmountEth - dbAmountEth) < 0.0001; // Small tolerance for floating point comparison
        return sameMarket && similarAmount;
      });
      
      // Only include database bet if no corresponding blockchain bet exists
      return !hasBlockchainVersion;
    });
    
    return [...blockchainBets, ...deduplicatedDatabaseBets];
  };

  // Create merged active and resolved bets
  const mergedActiveBets = mergeAndDeduplicateBets(activeBets, pendingDbBets);
  const mergedResolvedBets = mergeAndDeduplicateBets(resolvedBets, resolvedDbBets);

  const totalWagered = userBets.reduce((total, bet) => total + parseFloat(formatEther(bet.bet.amount)), 0) + 
                       databaseBets.reduce((total, bet) => total + parseFloat(bet.amountWei) / 1e18, 0);
  const winRate = mergedResolvedBets.length > 0 ? 
    (((winningBets.length + databaseBets.filter(bet => bet.status === 'won').length) / mergedResolvedBets.length) * 100).toFixed(1) : 0;

  const renderBetCard = (betData) => {
    const match = matches.find(m => m.id === betData.marketId);
    const matchName = match ? `${match.homeTeam} vs ${match.awayTeam}` : `Market #${betData.marketId}`;
    
    const getOutcomeName = (outcome) => {
      if (!match) return `Outcome ${outcome}`;
      if (outcome === 1) return match.homeTeam;
      if (outcome === 2 && match.odds && match.odds.draw > 0) return 'Draw';
      if ((outcome === 2 && (!match.odds || match.odds.draw === 0)) || outcome === 3) return match.awayTeam;
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

  // Render database bet card
  const renderDatabaseBetCard = (bet, index = 0) => {
    const match = matches.find(m => m.id === bet.marketId);
    const matchName = match ? `${match.homeTeam} vs ${match.awayTeam}` : 
                      bet.homeTeam && bet.awayTeam ? `${bet.homeTeam} vs ${bet.awayTeam}` : 
                      `Market #${bet.marketId}`;
    
    const getOutcomeName = (outcome) => {
      if (match) {
        if (outcome === 1) return match.homeTeam;
        if (outcome === 2 && match.sport === 'Football') return 'Draw';
        if ((outcome === 2 && match.sport !== 'Football') || outcome === 3) return match.awayTeam;
      }
      if (bet.homeTeam && bet.awayTeam) {
        if (outcome === 1) return bet.homeTeam;
        if (outcome === 2 && bet.sport === 'Football') return 'Draw';
        if ((outcome === 2 && bet.sport !== 'Football') || outcome === 3) return bet.awayTeam;
      }
      return `Outcome ${outcome}`;
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'pending': return 'orange';
        case 'confirmed': return 'blue';
        case 'won': return 'green';
        case 'lost': return 'red';
        default: return 'gray';
      }
    };

    return (
      <div key={bet.id || `db-bet-${bet.marketId}-${index}`} className="bet-card database-bet">
        <div className="bet-header">
          <h3 className="match-name">{matchName}</h3>
          <span className={`status-badge ${bet.status}`} style={{ backgroundColor: getStatusColor(bet.status) }}>
            {bet.status === 'pending' && '⏳ Pending'}
            {bet.status === 'confirmed' && '✅ Confirmed'}
            {bet.status === 'won' && '🏆 Won'}
            {bet.status === 'lost' && '❌ Lost'}
          </span>
        </div>
        
        <div className="bet-details">
          <div className="detail-item">
            <span className="detail-label">🎲 Outcome:</span>
            <span className="detail-value">{getOutcomeName(bet.outcome)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">💰 Amount:</span>
            <span className="detail-value">{(parseFloat(bet.amountWei) / 1e18).toFixed(4)} ETH</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">📅 Placed:</span>
            <span className="detail-value">{new Date(bet.placedAt).toLocaleDateString()}</span>
          </div>
          {bet.transactionHash && (
            <div className="detail-item">
              <span className="detail-label">🔗 TX Hash:</span>
              <span className="detail-value transaction-hash">
                {bet.transactionHash.slice(0, 8)}...{bet.transactionHash.slice(-6)}
              </span>
            </div>
          )}
          {match && (
            <div className="detail-item">
              <span className="detail-label">🏟️ League:</span>
              <span className="detail-value">{match.league}</span>
            </div>
          )}
        </div>
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
            ⏳ Active Bets ({mergedActiveBets.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'resolved' ? 'active' : ''}`}
            onClick={() => setActiveTab('resolved')}
          >
            ✅ Resolved Bets ({mergedResolvedBets.length})
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
              {mergedActiveBets.length > 0 ? (
                <div className="bets-grid">
                  {mergedActiveBets.map((bet, index) => 
                    bet.bet ? renderBetCard(bet) : renderDatabaseBetCard(bet, index)
                  )}
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
              {mergedResolvedBets.length > 0 ? (
                <div className="bets-grid">
                  {mergedResolvedBets.map((bet, index) => 
                    bet.bet ? renderBetCard(bet) : renderDatabaseBetCard(bet, index)
                  )}
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
                    <div className="stat-value">{mergedActiveBets.length + mergedResolvedBets.length}</div>
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
                    <div className="stat-value">{winningBets.length + databaseBets.filter(bet => bet.status === 'won').length}</div>
                    <div className="stat-label">Wins</div>
                  </div>
                </div>
                
                <div className="stat-card error">
                  <div className="stat-icon">❌</div>
                  <div className="stat-content">
                    <div className="stat-value">{losingBets.length + databaseBets.filter(bet => bet.status === 'lost').length}</div>
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
                        {(userBets.length + databaseBets.length) > 0 ? (totalWagered / (userBets.length + databaseBets.length)).toFixed(4) : '0'} ETH
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Pending Claims:</span>
                      <span className="metric-value">
                        {winningBets.filter(bet => !bet.bet.claimed).length}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Active Bets:</span>
                      <span className="metric-value">
                        {activeBets.length + pendingDbBets.length}
                      </span>
                    </div>
                  </div>
                </div>

                {(userBets.length + databaseBets.length) > 0 && (
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
