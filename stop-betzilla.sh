#!/bin/bash

echo "🛑 Stopping BETZILLA - Decentralized Sports Betting Platform"
echo "=========================================================="

# Stop all related processes
echo "🔍 Finding and stopping all BetZilla processes..."

# Kill hardhat node
pkill -f "hardhat node" 2>/dev/null
echo "✅ Hardhat node stopped"

# Kill backend
pkill -f "node index.js" 2>/dev/null
echo "✅ Backend stopped"

# Kill frontend
pkill -f "react-scripts start" 2>/dev/null
echo "✅ Frontend stopped"

# Kill any remaining npm processes
pkill -f "npm start" 2>/dev/null
echo "✅ NPM processes stopped"

# Kill any remaining node processes related to the project
pkill -f "node.*betzilla" 2>/dev/null
pkill -f "node.*frontend" 2>/dev/null
pkill -f "node.*backend" 2>/dev/null

# Check if any processes are still running
REMAINING_PROCESSES=$(ps aux | grep -E "(hardhat|react-scripts|npm start|node index.js)" | grep -v grep | wc -l)

if [ $REMAINING_PROCESSES -eq 0 ]; then
    echo "🎉 All BetZilla services stopped successfully!"
else
    echo "⚠️  Some processes may still be running. Check with: ps aux | grep -E '(hardhat|react-scripts|npm)'"
fi

echo ""
echo "📊 Port status:"
echo "Frontend (3000): $(lsof -i :3000 2>/dev/null | wc -l | sed 's/^/   /') processes"
echo "Backend (4000):  $(lsof -i :4000 2>/dev/null | wc -l | sed 's/^/   /') processes"
echo "Hardhat (8545):  $(lsof -i :8545 2>/dev/null | wc -l | sed 's/^/   /') processes"

echo ""
echo "🔄 To restart, run: ./start-betzilla.sh" 