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
        const response = await fetch('http://localhost:4000/api/matches');
        const data = await response.json();
        if (data.success) {
          // Use the same match data structure as Bet.js - keep original IDs
          const transformedMatches = data.data.map(match => ({
            ...match,
            contractMarketId: match.contract_market_id,
            homeTeam: match.home_team,
            awayTeam: match.away_team,
            startTime: match.start_time
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

  // Aggiorna i dati delle scommesse per le partite entro 24h ogni volta che la pagina viene caricata o ogni 30s
  useEffect(() => {
    // Funzione per aggiornare solo le scommesse delle partite entro 24h
    const refreshBetsForNext24h = async () => {
      try {
        // Prendi tutte le partite dal backend
        const response = await fetch('http://localhost:4000/api/parimutuel/matches/next24hours');
        const data = await response.json();
        if (data.success && data.data && data.data.matches) {
          // Per ogni match entro 24h, aggiorna lo stato delle scommesse dal backend
          const matchIds = data.data.matches.map(m => m.id);
          // Se vuoi aggiornare solo le scommesse di queste partite, puoi filtrare qui
          await fetchDatabaseBets();
        }
      } catch (error) {
        console.error('Error refreshing bets for next 24h:', error);
      }
    };

    refreshBetsForNext24h();
    // Aggiorna ogni 30 secondi
    const interval = setInterval(refreshBetsForNext24h, 30000);
    return () => clearInterval(interval);
  }, [fetchDatabaseBets]);

  const handleClaimWinnings = async (marketId) => {
    try {
      await claimWinnings(marketId);
      alert('Winnings claimed successfully!');
      fetchUserBets();
    } catch (error) {
      alert(`Error claiming winnings: ${error.message}`);
    }
  };

  // Helper function to safely convert BigInt to number for calculations
  const safeToNumber = (value) => {
    if (typeof value === 'bigint') {
      return parseFloat(value.toString());
    }
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    return Number(value) || 0;
  };

  const formatEther = (wei) => {
    if (!wei) return '0';
    return (safeToNumber(wei) / 1e18).toFixed(4);
  };

  // Helper function to get outcome name from number
  const getOutcomeName = (outcomeNumber, match) => {
    // Convert to number if it's a BigInt or string
    const outcome = safeToNumber(outcomeNumber);
    
    const homeTeam = match?.homeTeam || match?.home_team || 'Home Team';
    const awayTeam = match?.awayTeam || match?.away_team || 'Away Team';
    
    // Determina se il match ha il pareggio
    const sportsWithDraw = ['Football', 'Soccer'];
    const sport = match?.sport || '';
    const hasDrawOption = sportsWithDraw.includes(sport);

    switch (outcome) {
      case 1:
        return homeTeam;
      case 2:
        return hasDrawOption ? 'Draw' : awayTeam;
      case 3:
        return awayTeam;
      default:
        return `Outcome ${outcome}`;
    }
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

  // Helper function to deduplicate bets - prefer database bets over blockchain bets
  const deduplicateBets = (blockchainBets, databaseBets) => {
    // Create a map of contract market ID to database market ID
    const contractToDbMarketMap = new Map();
    matches.forEach(match => {
      if (match.contractMarketId || match.contract_market_id) {
        const contractId = match.contractMarketId || match.contract_market_id;
        const dbId = match.id;
        contractToDbMarketMap.set(contractId, dbId);
      }
    });

    // Create a set of contract market IDs that have database bets
    const contractMarketIdsWithDbBets = new Set();
    databaseBets.forEach(dbBet => {
      const dbMarketId = dbBet.marketId || dbBet.market_id;
      // Find the contract market ID for this database market
      const match = matches.find(m => m.id === dbMarketId);
      if (match && (match.contractMarketId || match.contract_market_id)) {
        const contractId = match.contractMarketId || match.contract_market_id;
        contractMarketIdsWithDbBets.add(contractId);
      }
    });

    console.log('🔍 Enhanced deduplication process:');
    console.log('  - Contract to DB market mapping:', Array.from(contractToDbMarketMap.entries()));
    console.log('  - Contract market IDs with DB bets:', Array.from(contractMarketIdsWithDbBets));
    console.log('  - Blockchain bets before dedup:', blockchainBets.map(b => `Contract Market ${b.marketId}`));
    console.log('  - Database bets:', databaseBets.map(b => `DB Market ${b.marketId || b.market_id} (${b.status})`));

    // Filter out blockchain bets that have corresponding database entries
    const filteredBlockchainBets = blockchainBets.filter(blockchainBet => {
      const hasDbEntry = contractMarketIdsWithDbBets.has(blockchainBet.marketId);
      if (hasDbEntry) {
        console.log(`  ❌ Filtering out blockchain bet for contract market ${blockchainBet.marketId} (has database entry)`);
      } else {
        console.log(`  ✅ Keeping blockchain bet for contract market ${blockchainBet.marketId} (no database entry)`);
      }
      return !hasDbEntry;
    });

    console.log('  - Final result: blockchain bets after dedup:', filteredBlockchainBets.map(b => `Contract Market ${b.marketId}`));
    return filteredBlockchainBets;
  };

  // Apply deduplication
  const deduplicatedUserBets = deduplicateBets(userBets, databaseBets);
  
  // Convert database bets to the same format as blockchain bets for unified handling
  const formattedDatabaseBets = databaseBets.map(dbBet => {
    const match = matches.find(m => 
      m.id === dbBet.marketId || 
      m.id === dbBet.market_id ||
      m.contractMarketId === dbBet.marketId ||
      m.contract_market_id === dbBet.marketId
    );
    
    return {
      marketId: dbBet.marketId || dbBet.market_id,
      bet: {
        outcome: dbBet.outcome,
        amount: dbBet.amountWei || dbBet.amount_wei,
        claimed: dbBet.status === 'won' && dbBet.claimed,
        placedAt: dbBet.placedAt || dbBet.placed_at
      },
      market: match ? {
        isResolved: dbBet.status === 'won' || dbBet.status === 'lost',
        winningOutcome: dbBet.is_winner ? dbBet.outcome : (dbBet.status === 'lost' ? (dbBet.outcome === 1 ? 2 : 1) : null)
      } : { isResolved: false },
      transactionHash: dbBet.transactionHash || dbBet.transaction_hash,
      status: dbBet.status,
      isDatabaseBet: true
    };
  });

  // Merge all bets (deduplicated blockchain + database bets)
  const allBets = [...deduplicatedUserBets, ...formattedDatabaseBets];
  
  const activeBets = allBets.filter(bet => !bet.market.isResolved && bet.status !== 'won' && bet.status !== 'lost');
  const resolvedBets = allBets.filter(bet => bet.market.isResolved || bet.status === 'won' || bet.status === 'lost');
  const winningBets = resolvedBets.filter(bet => 
    bet.bet.outcome === bet.market.winningOutcome || bet.status === 'won'
  );
  const losingBets = resolvedBets.filter(bet => 
    (bet.market.winningOutcome && bet.bet.outcome !== bet.market.winningOutcome) || bet.status === 'lost'
  );

  const totalWagered = allBets.reduce((total, bet) => {
    const amount = bet.isDatabaseBet ? 
      parseFloat(bet.bet.amount) / 1e18 : 
      parseFloat(formatEther(bet.bet.amount));
    return total + amount;
  }, 0);
  
  const winRate = resolvedBets.length > 0 ? 
    ((winningBets.length / resolvedBets.length) * 100).toFixed(1) : 0;

  const renderBetCard = (betData, key) => {
    // Try multiple ways to find the match
    const match = matches.find(m => 
      m.id === betData.marketId || 
      m.contractMarketId === betData.marketId ||
      m.contract_market_id === betData.marketId
    );
    const matchName = match ? `${match.home_team || match.homeTeam} vs ${match.away_team || match.awayTeam}` : `Market #${betData.marketId}`;
    
    // Convert outcome number to proper format for getOutcomeName
    const outcomeNumber = safeToNumber(betData.bet.outcome);
    console.log('🎯 Rendering blockchain bet - Market:', betData.marketId, 'Outcome:', outcomeNumber, 'Match:', match);
    
    return (
      <div key={key || betData.marketId} className="bet-card">
        <div className="bet-header">
          <h3 className="match-name">{matchName}</h3>
          <span className={`status-badge ${betData.market.isResolved ? 'resolved' : 'active'}`}>
            {betData.market.isResolved ? '✅ Resolved' : '⏳ Active'}
          </span>
        </div>
        
        <div className="bet-details">
          <div className="detail-item">
            <span className="detail-label">🎲 Outcome:</span>
            <span className="detail-value">{getOutcomeName(outcomeNumber, match)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">💰 Amount:</span>
            <span className="detail-value">{formatEther(betData.bet.amount)} ETH</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">🧾 Fee:</span>
            <span className="detail-value">{betData.bet.feePercent || betData.feePercent || '3'}%</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">📅 Placed:</span>
            <span className="detail-value">{
              betData.bet.placedAt && Number(betData.bet.placedAt) > 0 
                ? new Date(Number(betData.bet.placedAt) * 1000).toLocaleDateString()
                : 'Unknown'
            }</span>
          </div>
        </div>
        
        {betData.market.isResolved && (
          <div className="resolution-section">
            <div className="winning-outcome">
              <strong>🏆 Winning Outcome:</strong> {getOutcomeName(safeToNumber(betData.market.winningOutcome), match)}
            </div>
            
            {safeToNumber(betData.bet.outcome) === safeToNumber(betData.market.winningOutcome) ? (
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
  const renderDatabaseBetCard = (betData, key) => {
    // Handle both old format (direct database bet) and new unified format
    const bet = betData.isDatabaseBet ? {
      id: betData.marketId,
      marketId: betData.marketId,
      outcome: betData.bet.outcome,
      amountWei: betData.bet.amount,
      amount_wei: betData.bet.amount,
      placedAt: betData.bet.placedAt,
      placed_at: betData.bet.placedAt,
      transactionHash: betData.transactionHash,
      transaction_hash: betData.transactionHash,
      status: betData.status
    } : betData;

    // Try multiple ways to find the match
    const match = matches.find(m => 
      m.id === bet.marketId || 
      m.id === bet.market_id ||
      m.contractMarketId === bet.marketId ||
      m.contract_market_id === bet.marketId
    );
    
    const matchName = match ? `${match.home_team || match.homeTeam} vs ${match.away_team || match.awayTeam}` : 
                      bet.homeTeam && bet.awayTeam ? `${bet.homeTeam} vs ${bet.awayTeam}` : 
                      `Market #${bet.marketId || bet.market_id}`;
    
    // Convert outcome to number for consistency
    const outcomeNumber = safeToNumber(bet.outcome);
    console.log('🎯 Rendering database bet - Market:', bet.marketId || bet.market_id, 'Outcome:', outcomeNumber, 'Match:', match);
    
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
      <div key={key || bet.id} className="bet-card database-bet">
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
            <span className="detail-value">{getOutcomeName(outcomeNumber, match)}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">💰 Amount:</span>
            <span className="detail-value">{(safeToNumber(bet.amountWei || bet.amount_wei) / 1e18).toFixed(4)} ETH</span>
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
                  {activeBets.map((bet, index) => 
                    bet.isDatabaseBet ? 
                      renderDatabaseBetCard(bet, `active-${index}`) : 
                      renderBetCard(bet, `active-${index}`)
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
              {resolvedBets.length > 0 ? (
                <div className="bets-grid">
                  {resolvedBets.map((bet, index) => 
                    bet.isDatabaseBet ? 
                      renderDatabaseBetCard(bet, `resolved-${index}`) : 
                      renderBetCard(bet, `resolved-${index}`)
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
                    <div className="stat-value">{allBets.length}</div>
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
                        {allBets.length > 0 ? (totalWagered / allBets.length).toFixed(4) : '0'} ETH
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
                        {activeBets.length}
                      </span>
                    </div>
                  </div>
                </div>

                {allBets.length > 0 && (
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
