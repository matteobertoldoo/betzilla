const { ethers } = require("hardhat");
const axios = require('axios');

async function main() {
  console.log("🔍 Verifying markets synchronization...");
  
  try {
    // Connect to contract
    const BetZilla = await ethers.getContractFactory("BetZilla");
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = BetZilla.attach(contractAddress);
    
    // Get contract market count
    const marketCount = await contract.marketCount();
    console.log(`📊 Contract has ${marketCount} markets`);
    
    // Fetch database matches
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.get(`${backendUrl}/api/matches?upcoming=true&limit=50`);
    const matches = response.data.data;
    
    console.log(`📋 Database has ${matches.length} matches`);
    
    // Check synchronization
    const syncedMatches = matches.filter(m => m.contract_market_id);
    const unsyncedMatches = matches.filter(m => !m.contract_market_id);
    
    console.log(`✅ Synced matches: ${syncedMatches.length}`);
    console.log(`❌ Unsynced matches: ${unsyncedMatches.length}`);
    
    if (unsyncedMatches.length > 0) {
      console.log("\n📋 Unsynced matches:");
      unsyncedMatches.slice(0, 5).forEach(match => {
        console.log(`  - ${match.title} (DB ID: ${match.id})`);
      });
    }
    
    // Test some contract market IDs that were causing errors
    const problematicIds = [25, 37, 38];
    console.log("\n🧪 Testing problematic market IDs:");
    
    for (const id of problematicIds) {
      try {
        const market = await contract.getMarket(id);
        console.log(`✅ Market ${id} exists: "${market[0]}"`);
      } catch (error) {
        console.log(`❌ Market ${id}: Does not exist`);
      }
    }
    
    // Show matches that should have specific contract market IDs
    console.log("\n📋 Sample synced matches:");
    syncedMatches.slice(0, 10).forEach(match => {
      console.log(`  DB ${match.id} -> Contract ${match.contract_market_id}: ${match.title}`);
    });
    
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
