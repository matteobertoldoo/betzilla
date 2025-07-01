const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import services and middleware
const database = require('./database');
const authService = require('./services/authService');
const { errorHandler } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const bettingRoutes = require('./routes/betting');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy (for rate limiting and IP detection)
app.set('trust proxy', 1);

// Initialize database
const initializeDatabase = async () => {
  try {
    await database.initialize();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
};

// Authentication routes
app.use('/api/auth', authRoutes);

// Betting routes
app.use('/api/betting', bettingRoutes);

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
      markets: '/api/markets',
      auth: '/api/auth',
      betting: '/api/betting'
    },
    timestamp: new Date().toISOString()
  });
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'BetZilla Backend is running!',
    database: database.getDb() ? 'Connected' : 'Disconnected',
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
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Cleanup function for graceful shutdown
const cleanup = async () => {
  console.log('\n🔄 Shutting down gracefully...');
  try {
    await database.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
  process.exit(0);
};

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Periodic cleanup of expired sessions (every hour)
setInterval(async () => {
  try {
    await authService.cleanupExpiredSessions();
  } catch (error) {
    console.error('Session cleanup error:', error.message);
  }
}, parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 3600000);

// Start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 BetZilla Backend running on port ${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔐 Authentication: http://localhost:${PORT}/api/auth`);
      console.log(`🎰 Betting: http://localhost:${PORT}/api/betting`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer(); 