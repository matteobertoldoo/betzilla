import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './Bet.css';

const Bet = ({ 
  account, 
  contract, 
  placeBet, 
  getEstimatedOdds, 
  getCurrentFee,
  getMarketDetails,
  loading 
}) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [matchBetData, setMatchBetData] = useState({}); // Individual bet data per match
  const [liveOdds, setLiveOdds] = useState({});
  const [fee, setFee] = useState({});

  // Initialize bet data for a match
  const initializeMatchBetData = (matchId) => {
    setMatchBetData(prev => ({
      ...prev,
      [matchId]: {
        betAmount: prev[matchId]?.betAmount || '',
        selectedOutcome: prev[matchId]?.selectedOutcome || 1
      }
    }));
  };

  // Update bet amount for a specific match
  const updateBetAmount = (matchId, amount) => {
    setMatchBetData(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        betAmount: amount
      }
    }));
  };

  // Update selected outcome for a specific match
  const updateSelectedOutcome = (matchId, outcome) => {
    setMatchBetData(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        selectedOutcome: outcome
      }
    }));
  };

  // Filter matches based on search term
  const filterMatches = (matchesToFilter, search) => {
    if (!search.trim()) {
      return matchesToFilter;
    }
    
    const searchLower = search.toLowerCase();
    return matchesToFilter.filter(match => 
      match.homeTeam?.toLowerCase().includes(searchLower) ||
      match.awayTeam?.toLowerCase().includes(searchLower) ||
      match.league?.toLowerCase().includes(searchLower) ||
      match.sport?.toLowerCase().includes(searchLower) ||
      match.description?.toLowerCase().includes(searchLower) ||
      match.category?.toLowerCase().includes(searchLower)
    );
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFilteredMatches(filterMatches(matches, value));
  };

  // Save bet to database after successful blockchain transaction
  const saveBetToDatabase = async (marketId, outcome, amountWei, transactionHash) => {
    if (!user) {
      console.warn('User not authenticated, skipping database save');
      return;
    }

    try {
      const token = localStorage.getItem('betzilla_token');
      if (!token) {
        console.warn('No auth token found, skipping database save');
        return;
      }

      const response = await fetch('http://localhost:4000/api/betting/bets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          marketId,
          outcome,
          amountWei,
          transactionHash
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Bet saved to database:', data.bet);
        return data.bet;
      } else {
        console.error('❌ Failed to save bet to database:', data.message);
      }
    } catch (error) {
      console.error('❌ Error saving bet to database:', error);
    }
  };

  // Fetch matches from backend
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/matches?upcoming=true&limit=30');
        const data = await response.json();
        if (data.success) {
          console.log('Raw matches from API:', data.data);
          
          // Remove duplicates based on title and teams
          const uniqueMatches = data.data.filter((match, index, self) => 
            index === self.findIndex(m => 
              m.title === match.title && 
              m.home_team === match.home_team && 
              m.away_team === match.away_team
            )
          );
          
          // Since contract_market_id wasn't updated due to auth issues during deployment,
          // we'll map the first 30 unique matches to contract market IDs 1-30
          // Use a hash of the match details as a stable ID to avoid position-based issues
          const transformedMatches = uniqueMatches
            .slice(0, 30) // Only take first 30 matches since contract has 30 markets
            .map((match, index) => {
              // Create a stable ID based on match content, but still use index for contract mapping
              const stableId = `${match.home_team}_${match.away_team}_${match.start_time}`.replace(/[^a-zA-Z0-9]/g, '_');
              return {
                id: index + 1, // This is the contract market ID (1-30) - contract markets start from 1
                stableId: stableId, // This is for UI consistency
                homeTeam: match.home_team,
                awayTeam: match.away_team,
                league: match.league,
                description: match.description,
                startTime: match.start_time,
                sport: match.sport,
                category: match.category,
                odds: {
                  home: 0, // Will be fetched from contract
                  away: 0, // Will be fetched from contract
                  draw: match.sport === 'Football' ? 0 : -1 // Only football has draws
                }
              };
            });
          
          console.log('Transformed matches for frontend:', transformedMatches);
          setMatches(transformedMatches);
          setFilteredMatches(transformedMatches); // Initialize filtered matches
          
          // Initialize bet data for each match
          transformedMatches.forEach(match => {
            initializeMatchBetData(match.id);
          });
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
      }
    };

    fetchMatches();
  }, []);

  // Load live odds and fees for each match
  useEffect(() => {
    const fetchLiveOddsAndFee = async () => {
      if (!contract) return;
      const oddsObj = {};
      const feeObj = {};
      for (const match of matches) {
        const isWithin24Hours = isMatchWithin24Hours(match.startTime);
        
        try {
          if (isWithin24Hours && getMarketDetails) {
            // For matches within 24 hours, get market details for parimutuel calculation
            const marketDetails = await getMarketDetails(match.id);
            oddsObj[match.id] = marketDetails.outcomeAmounts;
          } else {
            // For other matches, get estimated odds as before
            const odds = await getEstimatedOdds(match.id);
            oddsObj[match.id] = odds;
          }
        } catch (e) {
          console.error(`Error fetching odds for match ${match.id}:`, e);
          oddsObj[match.id] = null;
        }
        
        try {
          const f = await getCurrentFee(match.id);
          feeObj[match.id] = f;
        } catch (e) {
          feeObj[match.id] = null;
        }
      }
      setLiveOdds(oddsObj);
      setFee(feeObj);
    };
    fetchLiveOddsAndFee();
  }, [contract, matches, getEstimatedOdds, getCurrentFee, getMarketDetails]);

  // Check if match is within 24 hours
  const isMatchWithin24Hours = (startTime) => {
    const matchTime = new Date(startTime);
    const now = new Date();
    const timeDiff = matchTime.getTime() - now.getTime();
    const hoursUntilMatch = timeDiff / (1000 * 60 * 60);
    return hoursUntilMatch <= 24 && hoursUntilMatch > 0;
  };

  // Calculate parimutuel odds based on bet amounts
  const calculateParimutuelOdds = (marketId) => {
    if (!liveOdds[marketId]) return null;
    
    // Get the outcome amounts from the smart contract
    const outcomeAmounts = liveOdds[marketId];
    if (!outcomeAmounts || outcomeAmounts.length === 0) return null;
    
    // Calculate total pool
    const totalPool = outcomeAmounts.reduce((sum, amount) => sum + Number(amount), 0);
    if (totalPool === 0) return null;
    
    // Calculate parimutuel odds for each outcome
    // Odds = Total Pool / Amount on this outcome
    const parimutuelOdds = outcomeAmounts.map(amount => {
      if (Number(amount) === 0) return 0;
      return (totalPool / Number(amount));
    });
    
    return parimutuelOdds;
  };

  const handlePlaceBet = async (marketId) => {
    const betData = matchBetData[marketId];
    if (!betData || !betData.betAmount || betData.betAmount <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    // Validation outcome for market
    const match = matches.find(m => m.id === marketId);
    if (match) {
      const maxOutcome = match.odds.draw > 0 ? 3 : 2;
      if (betData.selectedOutcome > maxOutcome) {
        alert(`Invalid outcome. For ${match.homeTeam} vs ${match.awayTeam}, valid outcomes are 1-${maxOutcome}`);
        return;
      }
    }

    try {
      // Place bet on blockchain first
      const receipt = await placeBet(marketId, betData.selectedOutcome, betData.betAmount);
      
      // Calculate amount in Wei (same calculation as in the smart contract)
      const amountWei = (parseFloat(betData.betAmount) * 1e18).toString();
      
      // Save bet to database after successful blockchain transaction
      if (user) {
        await saveBetToDatabase(marketId, betData.selectedOutcome, amountWei, receipt.hash);
      }
      
      alert('Bet placed successfully!');
      
      // Clear bet data for this match after successful bet
      updateBetAmount(marketId, '');
      updateSelectedOutcome(marketId, 1);
      
      // Refresh portfolio data if available
      if (window.refreshPortfolio) {
        window.refreshPortfolio();
      }
    } catch (error) {
      console.error('Smart contract error:', error);
      alert(`Error placing bet: ${error.message}`);
    }
  };

  if (!account) {
    return (
      <div className="bet-page">
        <div className="container">
          <div className="wallet-prompt">
            <div className="prompt-content">
              <h2>🔒 Wallet Connection Required</h2>
              <p>Please connect your MetaMask wallet to start betting on sports matches.</p>
              <div className="prompt-icon">🦊</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bet-page">
      <div className="container">
        <div className="page-header">
          <h1>🎯 Available Matches</h1>
          <p>Place your blind bets before odds are revealed</p>
        </div>

        <div className="search-section">
          <div className="search-container">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="search-input"
                placeholder="Search matches by team, sport, league..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => {
                    setSearchTerm('');
                    setFilteredMatches(matches);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
            <div className="search-results-info">
              {searchTerm ? (
                <span>
                  Found {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''} 
                  {searchTerm && ` for "${searchTerm}"`}
                </span>
              ) : (
                <span>Showing {filteredMatches.length} available matches</span>
              )}
            </div>
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="no-matches">
            <div className="empty-state">
              <div className="empty-icon">{searchTerm ? '🔍' : '⚽'}</div>
              <h3>{searchTerm ? 'No matches found' : 'No matches available'}</h3>
              <p>
                {searchTerm 
                  ? `Try searching for different terms or clear your search to see all matches.`
                  : 'Check back later for new betting opportunities!'
                }
              </p>
              {searchTerm && (
                <button 
                  className="clear-search-btn"
                  onClick={() => {
                    setSearchTerm('');
                    setFilteredMatches(matches);
                  }}
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="matches-grid">
            {filteredMatches.map((match) => (
              <div key={match.stableId} className="match-card">
                <div className="match-header">
                  <div className="teams">
                    <h3>{match.homeTeam} vs {match.awayTeam}</h3>
                    <div className="match-badges">
                      <span className="league-badge">{match.league}</span>
                      <span className="sport-badge">{match.sport}</span>
                    </div>
                  </div>
                  <div className="match-info">
                    <span className="match-date">📅 {new Date(match.startTime).toLocaleDateString()}</span>
                    <span className="match-time">⏰ {new Date(match.startTime).toLocaleTimeString()}</span>
                  </div>
                </div>
                
                <div className="match-description">
                  <p>{match.description}</p>
                </div>
                
                <div className="odds-section">
                  <h4>Current Odds</h4>
                  {(() => {
                    const isWithin24Hours = isMatchWithin24Hours(match.startTime);
                    const parimutuelOdds = isWithin24Hours ? calculateParimutuelOdds(match.id) : null;
                    const showParimutuel = isWithin24Hours && parimutuelOdds;
                    
                    return (
                      <>
                        <div className={`odds-display ${isWithin24Hours ? 'parimutuel-mode' : ''}`}>
                          <div className="odds-item">
                            <div className="odds-value">
                              {showParimutuel
                                ? parimutuelOdds[0] > 0 ? parimutuelOdds[0].toFixed(2) : 'N/A'
                                : liveOdds[match.id] && liveOdds[match.id][0] > 0
                                  ? (liveOdds[match.id][0] / 100).toFixed(2)
                                  : '???'}
                            </div>
                            <div className="odds-label">{match.homeTeam}</div>
                          </div>
                          {match.odds.draw > 0 && (
                            <div className="odds-item">
                              <div className="odds-value">
                                {showParimutuel
                                  ? parimutuelOdds[1] > 0 ? parimutuelOdds[1].toFixed(2) : 'N/A'
                                  : liveOdds[match.id] && liveOdds[match.id][1] > 0
                                    ? (liveOdds[match.id][1] / 100).toFixed(2)
                                    : '???'}
                              </div>
                              <div className="odds-label">Draw</div>
                            </div>
                          )}
                          <div className="odds-item">
                            <div className="odds-value">
                              {showParimutuel
                                ? parimutuelOdds[match.odds.draw > 0 ? 2 : 1] > 0 
                                  ? parimutuelOdds[match.odds.draw > 0 ? 2 : 1].toFixed(2) 
                                  : 'N/A'
                                : liveOdds[match.id] && (match.odds.draw > 0 ? liveOdds[match.id][2] : liveOdds[match.id][1]) > 0
                                  ? ((match.odds.draw > 0 ? liveOdds[match.id][2] : liveOdds[match.id][1]) / 100).toFixed(2)
                                  : '???'}
                            </div>
                            <div className="odds-label">{match.awayTeam}</div>
                          </div>
                        </div>
                        <div className="odds-info">
                          {isWithin24Hours ? (
                            showParimutuel ? (
                              <span className="parimutuel-info">
                                🎲 Parimutuel Odds - Based on current betting pool
                              </span>
                            ) : (
                              <span className="parimutuel-loading">
                                🎲 Parimutuel Mode Active - Loading odds...
                              </span>
                            )
                          ) : liveOdds[match.id] && liveOdds[match.id][0] > 0 ? (
                            `💰 Live Odds Available! Fee: ${fee[match.id] || '?'}%`
                          ) : (
                            '🔒 Blind Betting - Odds revealed at match start'
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="betting-section">
                  <div className="bet-controls">
                    <div className="outcome-selector">
                      <label>Choose Outcome:</label>
                      <select 
                        className="outcome-select"
                        value={matchBetData[match.id]?.selectedOutcome || 1}
                        onChange={(e) => updateSelectedOutcome(match.id, parseInt(e.target.value))}
                      >
                        <option value={1}>🏠 {match.homeTeam}</option>
                        {match.odds.draw > 0 && <option value={2}>🤝 Draw</option>}
                        <option value={match.odds.draw > 0 ? 3 : 2}>🚀 {match.awayTeam}</option>
                      </select>
                    </div>
                    
                    <div className="amount-input">
                      <label>Bet Amount (ETH):</label>
                      <input
                        type="number"
                        className="bet-amount-input"
                        placeholder="0.01"
                        value={matchBetData[match.id]?.betAmount || ''}
                        onChange={(e) => updateBetAmount(match.id, e.target.value)}
                        step="0.01"
                        min="0.001"
                      />
                    </div>
                  </div>
                  
                  <div className="blind-betting-info">
                    <div className="info-box">
                      <span className="info-icon">💡</span>
                      <span>Blind betting: Place your bet before odds are revealed for a fair experience!</span>
                    </div>
                  </div>
                  
                  <button 
                    className="place-bet-btn"
                    onClick={() => handlePlaceBet(match.id)}
                    disabled={loading || !matchBetData[match.id]?.betAmount || matchBetData[match.id]?.betAmount <= 0}
                  >
                    {loading ? (
                      <div className="btn-loading">
                        <span className="loading-spinner"></span>
                        Placing Bet...
                      </div>
                    ) : (
                      <>
                        <span className="btn-icon">🎯</span>
                        Place Bet
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bet;
