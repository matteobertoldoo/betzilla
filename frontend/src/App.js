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
    getOdds,
    getMatchDetails
  } = useBetzilla();

  const [matches, setMatches] = useState([]);
  const [userBets, setUserBets] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [selectedOutcome, setSelectedOutcome] = useState(1);
  const [marketData, setMarketData] = useState({});

  // Fetch matches from backend
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await fetch('/api/matches');
        const data = await response.json();
        if (data.success) {
          setMatches(data.matches);
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

  // Aggiungi questa funzione per determinare il max bet
  const getMaxBetValue = (market) => {
    if (!market || market.totalAmount === '0' || market.totalAmount === 0) {
      return null; // Nessun limite per la prima scommessa
    }
    return parseFloat(market.totalAmount) / 1e18 / 10;
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
                    <div className="odds-value">{match.odds.home}</div>
                    <div className="odds-label">{match.homeTeam}</div>
                  </div>
                  {match.odds.draw > 0 && (
                    <div className="odds-item">
                      <div className="odds-value">{match.odds.draw}</div>
                      <div className="odds-label">Draw</div>
                    </div>
                  )}
                  <div className="odds-item">
                    <div className="odds-value">{match.odds.away}</div>
                    <div className="odds-label">{match.awayTeam}</div>
                  </div>
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
                      // max solo se > 0
                      {...(getMaxBetValue(match) ? { max: getMaxBetValue(match) } : {})}
                    />
                    {getMaxBetValue(match) === null && (
                      <div style={{color: '#888', fontSize: '0.9em', marginBottom: '8px'}}>Nessuna scommessa ancora piazzata: puoi essere il primo!</div>
                    )}
                    {getMaxBetValue(match) && betAmount > getMaxBetValue(match) && (
                      <div style={{color: 'red', fontSize: '0.9em', marginBottom: '8px'}}>Importo troppo alto. Il limite massimo per questa scommessa è {getMaxBetValue(match)} ETH</div>
                    )}
                    <button 
                      className="button success"
                      onClick={() => handlePlaceBet(match.id)}
                      disabled={loading || !betAmount || (getMaxBetValue(match) && betAmount > getMaxBetValue(match))}
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
        {account && userBets.length > 0 && (
          <div className="card">
            <h2>Your Bets</h2>
            <div className="grid">
              {userBets.map((betData) => (
                <div key={betData.marketId} className="card">
                  <div className="flex-between mb-20">
                    <h3>Market #{betData.marketId}</h3>
                    <span className="badge">
                      {betData.market.isResolved ? 'Resolved' : 'Active'}
                    </span>
                  </div>
                  
                  <p><strong>Outcome:</strong> {betData.bet.outcome}</p>
                  <p><strong>Amount:</strong> {formatEther(betData.bet.amount)} ETH</p>
                  
                  {betData.market.isResolved && (
                    <div>
                      <p><strong>Winning Outcome:</strong> {betData.market.winningOutcome}</p>
                      {betData.bet.outcome === betData.market.winningOutcome && !betData.bet.claimed && (
                        <button 
                          className="button success"
                          onClick={() => handleClaimWinnings(betData.marketId)}
                          disabled={loading}
                        >
                          {loading ? <span className="loading"></span> : 'Claim Winnings'}
                        </button>
                      )}
                      {betData.bet.claimed && (
                        <span className="badge success">Winnings Claimed</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
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