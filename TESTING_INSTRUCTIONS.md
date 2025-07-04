# 🎯 Testing the Parimutuel Betting System

## Current Status ✅

The parimutuel betting system is now fully implemented and ready for testing! Here's what has been set up:

### ✅ Backend Setup
- Database matches with `contract_market_id` values ✓
- Parimutuel API endpoints working ✓  
- Test data with bets for calculating odds ✓
- Matches within 24 hours available ✓

### ✅ Frontend Setup
- Parimutuel odds display ✓
- Live odds for matches within 24 hours ✓
- Blind betting mode for other matches ✓
- Test mode for betting without blockchain ✓

## 🚀 How to Test

### 1. **View Live Parimutuel Odds**
   - Go to: http://localhost:3000
   - Click "Live Odds" in the navigation
   - You'll see matches with real parimutuel odds!

### 2. **Test Betting (Test Mode)**
   - Go to: http://localhost:3000/bet
   - Look for matches with contract market IDs
   - Enter a bet amount (e.g., 0.1 ETH)
   - Choose an outcome (Home/Draw/Away)
   - Click "Place Test Bet" 🧪

### 3. **View Real Parimutuel Calculations**
   - Some matches already have bets placed
   - Example: "Real Madrid vs Barcelona" shows:
     - Home: 2.14x odds
     - Draw: 20.84x odds (very high - few bets)
     - Away: 1.94x odds

## 📊 Current Test Data

The system includes these matches within 24 hours (showing 3% commission):

1. **Premier League: Manchester United vs Liverpool** (No bets yet - 3% fee)
2. **La Liga: Real Madrid vs Barcelona** (Has parimutuel odds! - 3% fee)
3. **NBA: Lakers vs Warriors** (No bets yet - 3% fee)
4. **Champions League: PSG vs Bayern Munich** (No bets yet - 3% fee)
5. **Real Madrid vs Barcelona - El Clasico** (Has parimutuel odds! - 3% fee)
6. **Serie A: Juventus vs AC Milan** (No bets yet - 3% fee)
7. **Chelsea vs Arsenal** (Has parimutuel odds! - 3% fee)

Matches more than 24 hours away show 2% commission (early betting discount).

## 🎲 How Parimutuel Odds Work

**Dynamic Fee System:**
- **Early Betting (>24h before match):** 2% fee, odds hidden
- **Parimutuel Phase (<24h before match):** 3% fee, live odds visible

**Parimutuel Formula:** `Odds = (Total Pool × (1 - Fee%)) / Amount on Outcome`

**Example Progression:**

**Early Phase (48h before match):**
- Bet: 1 ETH on Real Madrid
- Fee: 2% (0.02 ETH) - Early Bird Discount! 🐦
- Status: "🔒 Early Bird Special - Discounted fees, odds revealed when betting heats up!"

**Parimutuel Phase (12h before match):**
- Total Pool: 13.32 ETH  
- Real Madrid Bets: 6.05 ETH
- Fee: 3% → Net Pool: 12.92 ETH
- Real Madrid Odds: 12.92 / 6.05 = **2.14x**

## 🔄 Betting Phases

### Phase 1: Early Betting (>24h before match)
- ✅ **2% Platform Fee** (discount for early bets)
- 🔒 **Hidden Odds** (blind betting)
- 💡 Lower risk, lower fee

### Phase 2: Parimutuel Phase (<24h before match)  
- 📈 **3% Platform Fee** (standard rate)
- 🔥 **Live Odds Visible** (real-time updates)
- 🎯 See exactly what you're betting on

### Phase 3: Match Started
- ❌ **Betting Closed**
- 🏆 **Odds Finalized** for settlement

## 🧪 Test Mode Features

Since the smart contract isn't deployed, the system runs in "test mode":

- **Yellow banner** shows "🧪 Test Mode" 
- **Test betting** without blockchain interaction
- **Database storage** of test bets
- **Real parimutuel calculations** based on test data

## 🔄 Real-time Updates

- Parimutuel odds refresh every 30 seconds
- As you place test bets, odds will update
- Pool amounts update immediately

## 🎯 Next Steps for Full Deployment

To enable full blockchain betting:

1. **Deploy Smart Contract:**
   ```bash
   cd contracts
   npx hardhat node  # (already running)
   npx hardhat run scripts/deploy.js --network localhost
   ```

2. **The system will automatically switch to blockchain mode**

## 🔧 Troubleshooting

- **"No contract market ID"**: Some matches might not have contract IDs - this is normal for test mode
- **"No bets" odds**: Expected for new matches with no betting activity
- **Backend not responding**: Check if `node index.js` is running in backend/

## 🎉 Success Indicators

You know it's working when you see:
- ✅ Live odds for matches within 24 hours
- ✅ "No bets" for matches without betting activity  
- ✅ Real odds calculations (like 2.14x, 20.84x, 1.94x)
- ✅ Test betting working with yellow "🧪 Test Mode" indicator

The parimutuel system is fully functional and ready for use! 🚀
