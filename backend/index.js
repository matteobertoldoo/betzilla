const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Sample match data
const matches = [
  {
    id: 1,
    homeTeam: "Juventus",
    awayTeam: "Inter",
    league: "Serie A",
    startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    status: "upcoming",
    odds: {
      home: 2.5,
      draw: 3.2,
      away: 2.8
    },
    description: "Juventus vs Inter - Who will win?"
  },
  {
    id: 2,
    homeTeam: "Lakers",
    awayTeam: "Warriors",
    league: "NBA",
    startTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
    status: "upcoming",
    odds: {
      home: 1.8,
      draw: 0, // No draw in basketball
      away: 2.1
    },
    description: "Lakers vs Warriors - Final Score"
  },
  {
    id: 3,
    homeTeam: "Manchester United",
    awayTeam: "Liverpool",
    league: "Premier League",
    startTime: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
    status: "upcoming",
    odds: {
      home: 3.1,
      draw: 3.0,
      away: 2.3
    },
    description: "Manchester United vs Liverpool - Match Result"
  }
];

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'BetZilla Backend is running!',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      matches: '/api/matches',
      markets: '/api/markets'
    },
    timestamp: new Date().toISOString()
  });
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BetZilla Backend is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/matches', (req, res) => {
  res.json({
    success: true,
    matches: matches,
    count: matches.length
  });
});

app.get('/api/matches/:id', (req, res) => {
  const matchId = parseInt(req.params.id);
  const match = matches.find(m => m.id === matchId);
  
  if (!match) {
    return res.status(404).json({
      success: false,
      message: 'Match not found'
    });
  }
  
  res.json({
    success: true,
    match: match
  });
});

app.get('/api/markets', (req, res) => {
  // Return market data that corresponds to smart contract markets
  const markets = matches.map(match => ({
    id: match.id,
    description: match.description,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league,
    startTime: match.startTime,
    status: match.status,
    odds: match.odds
  }));
  
  res.json({
    success: true,
    markets: markets
  });
});

app.get('/api/markets/:id', (req, res) => {
  const marketId = parseInt(req.params.id);
  const match = matches.find(m => m.id === marketId);
  
  if (!match) {
    return res.status(404).json({
      success: false,
      message: 'Market not found'
    });
  }
  
  const market = {
    id: match.id,
    description: match.description,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    league: match.league,
    startTime: match.startTime,
    status: match.status,
    odds: match.odds
  };
  
  res.json({
    success: true,
    market: market
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 BetZilla Backend running on port ${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
}); 