#!/bin/bash

echo "🎰 Setting up BetZilla Parimutuel System Test Environment"
echo "======================================================="

# Check if we're in the right directory
if [ ! -f "README.md" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Please run this script from the BetZilla root directory"
    exit 1
fi

echo "📊 Step 1: Adding test data for parimutuel betting..."
cd backend
node scripts/addParimutuelTestData.js
cd ..

echo ""
echo "🔥 Step 2: Starting backend server..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

echo "Backend started with PID: $BACKEND_PID"
sleep 3

echo ""
echo "🌐 Step 3: Testing parimutuel API endpoint..."
echo "Fetching matches with parimutuel odds for next 24 hours..."

# Test the parimutuel API
curl -s http://localhost:4000/api/parimutuel/matches/next24hours | jq '.' || echo "Please install jq for better JSON formatting"

echo ""
echo "✅ Parimutuel system setup complete!"
echo ""
echo "📱 Next steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Login/Register an account"
echo "3. Navigate to 'Live Odds' to see parimutuel odds"
echo "4. Place bets and watch odds change in real-time"
echo ""
echo "🛑 To stop the backend server:"
echo "kill $BACKEND_PID"
echo ""
echo "💡 The parimutuel odds are calculated as:"
echo "   Odds = (Total Pool - 3% Fee) / Amount Bet on Outcome"
echo ""
echo "🎯 Matches within 24 hours will show live parimutuel odds"
echo "🎯 Other matches will show 'Blind Betting' mode"
