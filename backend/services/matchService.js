const database = require('../database');

class MatchService {
  // Create a new match
  async createMatch(matchData) {
    const {
      title,
      description,
      category,
      sport,
      league,
      homeTeam,
      awayTeam,
      startTime,
      endTime,
      status = 'scheduled'
    } = matchData;

    const query = `
      INSERT INTO matches (
        title, description, category, sport, league,
        home_team, away_team, start_time, end_time, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const result = await database.run(query, [
        title, description, category, sport, league,
        homeTeam, awayTeam, startTime, endTime, status
      ]);
      
      return { id: result.id, ...matchData };
    } catch (error) {
      console.error('Error creating match:', error);
      throw new Error('Failed to create match');
    }
  }

  // Get all matches with optional filters
  async getMatches(filters = {}) {
    let query = 'SELECT * FROM matches WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.sport) {
      query += ' AND sport = ?';
      params.push(filters.sport);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.upcoming) {
      query += ' AND start_time > datetime("now")';
    }

    if (filters.today) {
      query += ' AND date(start_time) = date("now")';
    }

    query += ' ORDER BY start_time ASC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    try {
      const matches = await database.all(query, params);
      return matches;
    } catch (error) {
      console.error('Error fetching matches:', error);
      throw new Error('Failed to fetch matches');
    }
  }

  // Get a single match by ID
  async getMatchById(id) {
    const query = 'SELECT * FROM matches WHERE id = ?';
    
    try {
      const match = await database.get(query, [id]);
      return match;
    } catch (error) {
      console.error('Error fetching match:', error);
      throw new Error('Failed to fetch match');
    }
  }

  // Update match with contract market ID
  async updateMatchMarketId(matchId, contractMarketId) {
    const query = 'UPDATE matches SET contract_market_id = ?, updated_at = datetime("now") WHERE id = ?';
    
    try {
      const result = await database.run(query, [contractMarketId, matchId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating match market ID:', error);
      throw new Error('Failed to update match');
    }
  }

  // Update match status
  async updateMatchStatus(matchId, status) {
    const query = 'UPDATE matches SET status = ?, updated_at = datetime("now") WHERE id = ?';
    
    try {
      const result = await database.run(query, [status, matchId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error updating match status:', error);
      throw new Error('Failed to update match status');
    }
  }

  // Get matches by category
  async getMatchesByCategory(category) {
    return this.getMatches({ category });
  }

  // Get upcoming matches
  async getUpcomingMatches(limit = 20) {
    return this.getMatches({ upcoming: true, limit });
  }

  // Get matches by sport
  async getMatchesBySport(sport) {
    return this.getMatches({ sport });
  }

  // Delete a match
  async deleteMatch(matchId) {
    const query = 'DELETE FROM matches WHERE id = ?';
    
    try {
      const result = await database.run(query, [matchId]);
      return result.changes > 0;
    } catch (error) {
      console.error('Error deleting match:', error);
      throw new Error('Failed to delete match');
    }
  }

  // Get match statistics
  async getMatchStats() {
    const queries = {
      total: 'SELECT COUNT(*) as count FROM matches',
      byCategory: 'SELECT category, COUNT(*) as count FROM matches GROUP BY category',
      bySport: 'SELECT sport, COUNT(*) as count FROM matches GROUP BY sport',
      byStatus: 'SELECT status, COUNT(*) as count FROM matches GROUP BY status'
    };

    try {
      const stats = {};
      
      stats.total = (await database.get(queries.total)).count;
      stats.byCategory = await database.all(queries.byCategory);
      stats.bySport = await database.all(queries.bySport);
      stats.byStatus = await database.all(queries.byStatus);

      return stats;
    } catch (error) {
      console.error('Error fetching match statistics:', error);
      throw new Error('Failed to fetch match statistics');
    }
  }
}

module.exports = new MatchService();
