import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import './ParimutuelOdds.css';

const ParimutuelOdds = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTime, setRefreshTime] = useState(new Date());

  const fetchParimutuelMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:4000/api/parimutuel/matches/next24hours');
      const data = await response.json();
      
      if (data.success) {
        setMatches(data.data.matches);
        setRefreshTime(new Date());
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch matches');
      }
    } catch (err) {
      console.error('Error fetching parimutuel matches:', err);
      setError('Network error - please check your connection');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParimutuelMatches();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchParimutuelMatches, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleString();
  };

  const formatETH = (wei) => {
    if (!wei || wei === 0) return '0.00';
    return (parseFloat(wei) / 1e18).toFixed(4);
  };

  const getOddsColor = (odds) => {
    if (odds === 'No bets') return 'odds-no-bets';
    const numOdds = parseFloat(odds);
    if (numOdds > 3) return 'odds-high';
    if (numOdds > 2) return 'odds-medium';
    return 'odds-low';
  };

  const getNextMatchTime = () => {
    if (matches.length === 0) return null;
    const nextMatch = matches[0];
    const matchTime = new Date(nextMatch.start_time);
    const now = new Date();
    const diff = matchTime - now;
    
    if (diff <= 0) return 'Starting now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  if (loading && matches.length === 0) {
    return (
      <div className="parimutuel-odds-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading parimutuel odds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="parimutuel-odds-container">
      <div className="parimutuel-header">
        <h1>🎰 Live Parimutuel Odds</h1>
        <div className="parimutuel-info">
          <p>Real-time odds for matches starting in the next 24 hours</p>
          <div className="refresh-info">
            <span>Last updated: {refreshTime.toLocaleTimeString()}</span>
            <button onClick={fetchParimutuelMatches} className="refresh-btn" disabled={loading}>
              {loading ? '⟳' : '🔄'} Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
        </div>
      )}

      {matches.length === 0 && !loading ? (
        <div className="no-matches">
          <h3>No matches available</h3>
          <p>There are no matches starting in the next 24 hours with betting available.</p>
        </div>
      ) : (
        <>
          <div className="matches-summary">
            <div className="summary-item">
              <span className="summary-label">Total Matches:</span>
              <span className="summary-value">{matches.length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Next Match:</span>
              <span className="summary-value">{getNextMatchTime()}</span>
            </div>
          </div>

          <div className="matches-grid">
            {matches.map((match) => (
              <div key={match.id} className="match-card">
                <div className="match-header">
                  <h3 className="match-title">{match.title}</h3>
                  <div className="match-info">
                    <span className="match-league">{match.league}</span>
                    <span className="match-sport">{match.sport}</span>
                  </div>
                </div>

                <div className="match-teams">
                  <div className="team">{match.home_team}</div>
                  <div className="vs">VS</div>
                  <div className="team">{match.away_team}</div>
                </div>

                <div className="match-timing">
                  <div className="start-time">
                    <strong>Start:</strong> {formatTime(match.start_time)}
                  </div>
                </div>

                <div className="betting-pool">
                  <h4>Betting Pool</h4>
                  <div className="pool-info">
                    <div className="pool-total">
                      <span>Total Pool: </span>
                      <strong>{formatETH(match.betting_summary.total_pool_wei)} ETH</strong>
                    </div>
                    <div className="pool-bets">
                      <span>Total Bets: </span>
                      <strong>{match.betting_summary.total_bets}</strong>
                    </div>
                    <div className="pool-fee">
                      <span>Commission: </span>
                      <strong className="fee-highlight">3%</strong>
                    </div>
                  </div>
                </div>

                <div className="odds-section">
                  <h4>Parimutuel Odds</h4>
                  <div className="odds-grid">
                    <div className="odds-item">
                      <div className="odds-label">Home Win</div>
                      <div className={`odds-value ${getOddsColor(match.odds_display.home)}`}>
                        {match.odds_display.home}
                      </div>
                      <div className="odds-pool">
                        {formatETH(match.betting_summary.outcome_amounts_wei[0])} ETH
                      </div>
                    </div>

                    {match.has_draw_option && (
                      <div className="odds-item">
                        <div className="odds-label">Draw</div>
                        <div className={`odds-value ${getOddsColor(match.odds_display.draw)}`}>
                          {match.odds_display.draw}
                        </div>
                        <div className="odds-pool">
                          {formatETH(match.betting_summary.outcome_amounts_wei[1])} ETH
                        </div>
                      </div>
                    )}

                    <div className="odds-item">
                      <div className="odds-label">Away Win</div>
                      <div className={`odds-value ${getOddsColor(match.odds_display.away)}`}>
                        {match.odds_display.away}
                      </div>
                      <div className="odds-pool">
                        {formatETH(match.betting_summary.outcome_amounts_wei[match.has_draw_option ? 2 : 1])} ETH
                      </div>
                    </div>
                  </div>
                </div>

                <div className="match-actions">
                  <button className="bet-now-btn">
                    🎯 Place Bet (3% fee)
                  </button>
                  <button className="details-btn">
                    📊 View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="parimutuel-footer">
        <div className="explanation">
          <h3>How Parimutuel Betting Works</h3>
          <ul>
            <li>All bets are pooled together</li>
            <li>Odds are calculated based on the total amount bet on each outcome</li>
            <li>Higher odds mean fewer people bet on that outcome</li>
            <li>Winners share the pool (minus 3% platform fee)</li>
            <li>Odds update in real-time as new bets are placed</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ParimutuelOdds;
