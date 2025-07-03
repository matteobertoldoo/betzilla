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
      
      // Get maximum market ID from contract
      let maxMarketId = 0;
      try {
        const marketCount = await contract.marketCount();
        maxMarketId = Number(marketCount);
        console.log(`📊 Contract has ${maxMarketId} markets (valid IDs: 1-${maxMarketId})`);
      } catch (error) {
        console.error('❌ Error fetching market count:', error);
        return;
      }
      
      const oddsObj = {};
      const feeObj = {};
      let validMarkets = 0;
      let invalidMarkets = 0;
      let marketsNeedingSync = [];
      
      for (const match of matches) {
        const isWithin24Hours = isMatchWithin24Hours(match.startTime);
        
        // Use contract_market_id from database
        const contractMarketId = match.contract_market_id || match.contractMarketId;
        
        // Enhanced validation with proper timestamp checking
        const isValidMarketId = contractMarketId && 
                               Number.isInteger(Number(contractMarketId)) && 
                               Number(contractMarketId) >= 1 && 
                               Number(contractMarketId) <= maxMarketId;
        
        // Check if match is in the future
        const matchTime = new Date(match.startTime);
        const now = new Date();
        const isFutureMatch = matchTime > now;
        
        if (!isValidMarketId) {
          invalidMarkets++;
          marketsNeedingSync.push({
            matchId: match.id,
            title: `${match.homeTeam} vs ${match.awayTeam}`,
            contractMarketId: contractMarketId,
            startTime: match.startTime,
            isFutureMatch: isFutureMatch,
            reason: !contractMarketId ? 'missing_id' : 
                   Number(contractMarketId) < 1 ? 'invalid_range_low' :
                   Number(contractMarketId) > maxMarketId ? 'invalid_range_high' : 'invalid_format'
          });
          
          if (isWithin24Hours) {
            console.log(`  └── Will use parimutuel odds from backend for this match`);
          }
          continue;
        }
        
        validMarkets++;
        
        // For matches within 24 hours, prioritize parimutuel odds
        if (isWithin24Hours) {
          console.log(`🕐 Match ${match.id} ("${match.homeTeam} vs ${match.awayTeam}") is within 24 hours - will use parimutuel odds from backend`);
          continue;
        }
        
        // Only query contract for valid future matches
        if (!isFutureMatch) {
          console.log(`⏭️ Skipping contract query for past match: ${match.homeTeam} vs ${match.awayTeam}`);
          continue;
        }
        
        // Query contract only with valid IDs for future matches
        try {
          if (getMarketDetails && contractMarketId) {
            const marketDetails = await getMarketDetails(contractMarketId);
            oddsObj[match.id] = marketDetails.outcomeAmounts;
            console.log(`✅ Fetched market details for contract market ${contractMarketId} (DB match ${match.id})`);
          } else {
            const odds = await getEstimatedOdds(contractMarketId);
            oddsObj[match.id] = odds;
            console.log(`✅ Fetched estimated odds for contract market ${contractMarketId} (DB match ${match.id})`);
          }
        } catch (e) {
          console.error(`❌ Error fetching odds for match ${match.id} (contract market ${contractMarketId}):`, e.message);
          oddsObj[match.id] = null;
        }
        
        try {
          const f = await getCurrentFee(contractMarketId);
          feeObj[match.id] = f;
        } catch (e) {
          console.error(`❌ Error fetching fee for match ${match.id} (contract market ${contractMarketId}):`, e.message);
          feeObj[match.id] = 3; // Default fee
        }
      }
      
      // Enhanced result summary with timing information
      console.log(`📈 Odds fetch summary: ${validMarkets} valid markets processed, ${invalidMarkets} need synchronization`);
      
      if (invalidMarkets > 0) {
        console.log(`\n🔧 Markets needing synchronization:`);
        marketsNeedingSync.forEach(market => {
          const reasonText = {
            'missing_id': 'No contract market ID assigned',
            'invalid_range_low': 'Contract market ID too low (< 1)',
            'invalid_range_high': `Contract market ID too high (> ${maxMarketId})`,
            'invalid_format': 'Invalid contract market ID format'
          };
          const timingInfo = market.isFutureMatch ? '(Future match)' : '(Past match)';
          console.log(`  • ${market.title} ${timingInfo} - ${reasonText[market.reason]}`);
        });
        
        const futureUnsyncedCount = marketsNeedingSync.filter(m => m.isFutureMatch).length;
        if (futureUnsyncedCount > 0) {
          console.log(`\n💡 To fix synchronization for ${futureUnsyncedCount} future matches:`);
          console.log(`   1. Run: npx hardhat run scripts/createMarketsFromDatabase.js --network localhost`);
          console.log(`   2. This will create missing markets for future matches`);
          console.log(`   3. Refresh the page after synchronization completes`);
        }
      }
      
      setLiveOdds(oddsObj);
      setFee(feeObj);
      
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
    if (!account) {
      console.log('No account connected, skipping user bets fetch');
      return;
    }

    console.log('🔍 Fetching user bets...');
    const userBetsObj = {};
    let blockchainBetsFound = 0;

    // 🔗 Fetch from blockchain only for matches with valid contract market IDs
    if (contract) {
      console.log('📡 Checking blockchain for user bets...');
      
      // 🎯 Prima ottieni il numero massimo di mercati
      let maxMarketId = 0;
      try {
        const marketCount = await contract.marketCount();
        maxMarketId = Number(marketCount);
        console.log(`📊 Contract has ${maxMarketId} markets available`);
      } catch (error) {
        console.error('❌ Error getting market count:', error);
        return;
      }
      
      for (const match of matches) {
        const contractMarketId = match.contractMarketId || match.contract_market_id;
        
        // 🚨 Validazione robusta
        if (!contractMarketId || 
            Number(contractMarketId) < 1 || 
            Number(contractMarketId) > maxMarketId) {
          console.log(`⏭️ Skipping match ${match.id} - invalid contract market ID: ${contractMarketId}`);
          continue;
        }
        
        try {
          console.log(`🔍 Checking user bet for contract market ${contractMarketId} (DB match ${match.id})`);
          const userBet = await contract.getUserBet(contractMarketId, account);
          
          if (userBet && Number(userBet[1]) > 0) { // userBet[1] is the amount
            userBetsObj[match.id] = {
              outcome: Number(userBet[0]),
              amount: userBet[1],
              claimed: userBet[2],
              refunded: userBet[3],
              placedAt: userBet[4],
              fromDatabase: false,
              contractMarketId: contractMarketId // 🎯 Salva anche l'ID del contratto
            };
            blockchainBetsFound++;
            console.log(`✅ Found blockchain bet for match ${match.id}: ${Number(userBet[1])} wei`);
          }
        } catch (error) {
          // 🔇 Non loggare errori normali per mercati inesistenti
          if (error.message.includes('could not decode result data') || 
              error.message.includes('execution reverted') ||
              error.message.includes('Invalid market')) {
            // Questo è normale quando non ci sono scommesse
          } else {
            console.log(`⚠️ Blockchain error for match ${match.id} (contract market ${contractMarketId}):`, error.message);
          }
        }
      }
      
      if (blockchainBetsFound > 0) {
        console.log(`✅ Loaded ${blockchainBetsFound} bets from blockchain`);
      } else {
        console.log('📭 No blockchain bets found');
      }
    }

    // 💾 Fetch from database
    if (user) {
      console.log('🗄️ Checking database for user bets...');
      try {
        const token = localStorage.getItem('betzilla_token');
        if (token) {
          const response = await fetch('http://localhost:4000/api/betting/bets', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          
          if (data.success && data.bets) {
            console.log('📊 Database bets found:', data.bets.length);
            
            data.bets.forEach(bet => {
              const matchId = bet.market_id;
              
              // 🔄 Solo se non abbiamo già dati blockchain per questo match
              if (!userBetsObj[matchId]) {
                userBetsObj[matchId] = {
                  outcome: bet.outcome,
                  amount: bet.amount_wei,
                  claimed: false,
                  refunded: false,
                  placedAt: bet.placed_at,
                  fromDatabase: true,
                  status: bet.status
                };
              }
            });
          }
        }
      } catch (error) {
        console.error('❌ Error fetching database bets:', error);
      }
    }
    
    setUserBets(userBetsObj);
    console.log(`📊 Total user bets loaded: ${Object.keys(userBetsObj).length}`);
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

  // 🎯 STEP 7: Gestione robusta del piazzamento scommesse
  const handlePlaceBet = async (matchId) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) {
      alert('Match not found');
      return;
    }

    // 🔍 Use synced contract market ID from database - MOVED TO TOP
    const contractMarketId = match.contract_market_id || match.contractMarketId;

    setBettingLoading(prev => ({ ...prev, [matchId]: true }));

    try {
      if (!contractMarketId) {
        // 🧪 Test mode: save only to database
        console.log('⚠️ No contract market ID - using test mode (database only)');
        console.log('💡 Run market sync script to enable blockchain betting');
        
        const betData = matchBetData[matchId];
        if (!betData || !betData.betAmount || betData.betAmount <= 0) {
          alert('Please enter a valid bet amount');
          return;
        }

        if (user) {
          const amountWei = (parseFloat(betData.betAmount) * 1e18).toString();
          await saveBetToDatabase(matchId, betData.selectedOutcome, amountWei, null);
          alert('Test bet saved to database (no blockchain interaction)');
          
          updateBetAmount(matchId, '');
          updateSelectedOutcome(matchId, 1);
          await fetchUserBets();
          
          if (window.refreshPortfolio) {
            window.refreshPortfolio();
          }
        } else {
          alert('Please login to save test bets');
        }
        return;
      }

      // 🔗 Blockchain mode: use contract market ID
      const betData = matchBetData[matchId];
      if (!betData || !betData.betAmount || betData.betAmount <= 0) {
        alert('Please enter a valid bet amount');
        return;
      }

      // 🎯 Validate outcome for sport type
      const maxOutcome = match.hasDrawOption ? 3 : 2;
      if (betData.selectedOutcome < 1 || betData.selectedOutcome > maxOutcome) {
        alert(`Invalid outcome. For ${match.homeTeam} vs ${match.awayTeam}, valid outcomes are 1-${maxOutcome}`);
        return;
      }

      console.log(`🎯 Placing bet: Contract Market ${contractMarketId}, Outcome ${betData.selectedOutcome}, Amount ${betData.betAmount} ETH`);
      
      // 🚀 Place bet on-chain
      const receipt = await placeBet(contractMarketId, betData.selectedOutcome, betData.betAmount);
      
      const amountWei = (parseFloat(betData.betAmount) * 1e18).toString();
      
      // 💾 Save to database after successful blockchain transaction
      if (user) {
        await saveBetToDatabase(matchId, betData.selectedOutcome, amountWei, receipt.hash);
      }
      
      alert('✅ Bet placed successfully on blockchain!');
      
      updateBetAmount(matchId, '');
      updateSelectedOutcome(matchId, 1);
      await fetchUserBets();
      
      if (window.refreshPortfolio) {
        window.refreshPortfolio();
      }
      
    } catch (error) {
      console.error('❌ Smart contract error:', error);
      
      if (error.message.includes('Market does not exist')) {
        alert(`❌ Market ${contractMarketId} does not exist in contract. Please run the market sync script.`);
      } else {
        alert(`Error placing bet: ${error.message}`);
      }
    } finally {
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
            {filteredMatches.map((match) => {
              const isWithin24Hours = isMatchWithin24Hours(match.startTime);
              const contractMarketId = match.contractMarketId || match.contract_market_id;
              const hasValidContractId = contractMarketId && Number(contractMarketId) >= 1;
              
              return (
                <div key={match.stableId} className="match-card">
                  <div className="match-header">
                    <div className="teams">
                      <h3>{match.homeTeam} vs {match.awayTeam}</h3>
                      
                      {/* 🎯 Indicatori di stato del mercato */}
                      <div className="market-status-indicators">
                        {hasValidContractId ? (
                          <span className="market-status blockchain-enabled">
                            🔗 Contract Market #{contractMarketId}
                          </span>
                        ) : (
                          <span className="market-status test-mode">
                            🧪 Test Mode (No Contract)
                          </span>
                        )}
                        
                        {isWithin24Hours && (
                          <span className="market-status parimutuel">
                            ⏰ Parimutuel Phase
                          </span>
                        )}
                      </div>
                      
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
                  
                  {/* Test mode banner per mercati senza contract ID */}
                  {!hasValidContractId && (
                    <div className="test-mode-banner">
                      <span className="test-mode-label">🧪 Test Mode</span>
                      <span className="test-mode-info">Betting without blockchain interaction</span>
                    </div>
                  )}
                  
                  {/* ...existing match content... */}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bet;
