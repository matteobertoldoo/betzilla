const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const database = require('../database');

const walletNonces = new Map(); // In-memory for demo, use DB in production

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'betzilla_default_secret_key_change_in_production';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    this.saltRounds = 12;
  }

  // Hash password
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT token
  generateToken(payload) {
    return jwt.sign(payload, this.jwtSecret, { 
      expiresIn: this.jwtExpiresIn 
    });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Register new user
  async register(username, email, password) {
    try {
      // Check if user already exists
      const existingUser = await database.get(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username]
      );

      if (existingUser) {
        throw new Error('User with this email or username already exists');
      }

      // Validate input
      if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (!email || !this.isValidEmail(email)) {
        throw new Error('Please provide a valid email address');
      }

      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert new user
      const result = await database.run(
        `INSERT INTO users (username, email, password_hash) 
         VALUES (?, ?, ?)`,
        [username, email, passwordHash]
      );

      // Generate token
      const token = this.generateToken({ 
        userId: result.id, 
        email, 
        username 
      });

      // Store session
      await this.createSession(result.id, token);

      // Return user data (without password)
      return {
        user: {
          id: result.id,
          username,
          email,
          walletAddress: null,
          createdAt: new Date().toISOString()
        },
        token
      };
    } catch (error) {
      console.error('Registration error:', error.message);
      throw error;
    }
  }

  // Login user
  async login(email, password) {
    try {
      // Find user by email
      const user = await database.get(
        'SELECT * FROM users WHERE email = ? AND is_active = 1',
        [email]
      );

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const isPasswordValid = await this.verifyPassword(password, user.password_hash);
      
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate new token
      const token = this.generateToken({ 
        userId: user.id, 
        email: user.email, 
        username: user.username 
      });

      // Store session
      await this.createSession(user.id, token);

      // Return user data (without password)
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          walletAddress: user.wallet_address,
          createdAt: user.created_at
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error.message);
      throw error;
    }
  }

  // Validate token and get user
  async validateToken(token) {
    try {
      // Verify JWT token
      const decoded = this.verifyToken(token);
      
      // Check if session exists and is active
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await database.get(
        `SELECT s.*, u.username, u.email, u.wallet_address, u.created_at
         FROM user_sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.token_hash = ? AND s.is_active = 1 AND s.expires_at > datetime('now')`,
        [tokenHash]
      );

      if (!session) {
        throw new Error('Invalid or expired session');
      }

      return {
        user: {
          id: session.user_id,
          username: session.username,
          email: session.email,
          walletAddress: session.wallet_address,
          createdAt: session.created_at
        }
      };
    } catch (error) {
      console.error('Token validation error:', error.message);
      throw error;
    }
  }

  // Create user session
  async createSession(userId, token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      // Deactivate old sessions for this user
      await database.run(
        'UPDATE user_sessions SET is_active = 0 WHERE user_id = ?',
        [userId]
      );

      // Create new session
      await database.run(
        `INSERT INTO user_sessions (user_id, token_hash, expires_at) 
         VALUES (?, ?, ?)`,
        [userId, tokenHash, expiresAt.toISOString()]
      );
    } catch (error) {
      console.error('Session creation error:', error.message);
      throw error;
    }
  }

  // Logout user (invalidate session)
  async logout(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      await database.run(
        'UPDATE user_sessions SET is_active = 0 WHERE token_hash = ?',
        [tokenHash]
      );
    } catch (error) {
      console.error('Logout error:', error.message);
      throw error;
    }
  }

  // Update user wallet address
  async updateWalletAddress(userId, walletAddress) {
    try {
      await database.run(
        'UPDATE users SET wallet_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [walletAddress, userId]
      );
    } catch (error) {
      console.error('Wallet update error:', error.message);
      throw error;
    }
  }

  // Get user by ID
  async getUserById(userId) {
    try {
      const user = await database.get(
        'SELECT id, username, email, wallet_address, created_at FROM users WHERE id = ? AND is_active = 1',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        walletAddress: user.wallet_address,
        createdAt: user.created_at
      };
    } catch (error) {
      console.error('Get user error:', error.message);
      throw error;
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      await database.run(
        'DELETE FROM user_sessions WHERE expires_at < datetime("now")'
      );
    } catch (error) {
      console.error('Session cleanup error:', error.message);
    }
  }

  // Helper method to validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Set/get wallet nonce (for demo, use in-memory map)
  async setWalletNonce(walletAddress, nonce) {
    walletNonces.set(walletAddress.toLowerCase(), { nonce, created: Date.now() });
  }
  async getWalletNonce(walletAddress) {
    const entry = walletNonces.get(walletAddress.toLowerCase());
    if (!entry) return null;
    // Optionally: expire after 5 min
    if (Date.now() - entry.created > 5 * 60 * 1000) {
      walletNonces.delete(walletAddress.toLowerCase());
      return null;
    }
    return entry.nonce;
  }

  // Login or register with wallet address
  async loginWithWallet(walletAddress) {
    try {
      // 1. Find user by wallet address
      let user = await database.get(
        'SELECT * FROM users WHERE wallet_address = ? AND is_active = 1',
        [walletAddress]
      );
      
      // 2. If not found, create user
      if (!user) {
        const now = new Date().toISOString();
        // Generate a temporary username from wallet address
        const tempUsername = `wallet_${walletAddress.slice(-8)}`;
        
        const result = await database.run(
          `INSERT INTO users (username, wallet_address, created_at, is_active) VALUES (?, ?, ?, 1)`,
          [tempUsername, walletAddress, now]
        );
        
        user = {
          id: result.id,
          username: tempUsername,
          email: null,
          wallet_address: walletAddress,
          created_at: now
        };
      }
      
      // 3. Generate token
      const token = this.generateToken({
        userId: user.id,
        walletAddress: walletAddress,
        username: user.username,
        email: user.email || null
      });
      
      // 4. Store session
      await this.createSession(user.id, token);
      
      // 5. Return user data
      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email || null,
          walletAddress: user.wallet_address,
          createdAt: user.created_at
        },
        token
      };
    } catch (error) {
      console.error('Wallet login error:', error.message);
      throw error;
    }
  }
}

module.exports = new AuthService();
