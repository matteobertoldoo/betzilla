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
  const [bettingLoading, setBettingLoading] = useState({}); // Individual loading state for each match
  const [parimutuelMatches, setParimutuelMatches] = useState([]); // Store matches with parimutuel odds

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

    const fetchParimutuelOdds = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/parimutuel/matches/next24hours');
        const data = await response.json();
        if (data.success) {
          console.log('Parimutuel matches with odds:', data.data.matches);
          setParimutuelMatches(data.data.matches);
        }
      } catch (error) {
        console.error('Error fetching parimutuel odds:', error);
      }
    };

    fetchMatches();
    fetchParimutuelOdds();
    
    // Refresh parimutuel odds every 30 seconds
    const interval = setInterval(fetchParimutuelOdds, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load live odds and fees for each match
  useEffect(() => {
    const fetchLiveOddsAndFee = async () => {
      if (!contract) {
        console.log('Contract not available, skipping blockchain odds fetch');
        return;
      }
      
      const oddsObj = {};
      const feeObj = {};
      for (const match of matches) {
        const isWithin24Hours = isMatchWithin24Hours(match.startTime);
        const marketId = match.contractMarketId || match.id; // Use contractMarketId if available, fallback to match.id
        
        // For matches within 24 hours, prioritize parimutuel odds from backend
        if (isWithin24Hours) {
          console.log(`Match ${match.id} is within 24 hours - will use parimutuel odds from backend`);
          continue;
        }
        
        // Skip matches without contract market ID for blockchain calls
        if (!match.contractMarketId) {
          console.log(`Skipping match ${match.id} - no contract market ID for blockchain interaction`);
          continue;
        }
        
        try {
          if (getMarketDetails && match.contractMarketId) {
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

  // Get betting phase info
  const getBettingPhaseInfo = (startTime) => {
    const matchTime = new Date(startTime);
    const now = new Date();
    const timeDiff = matchTime.getTime() - now.getTime();
    const hoursUntilMatch = timeDiff / (1000 * 60 * 60);
    
    return {
      isEarlyPhase: hoursUntilMatch > 24,
      isParimutuelPhase: hoursUntilMatch <= 24 && hoursUntilMatch > 0,
      isMatchStarted: hoursUntilMatch <= 0,
      hoursUntilMatch: Math.max(0, hoursUntilMatch),
      currentFeePercent: hoursUntilMatch > 24 ? 2 : 3,
      phaseDescription: hoursUntilMatch > 24 ? 'Early Betting (2% Fee)' : 
                       hoursUntilMatch > 0 ? 'Parimutuel Phase (3% Fee)' : 
                       'Match Started'
    };
  };

  // Calculate parimutuel odds based on bet amounts
  const calculateParimutuelOdds = (marketId) => {
    if (!liveOdds[marketId]) return null;
    
    // Get the outcome amounts from the smart contract
    const outcomeAmounts = liveOdds[marketId];
    if (!outcomeAmounts || outcomeAmounts.length === 0) return null;
    
    // Calculate total pool
    const totalPool = outcomeAmounts.reduce((sum, amount) => sum + safeToNumber(amount), 0);
    if (totalPool === 0) return null;
    
    // Find the match to determine if it has a draw option
    const match = matches.find(m => m.id === marketId);
    const hasDrawOption = match ? match.hasDrawOption : false;
    
    // Calculate parimutuel odds for each outcome
    // Odds = Total Pool / Amount on this outcome
    const parimutuelOdds = [];
    
    // Home team (outcome 1)
    if (safeToNumber(outcomeAmounts[0]) === 0) {
      parimutuelOdds[0] = 0;
    } else {
      parimutuelOdds[0] = totalPool / safeToNumber(outcomeAmounts[0]);
    }
    
    // Draw (outcome 2) - only for matches with draw option
    if (hasDrawOption) {
      if (safeToNumber(outcomeAmounts[1]) === 0) {
        parimutuelOdds[1] = 0;
      } else {
        parimutuelOdds[1] = totalPool / safeToNumber(outcomeAmounts[1]);
      }
      
      // Away team (outcome 3) when draw is available
      if (safeToNumber(outcomeAmounts[2]) === 0) {
        parimutuelOdds[2] = 0;
      } else {
        parimutuelOdds[2] = totalPool / safeToNumber(outcomeAmounts[2]);
      }
    } else {
      // Away team (outcome 2) when no draw available
      if (safeToNumber(outcomeAmounts[1]) === 0) {
        parimutuelOdds[1] = 0;
      } else {
        parimutuelOdds[1] = totalPool / safeToNumber(outcomeAmounts[1]);
      }
    }
    
    return parimutuelOdds;
  };

  // Get parimutuel odds for a specific match
  const getParimutuelOddsForMatch = (matchId) => {
    const parimutuelMatch = parimutuelMatches.find(pm => pm.id === matchId);
    if (!parimutuelMatch) return null;
    
    return {
      odds: parimutuelMatch.parimutuel_odds,
      display: parimutuelMatch.odds_display,
      bettingAvailable: parimutuelMatch.betting_available,
      pool: parimutuelMatch.betting_summary
    };
  };

  // Check if a match has parimutuel odds available
  const hasParimutuelOdds = (matchId) => {
    return parimutuelMatches.some(pm => pm.id === matchId);
  };

  // Fetch user's current bets for each match
  const fetchUserBets = async () => {
    const userBetsObj = {};
    
    // First, try to fetch from database
    if (user) {
      try {
        const token = localStorage.getItem('betzilla_token');
        if (token) {
          const response = await fetch('http://localhost:4000/api/betting/bets', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.bets) {
              // Convert database bets to match the expected format
              data.bets.forEach(bet => {
                userBetsObj[bet.market_id] = {
                  outcome: bet.outcome,
                  amount: bet.amount_wei,
                  claimed: bet.is_winner === true ? false : null, // Only set claimed for winners
                  refunded: false,
                  placedAt: new Date(bet.placed_at).getTime() / 1000,
                  status: bet.status,
                  isWinner: bet.is_winner,
                  fromDatabase: true // Flag to indicate this is from database
                };
              });
              console.log(`Loaded ${data.bets.length} bets from database`);
            }
          } else {
            console.log('Failed to fetch user bets from database:', response.status);
          }
        }
      } catch (error) {
        console.log('Error fetching user bets from database:', error.message);
      }
    }
    
    // Then, if we have a contract connection, try to fetch from blockchain
    if (contract && account) {
      let blockchainBetsFound = 0;
      for (const match of matches) {
        // Only try to fetch from blockchain if we have a valid contract market ID
        if (!match.contractMarketId || match.contractMarketId === null || match.contractMarketId === undefined) {
          continue;
        }
        
        try {
          const userBet = await contract.getUserBet(match.contractMarketId, account);
          if (userBet && Number(userBet[1]) > 0) { // userBet[1] is the amount
            // Blockchain data takes precedence over database data
            userBetsObj[match.id] = {
              outcome: Number(userBet[0]),
              amount: userBet[1],
              claimed: userBet[2],
              refunded: userBet[3],
              placedAt: userBet[4],
              fromDatabase: false // Flag to indicate this is from blockchain
            };
            blockchainBetsFound++;
          }
        } catch (error) {
          // Handle various error types gracefully
          if (error.message.includes('could not decode result data') || 
              error.message.includes('value="0x"') ||
              error.message.includes('execution reverted') ||
              error.message.includes('Invalid market')) {
            // This is expected when no bet exists on blockchain or contract market doesn't exist
            // Don't log this as it's normal in test mode
          } else {
            console.log(`Blockchain error for match ${match.id}:`, error.message);
          }
        }
      }
      if (blockchainBetsFound > 0) {
        console.log(`Loaded ${blockchainBetsFound} bets from blockchain`);
      }
    }
    
    setUserBets(userBetsObj);
    console.log(`Total user bets loaded: ${Object.keys(userBetsObj).length}`);
  };

  // Helper function to get outcome name from number
  const getOutcomeName = (outcomeNumber, match) => {
    const homeTeam = match.homeTeam || match.home_team;
    const awayTeam = match.awayTeam || match.away_team;
    
    switch (outcomeNumber) {
      case 1:
        return homeTeam;
      case 2:
        // Check if this sport has draw option
        const sportsWithDraw = ['Football', 'Soccer'];
        const sport = match.sport || '';
        if (sportsWithDraw.includes(sport)) {
          return 'Draw';
        } else {
          // For sports without draw, outcome 2 is away team
          return awayTeam;
        }
      case 3:
        return awayTeam;
      default:
        return `Outcome ${outcomeNumber}`;
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

  // Helper function to format wei amounts to ETH
  const formatEther = (wei) => {
    if (!wei) return '0.0000';
    return (safeToNumber(wei) / 1e18).toFixed(4);
  };

  // Calculate potential payout for a user's bet
  const calculatePayout = (match, userBet, parimutuelOdds) => {
    if (!userBet || !parimutuelOdds || userBet.claimed || userBet.refunded) return null;
    
    const betOutcome = userBet.outcome;
    const betAmount = safeToNumber(userBet.amount);
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

    // Set loading state for this specific match
    setBettingLoading(prev => ({ ...prev, [matchId]: true }));

    try {
      // Use contract market ID if available, otherwise allow testing with database ID
      const contractMarketId = match.contractMarketId;
      
      if (!contractMarketId) {
        // For testing purposes, allow betting even without contract market ID
        console.log('No contract market ID - using test mode');
        
        const betData = matchBetData[matchId];
        if (!betData || !betData.betAmount || betData.betAmount <= 0) {
          alert('Please enter a valid bet amount');
          return;
        }

        // Test mode - just save to database without blockchain interaction
        const amountWei = (parseFloat(betData.betAmount) * 1e18).toString();
        
        if (user) {
          await saveBetToDatabase(matchId, betData.selectedOutcome, amountWei, 'test-tx-hash');
          alert('Test bet placed successfully! (No blockchain interaction)');
        } else {
          alert('Test bet recorded! (Please log in for real betting)');
        }
        
        // Clear bet data
        updateBetAmount(matchId, '');
        updateSelectedOutcome(matchId, 1);
        
        // Refresh data
        await fetchUserBets();
        return;
      }
      
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
    } finally {
      // Clear loading state for this specific match
      setBettingLoading(prev => ({ ...prev, [matchId]: false }));
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
        {/* Test mode indicator */}
        {contract && matches.length > 0 && matches.every(m => !m.contractMarketId) && (
          <div className="test-mode-banner">
            <div className="banner-content">
              <span className="banner-icon">🧪</span>
              <div className="banner-text">
                <strong>Test Mode Active</strong>
                <p>You're betting with test data only. Bets are saved to database but not blockchain.</p>
              </div>
            </div>
          </div>
        )}
        
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
                        <strong>{match.home_team} vs {match.away_team}</strong>
                        <span className="summary-time">
                          {new Date(match.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="summary-bet">
                        <span>Bet: {formatEther(userBet.amount)} ETH on {getOutcomeName(userBet.outcome, match)}</span>
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
                    const phaseInfo = getBettingPhaseInfo(match.startTime);
                    const parimutuelData = hasParimutuelOdds(match.id) ? getParimutuelOddsForMatch(match.id) : null;
                    const showParimutuel = phaseInfo.isParimutuelPhase && parimutuelData;
                    
                    if (showParimutuel) {
                      // Show parimutuel odds for matches within 24 hours
                      const { display, pool, betting_phase } = parimutuelData;
                      return (
                        <>
                          <div className="parimutuel-banner">
                            <span className="parimutuel-label">🔥 Live Parimutuel Odds</span>
                            <div className="phase-info">
                              <span className="phase-description">{betting_phase?.phaseDescription || 'Parimutuel Phase'}</span>
                              <span className="fee-info">Fee: {betting_phase?.currentFeePercent || 3}%</span>
                            </div>
                            <span className="pool-info">Pool: {(pool.total_pool_wei / 1e18).toFixed(4)} ETH</span>
                          </div>
                          <div className="odds-display parimutuel-mode">
                            <div className="odds-item">
                              <div className="odds-label">🏠 {match.homeTeam}</div>
                              <div className={`odds-value ${display.home === 'No bets' ? 'no-bets' : 'live-odds'}`}>
                                {display.home === 'No bets' ? 'No bets' : `${display.home}x`}
                              </div>
                              {display.home !== 'No bets' && (
                                <div className="odds-pool">
                                  {(pool.outcome_amounts_wei[0] / 1e18).toFixed(4)} ETH
                                </div>
                              )}
                            </div>
                            
                            {match.hasDrawOption && (
                              <div className="odds-item">
                                <div className="odds-label">🤝 Draw</div>
                                <div className={`odds-value ${display.draw === 'No bets' ? 'no-bets' : 'live-odds'}`}>
                                  {display.draw === 'No bets' ? 'No bets' : `${display.draw}x`}
                                </div>
                                {display.draw !== 'No bets' && (
                                  <div className="odds-pool">
                                    {(pool.outcome_amounts_wei[1] / 1e18).toFixed(4)} ETH
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="odds-item">
                              <div className="odds-label">✈️ {match.awayTeam}</div>
                              <div className={`odds-value ${display.away === 'No bets' ? 'no-bets' : 'live-odds'}`}>
                                {display.away === 'No bets' ? 'No bets' : `${display.away}x`}
                              </div>
                              {display.away !== 'No bets' && (
                                <div className="odds-pool">
                                  {(pool.outcome_amounts_wei[match.hasDrawOption ? 2 : 1] / 1e18).toFixed(4)} ETH
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="odds-info">
                            <span className="parimutuel-info">
                              🎲 Parimutuel Odds - Pool-based, updated in real-time
                            </span>
                          </div>
                        </>
                      );
                    } else if (phaseInfo.isEarlyPhase) {
                      // Show early betting phase
                      return (
                        <>
                          <div className="early-betting-banner">
                            <span className="early-label">⏰ Early Betting Phase</span>
                            <div className="phase-info">
                              <span className="phase-description">{phaseInfo.phaseDescription}</span>
                              <span className="time-remaining">{Math.floor(phaseInfo.hoursUntilMatch)}h until parimutuel phase</span>
                            </div>
                          </div>
                          <div className="odds-display early-mode">
                            <div className="odds-item">
                              <div className="odds-label">🏠 {match.homeTeam}</div>
                              <div className="odds-value hidden">
                                Hidden
                              </div>
                            </div>
                            
                            {match.hasDrawOption && (
                              <div className="odds-item">
                                <div className="odds-label">🤝 Draw</div>
                                <div className="odds-value hidden">
                                  Hidden
                                </div>
                              </div>
                            )}
                            
                            <div className="odds-item">
                              <div className="odds-label">✈️ {match.awayTeam}</div>
                              <div className="odds-value hidden">
                                Hidden
                              </div>
                            </div>
                          </div>
                          <div className="odds-info">
                            <span className="early-info">
                              🔒 Early Phase - Lower fees, odds revealed in parimutuel phase
                            </span>
                          </div>
                        </>
                      );
                    } else {
                      // Show blind betting message for other matches
                      return (
                        <>
                          <div className="blind-betting-banner">
                            <span className="blind-label">👁️‍🗨️ Blind Betting Mode</span>
                            <span className="blind-info">Odds revealed at match start</span>
                          </div>
                          <div className="odds-display blind-mode">
                            <div className="odds-item">
                              <div className="odds-label">🏠 {match.homeTeam}</div>
                              <div className="odds-value blind">
                                Hidden
                              </div>
                            </div>
                            
                            {match.hasDrawOption && (
                              <div className="odds-item">
                                <div className="odds-label">🤝 Draw</div>
                                <div className="odds-value blind">
                                  Hidden
                                </div>
                              </div>
                            )}
                            
                            <div className="odds-item">
                              <div className="odds-label">✈️ {match.awayTeam}</div>
                              <div className="odds-value blind">
                                Hidden
                              </div>
                            </div>
                          </div>
                          <div className="odds-info">
                            <span className="blind-info">
                              🔒 Blind Betting - Odds revealed at match start
                            </span>
                          </div>
                        </>
                      );
                    }
                  })()}
                </div>

                <div className="betting-section">
                  {/* Fee indicator */}
                  {(() => {
                    const phaseInfo = getBettingPhaseInfo(match.startTime);
                    return (
                      <div className={`fee-indicator ${phaseInfo.isEarlyPhase ? 'early-fee' : 'late-fee'}`}>
                        <span className="fee-label">Current Fee:</span>
                        <span className="fee-percentage">{phaseInfo.currentFeePercent}%</span>
                        <span className="fee-description">
                          {phaseInfo.isEarlyPhase ? '(Early betting discount)' : '(Parimutuel phase)'}
                        </span>
                      </div>
                    );
                  })()}
                  
                  {/* Test mode indicator */}
                  {!match.contractMarketId && (
                    <div className="test-mode-banner">
                      <span className="test-mode-label">🧪 Test Mode</span>
                      <span className="test-mode-info">Betting without blockchain interaction</span>
                    </div>
                  )}
                  
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
                    className={`place-bet-btn ${!match.contractMarketId ? 'test-mode' : ''}`}
                    onClick={() => handlePlaceBet(match.id)}
                    disabled={bettingLoading[match.id] || !matchBetData[match.id]?.betAmount || matchBetData[match.id]?.betAmount <= 0}
                  >
                    {bettingLoading[match.id] ? (
                      <div className="btn-loading">
                        <span className="loading-spinner"></span>
                        Placing Bet...
                      </div>
                    ) : (
                      <>
                        <span className="btn-icon">{!match.contractMarketId ? '🧪' : '🎯'}</span>
                        {!match.contractMarketId ? 'Place Test Bet' : 'Place Bet'}
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
