const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  // Initialize the database connection
  async initialize() {
    return new Promise((resolve, reject) => {
      const dbPath = path.join(__dirname, 'betzilla.db');
      
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables()
            .then(() => {
              console.log('Database tables initialized');
              resolve();
            })
            .catch(reject);
        }
      });
    });
  }

  // Create necessary tables
  async createTables() {
    return new Promise((resolve, reject) => {
      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          wallet_address VARCHAR(42),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1
        )
      `;

      const createUserSessionsTable = `
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          token_hash VARCHAR(255) NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `;

      const createUserBetsTable = `
        CREATE TABLE IF NOT EXISTS user_bets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          market_id INTEGER NOT NULL,
          outcome INTEGER NOT NULL,
          amount_wei VARCHAR(255) NOT NULL,
          transaction_hash VARCHAR(66),
          status VARCHAR(20) DEFAULT 'pending',
          placed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME,
          is_winner BOOLEAN,
          winnings_wei VARCHAR(255),
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `;

      const createMatchesTable = `
        CREATE TABLE IF NOT EXISTS matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(50) NOT NULL,
          sport VARCHAR(50) NOT NULL,
          league VARCHAR(100),
          home_team VARCHAR(100),
          away_team VARCHAR(100),
          start_time DATETIME NOT NULL,
          end_time DATETIME,
          status VARCHAR(20) DEFAULT 'scheduled',
          contract_market_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_user_bets_user_id ON user_bets(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_bets_market_id ON user_bets(market_id);
        CREATE INDEX IF NOT EXISTS idx_matches_category ON matches(category);
        CREATE INDEX IF NOT EXISTS idx_matches_sport ON matches(sport);
        CREATE INDEX IF NOT EXISTS idx_matches_start_time ON matches(start_time);
        CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
      `;

      // Execute table creation
      this.db.serialize(() => {
        this.db.run(createUsersTable, (err) => {
          if (err) {
            console.error('Error creating users table:', err.message);
            reject(err);
            return;
          }
        });

        this.db.run(createUserSessionsTable, (err) => {
          if (err) {
            console.error('Error creating user_sessions table:', err.message);
            reject(err);
            return;
          }
        });

        this.db.run(createUserBetsTable, (err) => {
          if (err) {
            console.error('Error creating user_bets table:', err.message);
            reject(err);
            return;
          }
        });

        this.db.run(createMatchesTable, (err) => {
          if (err) {
            console.error('Error creating matches table:', err.message);
            reject(err);
            return;
          }
        });

        this.db.exec(createIndexes, (err) => {
          if (err) {
            console.error('Error creating indexes:', err.message);
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  // Get database instance
  getDb() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // Close database connection
  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Helper method to run queries with promises
  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Helper method to get a single row
  async get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Helper method to get all rows
  async all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = new Database();
