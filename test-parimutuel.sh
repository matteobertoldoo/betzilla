#!/bin/bash

echo "🚀 BETZILLA COMPLETE TESTING SUITE"
echo "=================================="

# Check if we're in the right directory
if [ ! -d "contracts" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to check if a process is running on a port
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if Hardhat node is running
if ! check_port 8545; then
    echo "⚠️ Hardhat node is not running. Starting it now..."
    cd contracts
    
    # Start Hardhat node in background
    npx hardhat node &
    HARDHAT_PID=$!
    
    # Wait for node to start
    echo "⏳ Waiting for Hardhat node to start..."
    sleep 5
    
    # Check if node started successfully
    if ! check_port 8545; then
        echo "❌ Failed to start Hardhat node"
        exit 1
    fi
    
    echo "✅ Hardhat node started successfully"
    cd ..
else
    echo "✅ Hardhat node is already running"
fi

# Function to run test and check result
run_test() {
    local test_name=$1
    local test_script=$2
    
    echo ""
    echo "🧪 Running $test_name..."
    echo "========================"
    
    cd contracts
    if npx hardhat run "$test_script" --network localhost; then
        echo "✅ $test_name: PASSED"
        cd ..
        return 0
    else
        echo "❌ $test_name: FAILED"
        cd ..
        return 1
    fi
}

# Initialize test results
TOTAL_TESTS=0
PASSED_TESTS=0

# Test 1: Complete BetZilla System Test
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "Complete System Test" "scripts/test-betzilla-complete.js"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

# Test 2: Edge Cases Test
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if run_test "Edge Cases Test" "scripts/test-edge-cases.js"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
fi

# Optional: Test contract interaction with backend
echo ""
echo "🔗 Testing Backend Integration..."
echo "==============================="

# Check if backend is running
if check_port 4000; then
    echo "✅ Backend is running on port 4000"
    
    # Test API endpoints
    echo "📡 Testing API endpoints..."
    
    if curl -s http://localhost:4000/api/health > /dev/null; then
        echo "✅ Health endpoint: OK"
    else
        echo "⚠️ Health endpoint: FAILED"
    fi
    
    if curl -s http://localhost:4000/api/matches > /dev/null; then
        echo "✅ Matches endpoint: OK"
    else
        echo "⚠️ Matches endpoint: FAILED"
    fi
    
else
    echo "⚠️ Backend is not running on port 4000"
    echo "💡 Start backend with: cd backend && npm start"
fi

# Test Summary
echo ""
echo "📊 TEST SUMMARY"
echo "==============="
echo "Total tests run: $TOTAL_TESTS"
echo "Tests passed: $PASSED_TESTS"
echo "Tests failed: $((TOTAL_TESTS - PASSED_TESTS))"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo "🎉 ALL TESTS PASSED! BetZilla is ready for production! 🚀"
    
    echo ""
    echo "🔧 Next Steps:"
    echo "============="
    echo "1. Deploy to testnet: npx hardhat run scripts/deploy.js --network goerli"
    echo "2. Verify contracts on Etherscan"
    echo "3. Update frontend contract address"
    echo "4. Test on testnet with real MetaMask"
    echo "5. Deploy to mainnet when ready"
    
    exit 0
else
    echo "❌ Some tests failed. Please review the output above."
    
    echo ""
    echo "🔧 Troubleshooting:"
    echo "=================="
    echo "1. Check that Hardhat node is running: npx hardhat node"
    echo "2. Ensure contracts compile: npx hardhat compile"
    echo "3. Review error messages above"
    echo "4. Check contract code for any issues"
    
    exit 1
fi

# Cleanup function for Ctrl+C
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    
    if [ ! -z "$HARDHAT_PID" ]; then
        echo "Stopping Hardhat node..."
        kill $HARDHAT_PID 2>/dev/null
    fi
    
    exit 0
}

# Set trap for cleanup
trap cleanup SIGINT SIGTERM

# Keep script running if node was started by this script
if [ ! -z "$HARDHAT_PID" ]; then
    echo ""
    echo "📝 Hardhat node is running (PID: $HARDHAT_PID)"
    echo "Press Ctrl+C to stop and cleanup"
    wait $HARDHAT_PID
fi
