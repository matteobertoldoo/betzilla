# BetZilla Database Schema

This document describes the database structure and services for the BetZilla authentication and betting system.

## Database Tables

### users
Stores user account information and authentication data.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Unique user identifier |
| username | VARCHAR(50) UNIQUE, nullable | User's chosen username (nullable for wallet-only users) |
| email | VARCHAR(100) UNIQUE, nullable | User's email address (nullable for wallet-only users) |
| password_hash | VARCHAR(255), nullable | Hashed password using bcrypt (nullable for wallet-only users) |
| wallet_address | VARCHAR(42), nullable | Ethereum wallet address (optional) |
| created_at | DATETIME | Account creation timestamp |
| updated_at | DATETIME | Last update timestamp |
| is_active | BOOLEAN | Account status (active/inactive) |

### user_sessions
Manages user authentication sessions and JWT tokens.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Unique session identifier |
| user_id | INTEGER | Reference to users table |
| token_hash | VARCHAR(255) | Hashed JWT token |
| expires_at | DATETIME | Session expiration time |
| created_at | DATETIME | Session creation timestamp |
| is_active | BOOLEAN | Session status |

### wallet_nonces
Stores temporary nonces for wallet-based login.

| Column | Type | Description |
|--------|------|-------------|
| wallet_address | VARCHAR(42) PRIMARY KEY | The user's wallet address |
| nonce | VARCHAR(255) | The single-use nonce for signing |
| expires_at | DATETIME | The expiration time for the nonce |

### user_bets
Tracks all user betting activity and outcomes.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PRIMARY KEY | Unique bet identifier |
| user_id | INTEGER | Reference to users table |
| market_id | INTEGER | Smart contract market ID |
| outcome | INTEGER | Bet outcome (1=Home, 2=Draw, 3=Away) |
| amount_wei | VARCHAR(255) | Bet amount in Wei |
| transaction_hash | VARCHAR(66) | Blockchain transaction hash |
| status | VARCHAR(20) | Bet status (pending, confirmed, won, lost) |
| placed_at | DATETIME | Bet placement timestamp |
| resolved_at | DATETIME | Bet resolution timestamp |
| is_winner | BOOLEAN | Whether the bet won |
| winnings_wei | VARCHAR(255) | Winnings amount in Wei |

## Services

### AuthService (`/services/authService.js`)
Handles all authentication operations:
- User registration and login
- Password hashing and verification
- JWT token generation and validation
- Session management
- Wallet address management

### BettingService (`/services/bettingService.js`)
Manages betting operations:
- Save and retrieve user bets
- Update bet status and outcomes
- Generate user statistics
- Market-specific bet queries

### Database (`/database/index.js`)
Provides database connectivity and operations:
- SQLite database initialization
- Table creation and schema management
- Promise-based query methods
- Connection management

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Create new user account
- `POST /login` - User login
- `GET /validate` - Validate JWT token
- `POST /logout` - User logout
- `PUT /wallet` - Update wallet address
- `GET /profile` - Get user profile
- `POST /wallet-nonce` - Get a nonce for wallet login
- `POST /wallet-login` - Login or register with a wallet signature

### Betting (`/api/betting`)
- `POST /bets` - Save new bet
- `GET /bets` - Get user's bets
- `GET /bets/:betId` - Get specific bet
- `PUT /bets/:betId/status` - Update bet status
- `GET /stats` - Get user statistics
- `GET /markets/:marketId/bets` - Get market bets

## Security Features

### Password Security
- Bcrypt hashing with 12 salt rounds
- Password length validation (minimum 6 characters)
- Secure password comparison

### Session Management
- JWT tokens with configurable expiration
- Session cleanup for expired tokens
- Token revocation on logout

### Input Validation
- Email format validation
- Required field validation
- SQL injection prevention
- Rate limiting on authentication endpoints

### Data Protection
- Password hashes never exposed in API responses
- User-specific data access controls
- Wallet address format validation

## Environment Configuration

Create a `.env` file with the following variables:

```env
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=12
SESSION_CLEANUP_INTERVAL=3600000
```

## Usage Examples

### User Registration
```javascript
const response = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'securepassword'
  })
});
```

### User Login
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'securepassword'
  })
});
```

### Save Bet
```javascript
const response = await fetch('/api/betting/bets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    marketId: 1,
    outcome: 1,
    amountWei: '1000000000000000000' // 1 ETH
  })
});
```

## Maintenance

### Database Cleanup
The system automatically performs the following cleanup operations:
- Expired sessions are cleaned every hour
- Old resolved bets can be archived (90+ days)

### Monitoring
Check the health endpoint for system status:
```
GET /api/health
```

This will return the database connection status and other system information.
