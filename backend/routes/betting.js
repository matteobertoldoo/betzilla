const express = require('express');
const bettingService = require('../services/bettingService');
const { 
  authenticateToken,
  validateRequiredFields,
  sanitizeInput,
  optionalAuth
} = require('../middleware/auth');

const router = express.Router();

// Save a bet to database
router.post('/bets', [
  authenticateToken,
  sanitizeInput,
  validateRequiredFields(['marketId', 'outcome', 'amountWei'])
], async (req, res) => {
  try {
    const { marketId, outcome, amountWei, transactionHash } = req.body;
    
    // Validate inputs
    if (!Number.isInteger(parseInt(marketId)) || parseInt(marketId) < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid market ID'
      });
    }
    
    if (!Number.isInteger(parseInt(outcome)) || parseInt(outcome) < 1 || parseInt(outcome) > 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid outcome (must be 1, 2, or 3)'
      });
    }
    
    if (!amountWei || amountWei === '0') {
      return res.status(400).json({
        success: false,
        message: 'Bet amount must be greater than 0'
      });
    }
    
    const bet = await bettingService.saveBet(
      req.user.id,
      parseInt(marketId),
      parseInt(outcome),
      amountWei,
      transactionHash
    );
    
    res.status(201).json({
      success: true,
      message: 'Bet saved successfully',
      bet
    });
  } catch (error) {
    console.error('Save bet error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to save bet'
    });
  }
});

// Get user's bets
router.get('/bets', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    const bets = await bettingService.getUserBets(req.user.id, status);
    
    res.json({
      success: true,
      bets
    });
  } catch (error) {
    console.error('Get user bets error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bets'
    });
  }
});

// Get specific bet
router.get('/bets/:betId', authenticateToken, async (req, res) => {
  try {
    const { betId } = req.params;
    
    if (!Number.isInteger(parseInt(betId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bet ID'
      });
    }
    
    const bet = await bettingService.getBetById(parseInt(betId));
    
    // Check if user owns this bet
    if (bet.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      bet
    });
  } catch (error) {
    console.error('Get bet error:', error.message);
    
    if (error.message === 'Bet not found') {
      return res.status(404).json({
        success: false,
        message: 'Bet not found'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bet'
    });
  }
});

// Update bet status
router.put('/bets/:betId/status', [
  authenticateToken,
  sanitizeInput,
  validateRequiredFields(['status'])
], async (req, res) => {
  try {
    const { betId } = req.params;
    const { status, transactionHash } = req.body;
    
    if (!Number.isInteger(parseInt(betId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bet ID'
      });
    }
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'failed', 'won', 'lost'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    // Check if user owns this bet
    const bet = await bettingService.getBetById(parseInt(betId));
    if (bet.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await bettingService.updateBetStatus(parseInt(betId), status, transactionHash);
    
    res.json({
      success: true,
      message: 'Bet status updated successfully'
    });
  } catch (error) {
    console.error('Update bet status error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update bet status'
    });
  }
});

// Get user betting statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await bettingService.getUserStats(req.user.id);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get user stats error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Get bets for a specific market (public endpoint with optional auth)
router.get('/markets/:marketId/bets', optionalAuth, async (req, res) => {
  try {
    const { marketId } = req.params;
    
    if (!Number.isInteger(parseInt(marketId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid market ID'
      });
    }
    
    const bets = await bettingService.getMarketBets(parseInt(marketId));
    
    // If user is authenticated, mark their bets
    const result = bets.map(bet => ({
      ...bet,
      isOwnBet: req.user ? bet.userId === req.user.id : false,
      userId: undefined // Don't expose user IDs publicly
    }));
    
    res.json({
      success: true,
      bets: result
    });
  } catch (error) {
    console.error('Get market bets error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market bets'
    });
  }
});

// Resolve bet (admin functionality - for now just authenticated users can resolve their own)
router.put('/bets/:betId/resolve', [
  authenticateToken,
  sanitizeInput,
  validateRequiredFields(['isWinner'])
], async (req, res) => {
  try {
    const { betId } = req.params;
    const { isWinner, winningsWei } = req.body;
    
    if (!Number.isInteger(parseInt(betId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bet ID'
      });
    }
    
    // Check if user owns this bet
    const bet = await bettingService.getBetById(parseInt(betId));
    if (bet.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await bettingService.resolveBet(
      parseInt(betId), 
      Boolean(isWinner), 
      winningsWei || null
    );
    
    res.json({
      success: true,
      message: 'Bet resolved successfully'
    });
  } catch (error) {
    console.error('Resolve bet error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve bet'
    });
  }
});

module.exports = router;
