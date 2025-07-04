const database = require('../database');

class BettingService {
  // Save user bet to database
  async saveBet(userId, marketId, outcome, amountWei, transactionHash = null, status = 'confirmed') {
    // Support object-style call for test-data scripts
    if (typeof userId === 'object' && userId !== null) {
      const bet = userId;
      userId = bet.userId;
      marketId = bet.marketId;
      outcome = bet.outcome;
      amountWei = bet.amountWei;
      transactionHash = bet.transactionHash || null;
      status = bet.status || 'confirmed';
    }
    try {
      const result = await database.run(
        `INSERT INTO user_bets (user_id, market_id, outcome, amount_wei, transaction_hash, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, marketId, outcome, amountWei, transactionHash, status]
      );

      return {
        id: result.id,
        userId,
        marketId,
        outcome,
        amountWei,
        transactionHash,
        status: 'pending',
        placedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Save bet error:', error.message);
      throw error;
    }
  }

  // Get user bets
  async getUserBets(userId, status = null) {
    try {
      let query = 'SELECT * FROM user_bets WHERE user_id = ?';
      let params = [userId];

      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY placed_at DESC';

      const bets = await database.all(query, params);
      
      return bets.map(bet => ({
        id: bet.id,
        userId: bet.user_id,
        marketId: bet.market_id,
        outcome: bet.outcome,
        amountWei: bet.amount_wei,
        transactionHash: bet.transaction_hash,
        status: bet.status,
        placedAt: bet.placed_at,
        resolvedAt: bet.resolved_at,
        isWinner: bet.is_winner,
        winningsWei: bet.winnings_wei
      }));
    } catch (error) {
      console.error('Get user bets error:', error.message);
      throw error;
    }
  }

  // Update bet status
  async updateBetStatus(betId, status, transactionHash = null) {
    try {
      let query = 'UPDATE user_bets SET status = ?, updated_at = CURRENT_TIMESTAMP';
      let params = [status];

      if (transactionHash) {
        query += ', transaction_hash = ?';
        params.push(transactionHash);
      }

      query += ' WHERE id = ?';
      params.push(betId);

      await database.run(query, params);
    } catch (error) {
      console.error('Update bet status error:', error.message);
      throw error;
    }
  }

  // Resolve bet (mark as winner/loser)
  async resolveBet(betId, isWinner, winningsWei = null) {
    try {
      await database.run(
        `UPDATE user_bets 
         SET status = ?, is_winner = ?, winnings_wei = ?, resolved_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [isWinner ? 'won' : 'lost', isWinner, winningsWei, betId]
      );
    } catch (error) {
      console.error('Resolve bet error:', error.message);
      throw error;
    }
  }

  // Get bet by ID
  async getBetById(betId) {
    try {
      const bet = await database.get(
        'SELECT * FROM user_bets WHERE id = ?',
        [betId]
      );

      if (!bet) {
        throw new Error('Bet not found');
      }

      return {
        id: bet.id,
        userId: bet.user_id,
        marketId: bet.market_id,
        outcome: bet.outcome,
        amountWei: bet.amount_wei,
        transactionHash: bet.transaction_hash,
        status: bet.status,
        placedAt: bet.placed_at,
        resolvedAt: bet.resolved_at,
        isWinner: bet.is_winner,
        winningsWei: bet.winnings_wei
      };
    } catch (error) {
      console.error('Get bet by ID error:', error.message);
      throw error;
    }
  }

  // Get user betting statistics
  async getUserStats(userId) {
    try {
      const stats = await database.get(
        `SELECT 
           COUNT(*) as total_bets,
           COUNT(CASE WHEN status = 'won' THEN 1 END) as wins,
           COUNT(CASE WHEN status = 'lost' THEN 1 END) as losses,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
           SUM(CAST(amount_wei as DECIMAL)) as total_wagered,
           SUM(CASE WHEN status = 'won' THEN CAST(winnings_wei as DECIMAL) ELSE 0 END) as total_winnings
         FROM user_bets 
         WHERE user_id = ?`,
        [userId]
      );

      return {
        totalBets: stats.total_bets || 0,
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        pending: stats.pending || 0,
        totalWagered: stats.total_wagered || '0',
        totalWinnings: stats.total_winnings || '0',
        winRate: stats.total_bets > 0 ? ((stats.wins || 0) / stats.total_bets * 100).toFixed(2) : '0.00'
      };
    } catch (error) {
      console.error('Get user stats error:', error.message);
      throw error;
    }
  }

  // Get bets for a specific market
  async getMarketBets(marketId) {
    try {
      const bets = await database.all(
        'SELECT * FROM user_bets WHERE market_id = ? ORDER BY placed_at DESC',
        [marketId]
      );

      return bets.map(bet => ({
        id: bet.id,
        userId: bet.user_id,
        marketId: bet.market_id,
        outcome: bet.outcome,
        amountWei: bet.amount_wei,
        transactionHash: bet.transaction_hash,
        status: bet.status,
        placedAt: bet.placed_at,
        resolvedAt: bet.resolved_at,
        isWinner: bet.is_winner,
        winningsWei: bet.winnings_wei
      }));
    } catch (error) {
      console.error('Get market bets error:', error.message);
      throw error;
    }
  }

  // Delete old resolved bets (cleanup)
  async cleanupOldBets(daysOld = 90) {
    try {
      await database.run(
        `DELETE FROM user_bets 
         WHERE status IN ('won', 'lost') 
         AND resolved_at < datetime('now', '-${daysOld} days')`
      );
    } catch (error) {
      console.error('Cleanup old bets error:', error.message);
    }
  }
}

module.exports = new BettingService();
