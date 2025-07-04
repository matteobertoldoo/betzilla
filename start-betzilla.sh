#!/bin/bash

echo "🎰 Starting BETZILLA - Decentralized Sports Betting Platform"
echo "=========================================================="

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use. Stopping existing processes..."
        pkill -f ":$port" 2>/dev/null
        sleep 2
    fi
}

# Function to wait for a service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $service_name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" >/dev/null 2>&1; then
            echo "✅ $service_name is ready!"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
        attempt=$((attempt + 1))
    done
    echo "❌ $service_name failed to start after $max_attempts attempts"
    return 1
}

# Function to install dependencies if needed
install_dependencies() {
    local dir=$1
    local component=$2

    if [ -f "$dir/package.json" ]; then
        if [ ! -d "$dir/node_modules" ] || [ "$dir/package.json" -nt "$dir/node_modules" ]; then
            echo "📦 Installing $component dependencies..."
            cd "$dir"
            npm install
            if [ $? -eq 0 ]; then
                echo "✅ $component dependencies installed successfully!"
            else
                echo "❌ Failed to install $component dependencies"
                exit 1
            fi
            cd - > /dev/null
        else
            echo "✅ $component dependencies already installed"
        fi
    else
        echo "❌ No package.json found in $dir"
        exit 1
    fi
}

# Stop any existing processes first
echo "🛑 Stopping existing processes..."
./stop-betzilla.sh >/dev/null 2>&1
sleep 3

# Check and clear ports
check_port 3000
check_port 4000
check_port 8545

# Install dependencies for all components
echo "🔍 Checking and installing dependencies..."
install_dependencies "contracts" "Contracts"
install_dependencies "backend" "Backend"
install_dependencies "frontend" "Frontend"

# Start Hardhat node
echo "🔗 Starting Hardhat node..."
cd contracts
npx hardhat node > ../hardhat.log 2>&1 &
HARDHAT_PID=$!
echo "Hardhat node started with PID: $HARDHAT_PID"

# Wait for Hardhat to be ready
if ! wait_for_service "http://localhost:8545" "Hardhat node"; then
    echo "❌ Failed to start Hardhat node"
    exit 1
fi

# Deploy contract
echo "📦 Deploying BetZilla contract..."
npx hardhat run scripts/deploy.js --network localhost >> ../hardhat.log 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Contract deployment failed"
    exit 1
fi
echo "✅ Contract deployed successfully!"

# Extract contract address from logs
CONTRACT_ADDRESS=$(grep "Contract address:" ../hardhat.log | tail -1 | awk '{print $NF}')
if [ -n "$CONTRACT_ADDRESS" ]; then
    echo "📍 Contract address: $CONTRACT_ADDRESS"

    # Update contract address in frontend
    FRONTEND_HOOK="../frontend/src/hooks/useBetzilla.js"
    if [ -f "$FRONTEND_HOOK" ]; then
        echo "📝 Updating contract address in frontend..."
        sed -i "s/const CONTRACT_ADDRESS = '[^']*'/const CONTRACT_ADDRESS = '$CONTRACT_ADDRESS'/" "$FRONTEND_HOOK"
        echo "✅ Contract address updated in useBetzilla.js"
    else
        echo "⚠️  $FRONTEND_HOOK not found, skipping contract address update."
    fi
else
    echo "❌ Could not extract contract address"
    exit 1
fi

cd ..

# Start backend
echo "🖥️ Starting backend..."
cd backend
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
if ! wait_for_service "http://localhost:4000/api/health" "Backend"; then
    echo "❌ Failed to start backend"
    exit 1
fi

cd ..

# --- POPULATE DATABASE BEFORE MARKET SYNC ---
echo "🚀 Populating matches and users..."
node backend/scripts/populateMatches.js

echo "💸 Adding parimutuel test bets..."
node backend/scripts/addParimutuelTestData.js

# Run market synchronization script from contracts
cd contracts
echo "🔄 Syncing/creating markets from database... can take a while (45sec)"
if [ -f scripts/createMarketsFromDatabase.js ]; then
    npx hardhat run scripts/createMarketsFromDatabase.js --network localhost > ../marketsync.log 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Markets synchronized successfully!"
    else
        echo "❌ Market synchronization failed. Check marketsync.log for details."
        tail -20 ../marketsync.log
        exit 1
    fi
else
    echo "⚠️  scripts/createMarketsFromDatabase.js not found. Skipping market sync."
fi

# Place fake on-chain bets for test users
echo "💸 Placing fake on-chain bets for test users..."
npx hardhat run scripts/placeFakeBetsOnChain.js --network localhost

cd ..

# Start frontend
echo "🌐 Starting frontend..."
cd frontend
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for frontend to be ready
if ! wait_for_service "http://localhost:3000" "Frontend"; then
    echo "❌ Failed to start frontend"
    exit 1
fi

cd ..

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
echo "Hardhat: hardhat.log"
echo "Backend: backend.log"
echo "Frontend: frontend.log"
echo "Market Sync: marketsync.log"
echo ""
echo "🛑 To stop all services, run: ./stop-betzilla.sh"
