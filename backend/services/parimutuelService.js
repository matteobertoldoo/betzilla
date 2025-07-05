const database = require('../database');

class ParimutuelService {
  
  // Calculate parimutuel odds for a match based on database bets
  calculateParimutuelOdds(bettingSummary, hasDrawOption = true, matchStartTime = null) {
    // If no bets placed, return default odds indicating no action
    if (!bettingSummary || bettingSummary.total_pool === 0) {
      return hasDrawOption 
        ? [0, 0, 0] // No odds available for Home, Draw, Away
        : [0, 0];   // No odds available for Home, Away
    }

    const totalPool = parseFloat(bettingSummary.total_pool);
    const outcome1Total = parseFloat(bettingSummary.outcome_1_total) || 0;
    const outcome2Total = parseFloat(bettingSummary.outcome_2_total) || 0;
    const outcome3Total = parseFloat(bettingSummary.outcome_3_total) || 0;

    // Determine fee based on time until match - CORRECTED: Dynamic fee calculation
    let feePercentage = 0.03; // Default 3% for parimutuel phase (<24h)
    if (matchStartTime) {
      const now = new Date();
      const matchTime = new Date(matchStartTime);
      const hoursUntilMatch = (matchTime - now) / (1000 * 60 * 60);
      
      if (hoursUntilMatch > 24) {
        feePercentage = 0.02; // 2% for early bets (>24h before match)
      } else {
        feePercentage = 0.03; // 3% for late bets (parimutuel phase <24h)
      }
    }

    // Calculate net pool after fee deduction for parimutuel odds calculation
    const netPool = totalPool * (1 - feePercentage);

    const odds = [];

    // Home team odds (outcome 1)
    if (outcome1Total > 0) {
      odds[0] = netPool / outcome1Total;
    } else {
      odds[0] = 0; // No bets on this outcome
    }

    if (hasDrawOption) {
      // Draw odds (outcome 2)
      if (outcome2Total > 0) {
        odds[1] = netPool / outcome2Total;
      } else {
        odds[1] = 0;
      }

      // Away team odds (outcome 3)
      if (outcome3Total > 0) {
        odds[2] = netPool / outcome3Total;
      } else {
        odds[2] = 0;
      }
    } else {
      // Away team odds (outcome 2 when no draw)
      if (outcome2Total > 0) {
        odds[1] = netPool / outcome2Total;
      } else {
        odds[1] = 0;
      }
    }

    return odds;
  }

  // Get betting phase information
  getBettingPhase(matchStartTime) {
    const now = new Date();
    const matchTime = new Date(matchStartTime);
    const hoursUntilMatch = (matchTime - now) / (1000 * 60 * 60);
    
    return {
      isEarlyPhase: hoursUntilMatch > 24,
      isLatePhase: hoursUntilMatch <= 24 && hoursUntilMatch > 0,
      isMatchStarted: hoursUntilMatch <= 0,
      hoursUntilMatch: Math.max(0, hoursUntilMatch),
      currentFeePercent: hoursUntilMatch > 24 ? 2 : 3,
      phaseDescription: hoursUntilMatch > 24 ? 'Early Betting (Hidden Odds)' : 
                       hoursUntilMatch > 0 ? 'Parimutuel Phase (Live Odds)' : 
                       'Match Started'
    };
  }

  // Get all matches in next 24 hours with calculated parimutuel odds
  async getNext24HoursMatchesWithOdds() {
    try {
      const matches = await database.getMatchesWithBetsNext24Hours();
      
      const matchesWithOdds = matches.map(match => {
        const hasDrawOption = match.sport === 'Football' || match.sport === 'Soccer';
        const bettingPhase = this.getBettingPhase(match.start_time);
        
        const bettingSummary = {
          total_pool: match.total_pool || 0,
          outcome_1_total: match.outcome_1_total || 0,
          outcome_2_total: match.outcome_2_total || 0,
          outcome_3_total: match.outcome_3_total || 0,
          total_bets: match.total_bets || 0
        };

        const parimutuelOdds = this.calculateParimutuelOdds(bettingSummary, hasDrawOption, match.start_time);
        
        return {
          id: match.id,
          title: match.title,
          description: match.description,
          category: match.category,
          sport: match.sport,
          league: match.league,
          home_team: match.home_team,
          away_team: match.away_team,
          start_time: match.start_time,
          end_time: match.end_time,
          status: match.status,
          contract_market_id: match.contract_market_id,
          has_draw_option: hasDrawOption,
          betting_phase: bettingPhase,
          betting_summary: {
            total_bets: bettingSummary.total_bets,
            total_pool_wei: bettingSummary.total_pool,
            total_pool_eth: (bettingSummary.total_pool / 1e18).toFixed(6),
            outcome_amounts_wei: [
              bettingSummary.outcome_1_total,
              bettingSummary.outcome_2_total,
              hasDrawOption ? bettingSummary.outcome_3_total : null
            ].filter(amount => amount !== null),
            outcome_amounts_eth: [
              (bettingSummary.outcome_1_total / 1e18).toFixed(6),
              (bettingSummary.outcome_2_total / 1e18).toFixed(6),
              hasDrawOption ? (bettingSummary.outcome_3_total / 1e18).toFixed(6) : null
            ].filter(amount => amount !== null)
          },
          parimutuel_odds: parimutuelOdds,
          odds_display: {
            home: parimutuelOdds[0] > 0 ? parimutuelOdds[0].toFixed(2) : 'No bets',
            draw: hasDrawOption ? (parimutuelOdds[1] > 0 ? parimutuelOdds[1].toFixed(2) : 'No bets') : null,
            away: hasDrawOption ? 
              (parimutuelOdds[2] > 0 ? parimutuelOdds[2].toFixed(2) : 'No bets') :
              (parimutuelOdds[1] > 0 ? parimutuelOdds[1].toFixed(2) : 'No bets')
          },
          betting_available: parimutuelOdds.some(odd => odd > 0) || bettingSummary.total_pool === 0
        };
      });

      return matchesWithOdds;
    } catch (error) {
      console.error('Error fetching matches with odds:', error);
      throw new Error('Failed to fetch matches with parimutuel odds');
    }
  }

  // Get detailed betting information for a specific match
  async getMatchBettingDetails(marketId) {
    try {
      const match = await database.get('SELECT * FROM matches WHERE id = ?', [marketId]);
      if (!match) {
        throw new Error('Match not found');
      }

      const bettingSummary = await database.getMatchBettingSummary(marketId);
      const allBets = await database.getBetsForMatch(marketId);
      
      const hasDrawOption = match.sport === 'Football' || match.sport === 'Soccer';
      const parimutuelOdds = bettingSummary ? 
        this.calculateParimutuelOdds(bettingSummary, hasDrawOption) :
        (hasDrawOption ? [2.0, 2.0, 2.0] : [2.0, 2.0]);

      return {
        match: match,
        betting_summary: bettingSummary || {
          market_id: marketId,
          total_bets: 0,
          unique_bettors: 0,
          total_pool: 0,
          outcome_1_total: 0,
          outcome_2_total: 0,
          outcome_3_total: 0,
          outcome_1_bets: 0,
          outcome_2_bets: 0,
          outcome_3_bets: 0
        },
        all_bets: allBets,
        parimutuel_odds: parimutuelOdds,
        has_draw_option: hasDrawOption,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching match betting details:', error);
      throw error;
    }
  }

  // Calculate potential payout for a bet
  calculatePayout(betAmountWei, outcome, parimutuelOdds) {
    const betAmount = parseFloat(betAmountWei);
    const odds = parimutuelOdds[outcome - 1]; // Convert to 0-based index

    if (!odds || odds <= 0) {
      return null;
    }

    const grossPayout = betAmount * odds;
    
    // Calculate fee ONLY on net profit (winnings - original bet amount)
    const netProfit = grossPayout > betAmount ? grossPayout - betAmount : 0;
    const feeAmount = netProfit * 0.03; // 3% fee on profit only
    const netPayout = grossPayout - feeAmount;

    return {
      bet_amount_wei: betAmountWei,
      bet_amount_eth: (betAmount / 1e18).toFixed(6),
      odds: odds,
      gross_payout_wei: grossPayout.toString(),
      gross_payout_eth: (grossPayout / 1e18).toFixed(6),
      fee_amount_wei: feeAmount.toString(),
      fee_amount_eth: (feeAmount / 1e18).toFixed(6),
      net_payout_wei: netPayout.toString(),
      net_payout_eth: (netPayout / 1e18).toFixed(6),
      profit_wei: (netPayout - betAmount).toString(),
      profit_eth: ((netPayout - betAmount) / 1e18).toFixed(6)
    };
  }
}

module.exports = new ParimutuelService();
