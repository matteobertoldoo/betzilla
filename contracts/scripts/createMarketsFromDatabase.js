const { ethers } = require("hardhat");
const axios = require('axios');

async function main() {
  console.log("🚀 Creating contract markets from database matches...");
  
  try {
    // Connect to deployed contract
    const BetZilla = await ethers.getContractFactory("BetZilla");
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Your contract address
    const contract = BetZilla.attach(contractAddress);
    
    console.log(`📡 Connected to contract: ${contractAddress}`);
    
    // Check current market count
    const currentMarketCount = await contract.marketCount();
    console.log(`📊 Current markets in contract: ${currentMarketCount}`);
    
    // Verify existing markets in contract
    console.log("🔍 Verifying existing contract markets...");
    const existingMarkets = [];
    for (let i = 1; i <= Number(currentMarketCount); i++) {
      try {
        const market = await contract.getMarket(i);
        const startTime = Number(market[6]);
        existingMarkets.push({
          id: i,
          title: market[0],
          startTime: startTime
        });
        // Fix timestamp display
        const displayTime = startTime > 0 ? new Date(startTime * 1000).toLocaleString() : 'Invalid timestamp';
        console.log(`  ✅ Market ${i}: "${market[0]}" - Start: ${displayTime}`);
      } catch (error) {
        console.log(`  ❌ Market ${i}: Error - ${error.message}`);
      }
    }
    
    // Fetch matches from your backend
    console.log("📥 Fetching matches from backend...");
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.get(`${backendUrl}/api/matches?upcoming=true&limit=50`);
    
    if (!response.data.success) {
      throw new Error('Failed to fetch matches from backend');
    }
    
    const matches = response.data.data;
    console.log(`📋 Found ${matches.length} matches in database`);
    
    // Log match details for debugging
    console.log("📅 Match timing analysis:");
    const now = new Date();
    matches.forEach((match, index) => {
      if (index < 5) { // Show first 5 matches for debugging
        const startTime = new Date(match.start_time);
        const timeDiff = startTime.getTime() - now.getTime();
        const hoursUntil = timeDiff / (1000 * 60 * 60);
        console.log(`  ${match.title}:`);
        console.log(`    Start: ${startTime.toLocaleString()}`);
        console.log(`    Hours until: ${hoursUntil.toFixed(1)}`);
        console.log(`    Contract ID: ${match.contract_market_id || 'None'}`);
      }
    });
    
    // Clean up: Reset contract_market_id for matches with invalid IDs
    console.log("🧹 Cleaning up invalid market IDs...");
    for (const match of matches) {
      if (match.contract_market_id && Number(match.contract_market_id) > Number(currentMarketCount)) {
        console.log(`  🔧 Resetting invalid market ID ${match.contract_market_id} for match "${match.title}"`);
        try {
          await axios.patch(`${backendUrl}/api/matches/${match.id}/market`, {
            contractMarketId: null
          });
        } catch (error) {
          console.error(`  ❌ Failed to reset market ID for match ${match.id}:`, error.message);
        }
      }
    }
    
    // Re-fetch matches after cleanup
    const cleanResponse = await axios.get(`${backendUrl}/api/matches?upcoming=true&limit=50`);
    const cleanMatches = cleanResponse.data.data;
    
    // Filter matches that need markets and are in the future
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const matchesNeedingMarkets = cleanMatches.filter(match => {
      const hasValidMarketId = match.contract_market_id && 
                              Number(match.contract_market_id) >= 1 && 
                              Number(match.contract_market_id) <= Number(currentMarketCount);
      
      const startTime = Math.floor(new Date(match.start_time).getTime() / 1000);
      const isFutureMatch = startTime > nowTimestamp;
      
      return !hasValidMarketId && isFutureMatch;
    });
    
    console.log(`🎯 ${matchesNeedingMarkets.length} matches need contract markets and are in the future`);
    
    if (matchesNeedingMarkets.length === 0) {
      console.log("✅ All future matches already have valid contract markets!");
      
      // Show matches that were skipped due to timing
      const pastMatches = cleanMatches.filter(match => {
        const startTime = Math.floor(new Date(match.start_time).getTime() / 1000);
        return startTime <= nowTimestamp;
      });
      
      if (pastMatches.length > 0) {
        console.log(`⏭️ ${pastMatches.length} matches skipped (already started)`);
        pastMatches.slice(0, 3).forEach(match => {
          console.log(`  - ${match.title} (started ${new Date(match.start_time).toLocaleString()})`);
        });
      }
      
      return;
    }
    
    let marketsCreated = 0;
    
    // Create markets for future matches
    for (const match of matchesNeedingMarkets) {
      try {
        // Convert start_time to unix timestamp with proper validation
        const startTime = Math.floor(new Date(match.start_time).getTime() / 1000);
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Double-check timing
        if (startTime <= currentTime) {
          console.log(`⏭️ Skipping ${match.title} - match already started`);
          continue;
        }
        
        // Validate start time is reasonable (not too far in future)
        const hoursUntilMatch = (startTime - currentTime) / 3600;
        if (hoursUntilMatch > 8760) { // More than 1 year
          console.log(`⏭️ Skipping ${match.title} - too far in future (${hoursUntilMatch.toFixed(0)} hours)`);
          continue;
        }
        
        console.log(`🏗️ Creating market: ${match.title}`);
        console.log(`   Start time: ${new Date(match.start_time).toLocaleString()}`);
        console.log(`   Unix timestamp: ${startTime}`);
        console.log(`   Hours until match: ${hoursUntilMatch.toFixed(1)}`);
        
        // Create market on blockchain with proper timestamp
        const tx = await contract.createMarket(match.title, startTime);
        const receipt = await tx.wait();
        
        // Get the new market ID
        const newMarketCount = await contract.marketCount();
        const actualMarketId = Number(newMarketCount);
        
        // Verify the market was created with correct timestamp
        try {
          const verifyMarket = await contract.getMarket(actualMarketId);
          const verifyStartTime = Number(verifyMarket[6]);
          console.log(`✅ Market created and verified! Contract Market ID: ${actualMarketId}`);
          console.log(`   Title: "${verifyMarket[0]}"`);
          console.log(`   Stored timestamp: ${verifyStartTime} (${new Date(verifyStartTime * 1000).toLocaleString()})`);
          console.log(`   Transaction: ${tx.hash}`);
          console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
          
          // Verify timestamp matches
          if (Math.abs(verifyStartTime - startTime) > 60) { // Allow 1 minute difference
            console.warn(`   ⚠️ Timestamp mismatch! Expected: ${startTime}, Got: ${verifyStartTime}`);
          }
        } catch (verifyError) {
          console.error(`❌ Market creation verification failed for ID ${actualMarketId}:`, verifyError.message);
          continue;
        }
        
        // Update the database with the contract market ID
        try {
          await axios.patch(`${backendUrl}/api/matches/${match.id}/market`, {
            contractMarketId: actualMarketId
          });
          console.log(`✅ Updated database: match ${match.id} -> contract market ${actualMarketId}`);
        } catch (updateError) {
          console.error(`❌ Failed to update database for match ${match.id}:`, updateError.message);
        }
        
        marketsCreated++;
        
        // Delay to avoid overwhelming the network
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Failed to create market for ${match.title}:`, error.message);
        if (error.message.includes('Start time must be in the future')) {
          console.error(`   Timestamp issue: ${match.start_time} -> ${Math.floor(new Date(match.start_time).getTime() / 1000)}`);
        }
      }
    }
    
    console.log(`\n🎉 Successfully created ${marketsCreated} contract markets!`);
    
    // Final verification
    const finalMarketCount = await contract.marketCount();
    console.log(`📊 Final contract market count: ${finalMarketCount}`);
    
    // Show recent markets with proper timestamps
    console.log("\n📋 Recent contract markets verification:");
    const startFrom = Math.max(1, Number(finalMarketCount) - 9);
    for (let i = startFrom; i <= Number(finalMarketCount); i++) {
      try {
        const market = await contract.getMarket(i);
        const startTime = Number(market[6]);
        const displayTime = startTime > 0 ? new Date(startTime * 1000).toLocaleString() : 'Invalid timestamp';
        console.log(`  ${i}: "${market[0]}" - Start: ${displayTime}`);
      } catch (error) {
        console.log(`  ${i}: ❌ Error - ${error.message}`);
      }
    }
    
    // Final synchronization status
    const finalResponse = await axios.get(`${backendUrl}/api/matches?upcoming=true&limit=50`);
    const finalMatches = finalResponse.data.data;
    const syncedCount = finalMatches.filter(m => m.contract_market_id && Number(m.contract_market_id) <= Number(finalMarketCount)).length;
    const unsyncedCount = finalMatches.filter(m => !m.contract_market_id || Number(m.contract_market_id) > Number(finalMarketCount)).length;
    
    console.log(`\n📊 Final Synchronization Summary:`);
    console.log(`   Contract Markets: ${finalMarketCount}`);
    console.log(`   Database Matches: ${finalMatches.length}`);
    console.log(`   ✅ Synced: ${syncedCount}`);
    console.log(`   ❌ Unsynced: ${unsyncedCount}`);
    
    if (unsyncedCount > 0) {
      console.log(`\n💡 ${unsyncedCount} matches remain unsynced (likely due to timing constraints)`);
      
      // Show why matches are unsynced
      const unsyncedMatches = finalMatches.filter(m => !m.contract_market_id);
      unsyncedMatches.slice(0, 3).forEach(match => {
        const startTime = new Date(match.start_time);
        const now = new Date();
        const isPast = startTime <= now;
        console.log(`  - ${match.title}: ${isPast ? 'Already started' : 'Future match without contract ID'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
