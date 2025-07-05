# 🎰 BetZilla - Decentralized Sports Betting Platform

BetZilla is a decentralized sports betting platform built on Ethereum blockchain with an innovative **Parimutuel Betting** and **Blind Betting** system. Users can place bets with dynamic odds based on betting pools, creating a transparent and anti-manipulation experience.

## 🚀 Quick Start

### Start Everything with One Command
```bash
./start-betzilla.sh
```

### Stop Everything
```bash
./stop-betzilla.sh
```

**That's it!** The system automatically starts:
- 🔗 Hardhat local blockchain (port 8545)
- 🖥️ Backend API (port 4000)
- 🌐 React Frontend (port 3000)
- 📦 Automatic contract deployment
- 🎲 Database population with test matches and bets

## 📹 Demo Video - Live Betting in Action!

**🎥 Watch BetZilla in action - Real betting with MetaMask:**

[![BetZilla Demo - Live Betting](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://youtu.be/AFbMlGc3xXA)

*Demo video: MetaMask connection, bet placement, blockchain transaction and real-time portfolio updates.*

## 🖼️ Two Betting Phases - Screenshots

### 🔒 **Blind Betting Phase** (>24h before match)
*Hidden odds - Early Bird Discount 2% fee*

![Hidden Quotes](hidden.png)

### 👁️ **Parimutuel Phase** (<24h before match)  
*Visible and live odds - 3% standard fee*

![Discoverable Quotes](discoverable.png)

## 🧪 Complete Testing

### 🎯 **LIVE Betting Test with MetaMask**
**You can test the real betting system RIGHT NOW!**

1. **Start the system**:
```bash
./start-betzilla.sh
```

2. **Go to the website**: http://localhost:3000

3. **Connect MetaMask**:
   - Configure Hardhat network (Chain ID: 31337, RPC: http://127.0.0.1:8545)
   - Use test account: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

4. **Login with MetaMask**:
   - Click "🦊 Sign in with MetaMask" 
   - Sign the message to authenticate
   - System automatically registers you

5. **Go to Bet section** and **place a bet**:
   - Choose a match
   - Select outcome (Home/Draw/Away)
   - Enter amount (e.g. 0.01 ETH)
   - Click "Place Bet"

6. **Verify it works**:
   - ✅ **MetaMask**: You'll see the transaction and ETH deducted from wallet
   - ✅ **Blockchain Logs**: In the terminal running Hardhat you'll see:
     ```
     eth_sendTransaction
     Transaction: 0x123abc...
     Block: #XX
     Gas used: XXXX
     ```
   - ✅ **Portfolio**: The bet will appear in your portfolio
   - ✅ **Database**: Bet saved in database

### 🔥 **Try Both Betting Systems**

**Parimutuel System (Matches within 24h)**:
- **Live** odds that change in real-time
- 3% fee - visible odds
- Shared pool among all players

**Early Bird System (Matches >24h)**:
- **Hidden** odds (blind betting)
- 2% fee - early bird discount!
- Odds revealed only when match approaches

### Website Testing 
1. Go to: http://localhost:3000
2. Test bet placement in test mode
3. View live parimutuel odds for matches within 24h
4. Try blind betting for future matches

### Complete Automated Testing
To test **everything** (winnings distribution, fee collection, parimutuel calculations, edge cases):

```bash
./test-parimutuel.sh
```

This script tests:
- ✅ Complete betting system
- ✅ Accurate parimutuel calculations
- ✅ Correct winnings distribution
- ✅ Fee collection (2% early, 3% live)
- ✅ Edge cases and validations
- ✅ Backend integration
- ✅ Error handling

## 🌟 Key Features

### 🎯 **Innovative Parimutuel System**
- **Dynamic Odds**: Odds change based on bet distribution in the pool
- **Total Transparency**: Formula: `Odds = (Total Pool - Fee) / Amount on Outcome`
- **Live Updates**: Odds updated every 30 seconds for matches within 24h
- **Anti-Manipulation**: No house can manipulate odds

### 💰 **Dynamic Fee System**
- **Early Betting (>24h)**: 2% fee, hidden odds (blind betting)
- **Parimutuel Phase (<24h)**: 3% fee, visible and live odds
- **Early Incentive**: Rewards early bettors with reduced fees

### 🔒 **Blind Betting**
- **Blind Bets**: Place bets before odds are revealed
- **Blockchain Transparency**: All transactions recorded and verifiable
- **No Manipulation**: Odds revealed only in final phase

### 📊 **Advanced Management**
- **Multiple Bets**: Multiple bets on the same market
- **Complete Portfolio**: Tracking active and resolved bets
- **Automatic Claim**: Withdraw winnings when matches are resolved

## 🎲 How It Works

### Current System Status

**⚠️ Mock Data Usage**: Currently using simulated match data due to summer sports schedule gap. Real sports API integration and oracle-based result resolution will be implemented for live deployment.

**🔧 Match Resolution**: 
- **Current**: Manual resolution via `setResult()` function for testing
- **Future**: Automated oracle integration for real-time match results

### Mathematical Parimutuel Model

The core of BetZilla's engine uses the parimutuel model to ensure fair and transparent payouts.

#### Odds Calculation
```
Odds_i = Total Pool / Outcome Pool_i
```
where:
- **Total Pool** is the sum of all bets placed on the market
- **Outcome Pool_i** is the total amount staked on outcome i

#### Net Payout Formula
```
Gross Winnings = Stake × Odds_i
Net Profit = Gross Winnings - Stake
Fee = {
  Net Profit × 2%  (blind phase, >24h)
  Net Profit × 3%  (last 24h)
}
Final Payout = Stake + (Net Profit - Fee)
```

#### Example (10 ETH bet at 1.67 odds, 3% fee)
```
Gross Winnings = 10 × 1.67 = 16.7 ETH
Net Profit = 16.7 - 10 = 6.7 ETH
Fee (3%) = 6.7 × 0.03 = 0.201 ETH
Final Payout = 10 + (6.7 - 0.201) = 16.499 ETH
```

#### System Equilibrium
The model maintains balance when:
```
Σ(Outcome Pool_i × Odds_i) ≤ Total Pool × (1 - Fee%)
```

### Betting Phases
1. **Early Phase (>24h before match)**:
   - Fee: 2% (Early Bird Discount! 🐦)
   - Odds: Hidden (blind betting)
   - Advantage: Reduced fee for early bettors

2. **Parimutuel Phase (<24h before match)**:
   - Fee: 3% (standard)
   - Odds: Visible and updated live
   - Advantage: See exactly what you're betting on

3. **Match Started**:
   - Betting: Closed
   - Odds: Final for winnings calculation

### Practical Example
```
Early Phase: Real Madrid vs Barcelona (48h before)
├── Bet: 1 ETH on Real Madrid
├── Fee: 2% (0.02 ETH) - Early Bird!
└── Status: "🔒 Odds revealed when betting heats up!"

Parimutuel Phase: (12h before)
├── Total Pool: 13.32 ETH
├── On Real Madrid: 6.05 ETH
├── Fee: 3% → Net Pool: 12.92 ETH
└── Real Madrid Odds: 12.92 / 6.05 = 2.14x
```

## 🏗️ Architecture

```
BetZilla/
├── contracts/          # Solidity Smart Contracts
├── backend/           # Node.js/Express API  
├── frontend/         # React App
├── start-betzilla.sh # Start everything
├── stop-betzilla.sh  # Stop everything
└── test-parimutuel.sh # Complete testing
```

## 📱 Interface

### 🌐 **Frontend** (http://localhost:3000)
- **Live Odds**: Real-time parimutuel odds
- **Bet Placement**: **Real** bet placement with MetaMask
- **Portfolio**: Bet and winnings tracking
- **MetaMask Integration**: Authentication and blockchain transactions

### 🖥️ **Backend** (http://localhost:4000)
- **API Matches**: Available matches endpoints
- **Parimutuel Calculations**: Dynamic odds calculations
- **Database**: Bet and result storage

### 🔗 **Blockchain** (http://localhost:8545)
- **Smart Contract**: **Active** decentralized betting logic
- **Hardhat Node**: Local blockchain for development
- **MetaMask**: **Working** wallet connection with real transactions

## 🛠️ Advanced Technical Setup

### Prerequisites
- Node.js 16+
- npm/yarn
- MetaMask (optional)

### MetaMask Configuration (Optional)
```
Network: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency: ETH

Test Account:
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

### Manual Installation
```bash
# Clone repository
git clone <repo-url>
cd betzilla

# Install dependencies
cd contracts && npm install
cd ../backend && npm install  
cd ../frontend && npm install

# Manual startup
cd contracts && npx hardhat node        # Terminal 1
npx hardhat run scripts/deploy.js       # Terminal 2
cd ../backend && npm start              # Terminal 3
cd ../frontend && npm start             # Terminal 4
```

## 🔧 Development

### Smart Contract (BetZilla.sol)
- **placeBet()**: Bet placement with validation and outcome selection
- **createMarket()**: Create new betting markets with description and start time
- **closeBetting()**: Close betting and calculate final parimutuel odds
- **setResult()**: Set match result (temporary - will be replaced by oracle)
- **claimWinnings()**: Claim winnings with individual fee calculation
- **claimRefund()**: Claim refunds for cancelled markets
- **cancelMarket()**: Cancel markets (admin function)
- **withdrawFees()**: Withdraw accumulated platform fees
- **getEstimatedOdds()**: Get current parimutuel odds for a market
- **getCurrentFee()**: Get current fee percentage (2% or 3%)
- **getUserFee()**: Get specific fee for user's existing bet
- **previewWinnings()**: Preview potential winnings with fee breakdown
- **getMarketStatus()**: Get comprehensive market status information
- **getBettingPhase()**: Get betting phase info (early vs parimutuel)
- **getUserMarkets()**: Get user's betting history
- **getMarket()**: Get complete market information
- **getUserBet()**: Get user's bet details for specific market

### Current vs Future Implementation

**Current (Testing Phase)**:
- Mock sports data for demonstration
- Manual match result setting
- Hardhat local blockchain

**Future (Production)**:
- Live sports API integration (ESPN, The Odds API, etc.)
- Automated oracle-based result resolution
- Mainnet deployment with real ETH

### API Backend
- **GET /api/matches**: Available matches list
- **GET /api/matches/:id/odds**: Live parimutuel odds  
- **POST /api/test-bet**: Test bet placement
- **GET /api/health**: System status

### React Frontend
- **useBetzilla.js**: Smart contract interaction hook
- **App.js**: Responsive main interface
- **Live Updates**: Odds updates every 30s

## 🚨 Troubleshooting

### Common Errors
- **"Port in use"**: Use `./stop-betzilla.sh` before restarting
- **"Contract not deployed"**: Restart with `./start-betzilla.sh`
- **"MetaMask error"**: Configure Hardhat network (ChainID 31337)

### Debug
```bash
# Check processes
ps aux | grep -E "(hardhat|node|react)"

# Check ports
lsof -i :3000,4000,8545

# Application logs
tail -f hardhat.log backend.log frontend.log
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/NewFeature`)
3. Commit changes (`git commit -m 'Add NewFeature'`)
4. Push branch (`git push origin feature/NewFeature`)
5. Open Pull Request

**⚠️ Disclaimer**: Demonstration project. Do not use for real betting without appropriate licenses and regulatory compliance.

**🎯 Quick Start**: `./start-betzilla.sh` → http://localhost:3000 → **Have fun!** 🚀