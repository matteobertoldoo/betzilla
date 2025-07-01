import React, { useState, useEffect } from 'react';
import { useBetzilla } from './hooks/useBetzilla';
import './App.css';

function App() {
  const {
    contract,
    account,
    loading,
    error,
    connectWallet,
    placeBet,
    getMarket,
    getUserBet,
    getAllUserBets,
    claimWinnings,
    getMatchDetails,
    getEstimatedOdds,
    getCurrentFee,
  } = useBetzilla();

  const [matches, setMatches] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState(1);
  const [marketData, setMarketData] = useState({});
  const [liveOdds, setLiveOdds] = useState({});
  const [fee, setFee] = useState({});

  // Fetch matches from backend
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

  // Fetch user bets when account changes
  useEffect(() => {
    if (account && contract) {
      fetchUserBets();
    }
  }, [account, contract]);

  // Carica odds live e fee per ogni match
  useEffect(() => {
    const fetchLiveOddsAndFee = async () => {
      if (!contract) return;
      const oddsObj = {};
      const feeObj = {};
      for (const match of matches) {
        try {
          const odds = await getEstimatedOdds(match.id);
          oddsObj[match.id] = odds;
        } catch (e) {
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
  }, [contract, matches]);

  const fetchUserBets = async () => {
    try {
      const bets = await getAllUserBets();
      setUserBets(bets);
    } catch (error) {
      console.error('Error fetching user bets:', error);
    }
  };

  const handlePlaceBet = async (marketId) => {
    if (!betAmount || betAmount <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    // Debug: log dei parametri
    console.log('🎯 Placing bet with params:', {
      marketId,
      selectedOutcome,
      betAmount,
      match: matches.find(m => m.id === marketId)
    });

    // Validazione outcome per mercato
    const match = matches.find(m => m.id === marketId);
    if (match) {
      const maxOutcome = match.odds.draw > 0 ? 3 : 2;
      if (selectedOutcome > maxOutcome) {
        alert(`Invalid outcome. For ${match.homeTeam} vs ${match.awayTeam}, valid outcomes are 1-${maxOutcome}`);
        return;
      }
    }

    try {
      await placeBet(marketId, selectedOutcome, betAmount);
      alert('Bet placed successfully!');
      setBetAmount('');
      fetchUserBets();
    } catch (error) {
      console.error('Smart contract error:', error); // <-- Add this line
      alert(`Error placing bet: ${error.message}`);
    }
  };

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

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };



  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>🎰 BetZilla</h1>
          <p>Decentralized Sports Betting Platform</p>
        </div>

        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Wallet Connection */}
        <div className="card">
          <div className="flex-between">
            <div>
              <h2>Wallet Connection</h2>
              {account ? (
                <p>Connected: {formatAddress(account)}</p>
              ) : (
                <p>Connect your wallet to start betting</p>
              )}
            </div>
            {!account && (
              <button 
                className="button" 
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? <span className="loading"></span> : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>

        {/* Available Matches */}
        <div className="card">
          <h2>Available Matches</h2>
          <div className="grid">
            {matches.map((match) => (
              <div key={match.id} className="card">
                <div className="flex-between mb-20">
                  <h3>{match.homeTeam} vs {match.awayTeam}</h3>
                  <span className="badge active">{match.league}</span>
                </div>
                
                <p>{match.description}</p>
                
                <div className="odds">
                  <div className="odds-item">
                    <div className="odds-value">
                      {liveOdds[match.id] && liveOdds[match.id][0] > 0
                        ? (liveOdds[match.id][0] / 100).toFixed(2)
                        : '???'}
                    </div>
                    <div className="odds-label">{match.homeTeam}</div>
                  </div>
                  {match.odds.draw > 0 && (
                    <div className="odds-item">
                      <div className="odds-value">
                        {liveOdds[match.id] && liveOdds[match.id][1] > 0
                          ? (liveOdds[match.id][1] / 100).toFixed(2)
                          : '???'}
                      </div>
                      <div className="odds-label">Draw</div>
                    </div>
                  )}
                  <div className="odds-item">
                    <div className="odds-value">
                      {liveOdds[match.id] && (match.odds.draw > 0 ? liveOdds[match.id][2] : liveOdds[match.id][1]) > 0
                        ? ((match.odds.draw > 0 ? liveOdds[match.id][2] : liveOdds[match.id][1]) / 100).toFixed(2)
                        : '???'}
                    </div>
                    <div className="odds-label">{match.awayTeam}</div>
                  </div>
                </div>
                <div style={{textAlign: 'center', color: '#888', fontSize: '0.9em', marginTop: '10px'}}>
                  {liveOdds[match.id] && liveOdds[match.id][0] > 0
                    ? `Live Odds! Fee: ${fee[match.id] || '?'}%`
                    : '🔒 Blind Betting - Odds revealed at match start'}
                </div>

                {account && (
                  <div className="mt-20">
                    <select 
                      className="input"
                      value={selectedOutcome}
                      onChange={(e) => {
                        const newOutcome = parseInt(e.target.value);
                        console.log(`🔄 Changing outcome from ${selectedOutcome} to ${newOutcome} for market ${match.id}`);
                        setSelectedOutcome(newOutcome);
                      }}
                    >
                      <option value={1}>{match.homeTeam}</option>
                      {match.odds.draw > 0 && <option value={2}>Draw</option>}
                      <option value={match.odds.draw > 0 ? 3 : 2}>{match.awayTeam}</option>
                    </select>
                    
                    <input
                      type="number"
                      className="input"
                      placeholder="Bet amount (ETH)"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      step="0.01"
                      min="0.001"
                    />
                    <div style={{color: '#888', fontSize: '0.9em', marginBottom: '8px'}}>
                      💡 Blind betting: place your bet before odds are revealed!
                    </div>
                    <button 
                      className="button success"
                      onClick={() => handlePlaceBet(match.id)}
                      disabled={loading || !betAmount || betAmount <= 0}
                    >
                      {loading ? <span className="loading"></span> : 'Place Bet'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* User Bets */}
        {account && (
          <div className="card">
            <h2>🎯 Your Betting Portfolio</h2>
            {userBets.length > 0 ? (
              <div className="grid">
                {userBets.map((betData) => {
                  const match = matches.find(m => m.id === betData.marketId);
                  const matchName = match ? `${match.homeTeam} vs ${match.awayTeam}` : `Market #${betData.marketId}`;
                  return (
                    <div key={betData.marketId} className="card">
                      <div className="flex-between mb-20">
                        <h3>{matchName}</h3>
                        <span className={`badge ${betData.market.isResolved ? 'resolved' : 'active'}`}>
                          {betData.market.isResolved ? '✅ Resolved' : '⏳ Active'}
                        </span>
                      </div>
                    
                    <div className="bet-details">
                      <p><strong>🎲 Outcome:</strong> {betData.bet.outcome}</p>
                      <p><strong>💰 Amount:</strong> {formatEther(betData.bet.amount)} ETH</p>
                      <p><strong>🧾 Fee:</strong> {betData.bet.feePercent}%</p>
                      <p><strong>📅 Placed:</strong> {new Date().toLocaleDateString()}</p>
                    </div>
                    
                    {betData.market.isResolved && (
                      <div className="resolution-details">
                        <p><strong>🏆 Winning Outcome:</strong> {betData.market.winningOutcome}</p>
                        {betData.bet.outcome === betData.market.winningOutcome && !betData.bet.claimed && (
                          <button 
                            className="button success"
                            onClick={() => handleClaimWinnings(betData.marketId)}
                            disabled={loading}
                          >
                            {loading ? <span className="loading"></span> : '🎉 Claim Winnings'}
                          </button>
                        )}
                        {betData.bet.claimed && (
                          <span className="badge success">✅ Winnings Claimed</span>
                        )}
                        {betData.bet.outcome !== betData.market.winningOutcome && (
                          <span className="badge error">❌ Lost</span>
                        )}
                      </div>
                    )}
                  </div>
                );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <p>📝 No bets placed yet. Start betting on available matches above!</p>
              </div>
            )}
          </div>
        )}

        {/* Betting Statistics */}
        {account && (
          <div className="card">
            <h2>📊 Betting Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{userBets.length}</div>
                <div className="stat-label">Total Bets</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {userBets.reduce((total, bet) => total + parseFloat(formatEther(bet.bet.amount)), 0).toFixed(4)}
                </div>
                <div className="stat-label">Total Wagered (ETH)</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {userBets.filter(bet => bet.market.isResolved && bet.bet.outcome === bet.market.winningOutcome).length}
                </div>
                <div className="stat-label">Wins</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {userBets.filter(bet => bet.market.isResolved && bet.bet.outcome !== bet.market.winningOutcome).length}
                </div>
                <div className="stat-label">Losses</div>
              </div>
            </div>
          </div>
        )}

        {/* Contract Info */}
        {contract && (
          <div className="card">
            <h2>Contract Information</h2>
            <p><strong>Contract Address:</strong> {formatAddress(contract.target)}</p>
            <p><strong>Connected Account:</strong> {formatAddress(account)}</p>
            <p><strong>Network:</strong> Local Hardhat</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;