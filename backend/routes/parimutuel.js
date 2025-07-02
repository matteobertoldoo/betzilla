const express = require('express');
const router = express.Router();
const parimutuelService = require('../services/parimutuelService');

// Get all matches in next 24 hours with parimutuel odds
router.get('/matches/next24hours', async (req, res) => {
  try {
    const matchesWithOdds = await parimutuelService.getNext24HoursMatchesWithOdds();
    
    res.json({
      success: true,
      data: {
        matches: matchesWithOdds,
        count: matchesWithOdds.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching matches with odds:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch matches with parimutuel odds',
      details: error.message
    });
  }
});

// Get detailed betting information for a specific match
router.get('/match/:id/details', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid match ID'
      });
    }

    const matchDetails = await parimutuelService.getMatchBettingDetails(matchId);
    
    res.json({
      success: true,
      data: matchDetails
    });
  } catch (error) {
    console.error('Error fetching match details:', error);
    if (error.message === 'Match not found') {
      res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch match betting details',
        details: error.message
      });
    }
  }
});

// Get parimutuel odds for a specific match
router.get('/match/:id/odds', async (req, res) => {
  try {
    const matchId = parseInt(req.params.id);
    if (isNaN(matchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid match ID'
      });
    }

    const matchDetails = await parimutuelService.getMatchBettingDetails(matchId);
    
    res.json({
      success: true,
      data: {
        match_id: matchId,
        parimutuel_odds: matchDetails.parimutuel_odds,
        has_draw_option: matchDetails.has_draw_option,
        betting_summary: matchDetails.betting_summary,
        calculated_at: matchDetails.calculated_at
      }
    });
  } catch (error) {
    console.error('Error fetching match odds:', error);
    if (error.message === 'Match not found') {
      res.status(404).json({
        success: false,
        error: 'Match not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch match odds',
        details: error.message
      });
    }
  }
});

// Calculate potential payout for a bet
router.post('/payout/calculate', async (req, res) => {
  try {
    const { match_id, outcome, bet_amount_wei } = req.body;

    if (!match_id || !outcome || !bet_amount_wei) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: match_id, outcome, bet_amount_wei'
      });
    }

    const matchDetails = await parimutuelService.getMatchBettingDetails(match_id);
    const payout = parimutuelService.calculatePayout(
      bet_amount_wei,
      outcome,
      matchDetails.parimutuel_odds
    );

    if (!payout) {
      return res.status(400).json({
        success: false,
        error: 'Cannot calculate payout - no bets on this outcome or invalid data'
      });
    }

    res.json({
      success: true,
      data: {
        match_id: match_id,
        outcome: outcome,
        payout: payout,
        current_odds: matchDetails.parimutuel_odds,
        calculated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error calculating payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate payout',
      details: error.message
    });
  }
});

module.exports = router;
