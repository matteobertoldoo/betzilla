const express = require('express');
const router = express.Router();
const matchService = require('../services/matchService');
const { authenticateToken } = require('../middleware/auth');

// Get all matches with optional filters
router.get('/', async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      sport: req.query.sport,
      status: req.query.status,
      upcoming: req.query.upcoming === 'true',
      today: req.query.today === 'true',
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    const matches = await matchService.getMatches(filters);
    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches',
      error: error.message
    });
  }
});

// Get a specific match by ID
router.get('/:id', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const match = await matchService.getMatchById(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.json({
      success: true,
      data: match
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch match',
      error: error.message
    });
  }
});

// Get upcoming matches
router.get('/upcoming/list', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const matches = await matchService.getUpcomingMatches(limit);
    
    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming matches',
      error: error.message
    });
  }
});

// Get matches by category
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const matches = await matchService.getMatchesByCategory(category);
    
    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Error fetching matches by category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches by category',
      error: error.message
    });
  }
});

// Get matches by sport
router.get('/sport/:sport', async (req, res) => {
  try {
    const sport = req.params.sport;
    const matches = await matchService.getMatchesBySport(sport);
    
    res.json({
      success: true,
      data: matches,
      count: matches.length
    });
  } catch (error) {
    console.error('Error fetching matches by sport:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches by sport',
      error: error.message
    });
  }
});

// Get match statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await matchService.getMatchStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching match statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch match statistics',
      error: error.message
    });
  }
});

// Create a new match (protected route)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const matchData = req.body;
    
    // Validate required fields
    const requiredFields = ['title', 'category', 'sport', 'startTime'];
    for (const field of requiredFields) {
      if (!matchData[field]) {
        return res.status(400).json({
          success: false,
          message: `Missing required field: ${field}`
        });
      }
    }

    const match = await matchService.createMatch(matchData);
    
    res.status(201).json({
      success: true,
      data: match,
      message: 'Match created successfully'
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create match',
      error: error.message
    });
  }
});

// Update match status (protected route)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const updated = await matchService.updateMatchStatus(matchId, status);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.json({
      success: true,
      message: 'Match status updated successfully'
    });
  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update match status',
      error: error.message
    });
  }
});

// Update match market ID (protected route)
router.patch('/:id/market', authenticateToken, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const { contractMarketId } = req.body;

    if (contractMarketId === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Contract market ID is required'
      });
    }

    const updated = await matchService.updateMatchMarketId(matchId, contractMarketId);
    
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.json({
      success: true,
      message: 'Match market ID updated successfully'
    });
  } catch (error) {
    console.error('Error updating match market ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update match market ID',
      error: error.message
    });
  }
});

// Delete a match (protected route)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    const deleted = await matchService.deleteMatch(matchId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    res.json({
      success: true,
      message: 'Match deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete match',
      error: error.message
    });
  }
});

module.exports = router;
