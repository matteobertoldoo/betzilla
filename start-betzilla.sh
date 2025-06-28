#!/bin/bash

echo "🎰 Starting BETZILLA - Decentralized Sports Betting Platform"
echo "=========================================================="

# Kill any existing processes
echo "🛑 Stopping existing processes..."
pkill -f "hardhat node" 2>/dev/null
pkill -f "npm start" 2>/dev/null
pkill -f "node index.js" 2>/dev/null
sleep 2

# Start Hardhat node
echo "🔗 Starting Hardhat node..."
cd contracts
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "Hardhat node started with PID: $HARDHAT_PID"

# Wait for Hardhat to be ready
echo "⏳ Waiting for Hardhat node to be ready..."
sleep 5

# Deploy contract
echo "📦 Deploying BetZilla contract..."
npx hardhat run scripts/deploy.js --network localhost
if [ $? -eq 0 ]; then
    echo "✅ Contract deployed successfully!"
else
    echo "❌ Contract deployment failed!"
    exit 1
fi

# Start backend
echo "🖥️ Starting backend..."
cd ../backend
npm start > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 3

# Start frontend
echo "🌐 Starting frontend..."
cd ../frontend
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for frontend to be ready
sleep 5

echo ""
echo "🎉 BETZILLA is now running!"
echo "=========================="
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:4000"
echo "Hardhat:  http://localhost:8545"
echo ""
echo "📊 Process IDs:"
echo "Hardhat: $HARDHAT_PID"
echo "Backend: $BACKEND_PID"
echo "Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "Hardhat: contracts/hardhat.log"
echo "Backend: backend/backend.log"
echo "Frontend: frontend/frontend.log"
echo ""
echo "🛑 To stop all services, run: pkill -f 'hardhat\|npm start\|node index.js'" 