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
  const [userBets, setUserBets] = useState({}); // Store user bets for each match
  const [payoutCalculations, setPayoutCalculations] = useState({}); // Store payout calculations

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
          
          // Transform matches to use proper contract market IDs
          const transformedMatches = uniqueMatches.map((match, index) => {
            // Create a stable ID based on match content
            const stableId = `${match.home_team}_${match.away_team}_${match.start_time}`.replace(/[^a-zA-Z0-9]/g, '_');
            return {
              id: match.id, // Use database ID for UI state management
              contractMarketId: match.contract_market_id, // Use contract market ID for blockchain calls
              stableId: stableId, // This is for UI consistency
              homeTeam: match.home_team,
              awayTeam: match.away_team,
              league: match.league,
              description: match.description,
              startTime: match.start_time,
              sport: match.sport,
              category: match.category,
              hasDrawOption: match.sport === 'Football' || match.sport === 'Soccer', // Football/Soccer matches have draw option
              odds: {
                home: 0, // Will be fetched from contract
                away: 0, // Will be fetched from contract
                draw: (match.sport === 'Football' || match.sport === 'Soccer') ? 0 : -1 // Only football/soccer has draws
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
        const marketId = match.contractMarketId || match.id; // Use contractMarketId if available, fallback to match.id
        
        // Skip matches without contract market ID for now
        if (!match.contractMarketId) {
          console.warn(`Skipping match ${match.id} - no contract market ID`);
          continue;
        }
        
        try {
          if (isWithin24Hours && getMarketDetails && match.contractMarketId) {
            // For matches within 24 hours, get market details for parimutuel calculation
            // Only if there's a contract market ID
            const marketDetails = await getMarketDetails(marketId);
            oddsObj[match.id] = marketDetails.outcomeAmounts;
          } else {
            // For other matches, get estimated odds as before
            const odds = await getEstimatedOdds(marketId);
            oddsObj[match.id] = odds;
          }
        } catch (e) {
          console.error(`Error fetching odds for match ${match.id} (contract market ${marketId}):`, e);
          oddsObj[match.id] = null;
        }
        
        try {
          const f = await getCurrentFee(marketId);
          feeObj[match.id] = f;
        } catch (e) {
          feeObj[match.id] = null;
        }
      }
      setLiveOdds(oddsObj);
      setFee(feeObj);
      
      // Fetch user bets after odds are loaded
      if (account) {
        await fetchUserBets();
      }
    };
    fetchLiveOddsAndFee();
  }, [contract, matches, getEstimatedOdds, getCurrentFee, getMarketDetails, account]);

  // Calculate payouts when odds or user bets change
  useEffect(() => {
    const calculatePayouts = () => {
      const payoutObj = {};
      matches.forEach(match => {
        const isWithin24Hours = isMatchWithin24Hours(match.startTime);
        if (isWithin24Hours && userBets[match.id]) {
          const parimutuelOdds = calculateParimutuelOdds(match.id);
          if (parimutuelOdds) {
            payoutObj[match.id] = calculatePayout(match, userBets[match.id], parimutuelOdds);
          }
        }
      });
      setPayoutCalculations(payoutObj);
    };
    
    if (Object.keys(userBets).length > 0) {
      calculatePayouts();
    }
  }, [liveOdds, userBets, matches]);

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
    
    // Find the match to determine if it has a draw option
    const match = matches.find(m => m.id === marketId);
    const hasDrawOption = match ? match.hasDrawOption : false;
    
    // Calculate parimutuel odds for each outcome
    // Odds = Total Pool / Amount on this outcome
    const parimutuelOdds = [];
    
    // Home team (outcome 1)
    if (Number(outcomeAmounts[0]) === 0) {
      parimutuelOdds[0] = 0;
    } else {
      parimutuelOdds[0] = totalPool / Number(outcomeAmounts[0]);
    }
    
    // Draw (outcome 2) - only for matches with draw option
    if (hasDrawOption) {
      if (Number(outcomeAmounts[1]) === 0) {
        parimutuelOdds[1] = 0;
      } else {
        parimutuelOdds[1] = totalPool / Number(outcomeAmounts[1]);
      }
      
      // Away team (outcome 3) when draw is available
      if (Number(outcomeAmounts[2]) === 0) {
        parimutuelOdds[2] = 0;
      } else {
        parimutuelOdds[2] = totalPool / Number(outcomeAmounts[2]);
      }
    } else {
      // Away team (outcome 2) when no draw available
      if (Number(outcomeAmounts[1]) === 0) {
        parimutuelOdds[1] = 0;
      } else {
        parimutuelOdds[1] = totalPool / Number(outcomeAmounts[1]);
      }
    }
    
    return parimutuelOdds;
  };

  // Fetch user's current bets for each match
  const fetchUserBets = async () => {
    if (!contract || !account) return;
    
    const userBetsObj = {};
    for (const match of matches) {
      if (!match.contractMarketId) continue;
      
      try {
        const userBet = await contract.getUserBet(match.contractMarketId, account);
        if (userBet && Number(userBet[1]) > 0) { // userBet[1] is the amount
          userBetsObj[match.id] = {
            outcome: Number(userBet[0]),
            amount: userBet[1],
            claimed: userBet[2],
            refunded: userBet[3],
            placedAt: userBet[4]
          };
        }
      } catch (error) {
        console.error(`Error fetching user bet for match ${match.id}:`, error);
      }
    }
    setUserBets(userBetsObj);
  };

  // Calculate potential payout for a user's bet
  const calculatePayout = (match, userBet, parimutuelOdds) => {
    if (!userBet || !parimutuelOdds || userBet.claimed || userBet.refunded) return null;
    
    const betOutcome = userBet.outcome;
    const betAmount = Number(userBet.amount);
    const odds = parimutuelOdds[betOutcome - 1]; // Convert to 0-based index
    
    if (!odds || odds <= 0) return null;
    
    // Calculate gross payout (bet amount * odds)
    const grossPayout = betAmount * odds;
    
    // Apply platform fee (3% as defined in contract)
    const feeAmount = grossPayout * 0.03;
    const netPayout = grossPayout - feeAmount;
    
    return {
      betAmount: betAmount / 1e18, // Convert from Wei to ETH
      odds: odds,
      grossPayout: grossPayout / 1e18,
      feeAmount: feeAmount / 1e18,
      netPayout: netPayout / 1e18,
      outcome: betOutcome,
      profit: (netPayout - betAmount) / 1e18
    };
  };

  const handlePlaceBet = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) {
      alert('Match not found');
      return;
    }

    // Use contract market ID if available, otherwise show error
    if (!match.contractMarketId) {
      alert('This match is not available for betting yet. Please try again later.');
      return;
    }
    
    const contractMarketId = match.contractMarketId;
    
    const betData = matchBetData[matchId];
    if (!betData || !betData.betAmount || betData.betAmount <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    // Validation outcome for market
    if (match) {
      const maxOutcome = match.hasDrawOption ? 3 : 2;
      if (betData.selectedOutcome > maxOutcome) {
        alert(`Invalid outcome. For ${match.homeTeam} vs ${match.awayTeam}, valid outcomes are 1-${maxOutcome}`);
        return;
      }
    }

    try {
      // Place bet on blockchain using contract market ID
      const receipt = await placeBet(contractMarketId, betData.selectedOutcome, betData.betAmount);
      
      // Calculate amount in Wei (same calculation as in the smart contract)
      const amountWei = (parseFloat(betData.betAmount) * 1e18).toString();
      
      // Save bet to database after successful blockchain transaction (using database match ID)
      if (user) {
        await saveBetToDatabase(matchId, betData.selectedOutcome, amountWei, receipt.hash);
      }
      
      alert('Bet placed successfully!');
      
      // Clear bet data for this match after successful bet
      updateBetAmount(matchId, '');
      updateSelectedOutcome(matchId, 1);
      
      // Refresh user bets to show the new bet
      await fetchUserBets();
      
      // Refresh portfolio data if available
      if (window.refreshPortfolio) {
        window.refreshPortfolio();
      }
    } catch (error) {
      console.error('Smart contract error:', error);
      alert(`Error placing bet: ${error.message}`);
    }
  };

  useEffect(() => {
    // Fetch user's bets whenever matches or account changes
    fetchUserBets();
  }, [matches, account, contract]);

  useEffect(() => {
    const newPayoutCalculations = {};
    
    // Calculate payout for each match with active user bet
    Object.keys(userBets).forEach(matchId => {
      const match = matches.find(m => m.id === matchId);
      const userBet = userBets[matchId];
      
      if (match && userBet) {
        const isWithin24Hours = isMatchWithin24Hours(match.startTime);
        const parimutuelOdds = isWithin24Hours ? calculateParimutuelOdds(match.id) : null;
        
        if (parimutuelOdds) {
          const payout = calculatePayout(match, userBet, parimutuelOdds);
          if (payout) {
            newPayoutCalculations[matchId] = payout;
          }
        }
      }
    });
    
    setPayoutCalculations(newPayoutCalculations);
  }, [userBets, matches]);

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

        {/* Upcoming Matches with Bets Summary */}
        {Object.keys(userBets).length > 0 && (
          <div className="upcoming-bets-summary">
            <h3>🔥 Your Upcoming Matches (Next 24 Hours)</h3>
            <div className="summary-cards">
              {matches
                .filter(match => isMatchWithin24Hours(match.startTime) && userBets[match.id])
                .map(match => {
                  const payout = payoutCalculations[match.id];
                  const userBet = userBets[match.id];
                  return (
                    <div key={match.id} className="summary-card">
                      <div className="summary-match">
                        <strong>{match.homeTeam} vs {match.awayTeam}</strong>
                        <span className="summary-time">
                          {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="summary-bet">
                        <span>Bet: {(Number(userBet.amount) / 1e18).toFixed(3)} ETH on {
                          userBet.outcome === 1 ? match.homeTeam :
                          userBet.outcome === 2 && match.hasDrawOption ? 'Draw' :
                          match.awayTeam
                        }</span>
                        {payout && (
                          <span className={`summary-payout ${payout.profit > 0 ? 'positive' : 'negative'}`}>
                            Potential: {payout.netPayout.toFixed(3)} ETH ({payout.profit > 0 ? '+' : ''}{payout.profit.toFixed(3)})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

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
                          {match.hasDrawOption && (
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
                                ? parimutuelOdds[match.hasDrawOption ? 2 : 1] > 0 
                                  ? parimutuelOdds[match.hasDrawOption ? 2 : 1].toFixed(2) 
                                  : 'N/A'
                                : liveOdds[match.id] && (match.hasDrawOption ? liveOdds[match.id][2] : liveOdds[match.id][1]) > 0
                                  ? ((match.hasDrawOption ? liveOdds[match.id][2] : liveOdds[match.id][1]) / 100).toFixed(2)
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

                {/* Payout Information for matches within 24 hours */}
                {isMatchWithin24Hours(match.startTime) && userBets[match.id] && payoutCalculations[match.id] && (
                  <div className="payout-section">
                    <h4>🎯 Your Bet & Potential Payout</h4>
                    <div className="payout-info">
                      <div className="bet-summary">
                        <div className="bet-detail">
                          <span className="bet-label">Your Bet:</span>
                          <span className="bet-value">
                            {payoutCalculations[match.id].betAmount.toFixed(4)} ETH on {
                              userBets[match.id].outcome === 1 ? match.homeTeam :
                              userBets[match.id].outcome === 2 && match.hasDrawOption ? 'Draw' :
                              match.awayTeam
                            }
                          </span>
                        </div>
                        <div className="bet-detail">
                          <span className="bet-label">Current Odds:</span>
                          <span className="bet-value">{payoutCalculations[match.id].odds.toFixed(2)}x</span>
                        </div>
                        <div className="bet-detail">
                          <span className="bet-label">Gross Payout:</span>
                          <span className="bet-value">{payoutCalculations[match.id].grossPayout.toFixed(4)} ETH</span>
                        </div>
                        <div className="bet-detail">
                          <span className="bet-label">Platform Fee (3%):</span>
                          <span className="bet-value">-{payoutCalculations[match.id].feeAmount.toFixed(4)} ETH</span>
                        </div>
                        <div className="bet-detail payout-highlight">
                          <span className="bet-label">Net Payout:</span>
                          <span className="bet-value">{payoutCalculations[match.id].netPayout.toFixed(4)} ETH</span>
                        </div>
                        <div className="bet-detail profit-highlight">
                          <span className="bet-label">Potential Profit:</span>
                          <span className={`bet-value ${payoutCalculations[match.id].profit > 0 ? 'profit-positive' : 'profit-negative'}`}>
                            {payoutCalculations[match.id].profit > 0 ? '+' : ''}{payoutCalculations[match.id].profit.toFixed(4)} ETH
                          </span>
                        </div>
                      </div>
                      <div className="payout-note">
                        <span className="note-icon">⚠️</span>
                        <span>Odds update in real-time as more bets are placed. Final payout will be calculated when betting closes.</span>
                      </div>
                    </div>
                  </div>
                )}

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
                        {match.hasDrawOption && <option value={2}>🤝 Draw</option>}
                        <option value={match.hasDrawOption ? 3 : 2}>🚀 {match.awayTeam}</option>
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

                {userBets[match.id] && (
                  <div className="user-bet-info">
                    <h4>Your Bet</h4>
                    <div className="bet-details">
                      <div className="detail-item">
                        <span className="detail-label">Outcome:</span>
                        <span className="detail-value">
                          {userBets[match.id].outcome === 1 
                            ? match.homeTeam 
                            : userBets[match.id].outcome === 2 
                              ? 'Draw' 
                              : match.awayTeam}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Amount:</span>
                        <span className="detail-value">{(userBets[match.id].amount / 1e18).toFixed(4)} ETH</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className="detail-value">
                          {userBets[match.id].claimed 
                            ? 'Claimed' 
                            : userBets[match.id].refunded 
                              ? 'Refunded' 
                              : 'Active'}
                        </span>
                      </div>
                    </div>
                    
                    {userBets[match.id].claimed && (
                      <div className="claim-info">
                        <span className="claim-icon">✅</span>
                        <span className="claim-text">Your payout has been claimed.</span>
                      </div>
                    )}
                    
                    {userBets[match.id].refunded && (
                      <div className="refund-info">
                        <span className="refund-icon">💸</span>
                        <span className="refund-text">Your bet was refunded.</span>
                      </div>
                    )}
                    
                    {!userBets[match.id].claimed && !userBets[match.id].refunded && (
                      <div className="payout-potential">
                        <h5>Potential Payout</h5>
                        <div className="payout-details">
                          <div className="detail-item">
                            <span className="detail-label">Odds:</span>
                            <span className="detail-value">
                              {payoutCalculations[match.id]?.odds.toFixed(2) || 'N/A'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Gross Payout:</span>
                            <span className="detail-value">
                              {payoutCalculations[match.id]?.grossPayout.toFixed(4) || 'N/A'} ETH
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Fee (3%):</span>
                            <span className="detail-value">
                              {payoutCalculations[match.id]?.feeAmount.toFixed(4) || 'N/A'} ETH
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Net Payout:</span>
                            <span className="detail-value">
                              {payoutCalculations[match.id]?.netPayout.toFixed(4) || 'N/A'} ETH
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bet;
