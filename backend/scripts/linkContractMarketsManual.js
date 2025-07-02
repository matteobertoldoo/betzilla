const db = require('../database');

async function linkContractMarkets() {
  console.log('Linking database matches to contract market IDs...');
  
  try {
    // Get all matches from database
    const matches = await db.getAllMatches();
    console.log(`Found ${matches.length} matches in database`);
    
    // The contract markets were created in order, starting from market ID 1
    // Based on the deployment log, we know the order of markets created
    
    // First, get matches within next 24 hours (these were created first)
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const matchesWithin24Hours = matches.filter(match => {
      const startTime = new Date(match.start_time);
      return startTime >= now && startTime <= next24Hours;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
    console.log(`Found ${matchesWithin24Hours.length} matches within next 24 hours`);
    
    // Update matches with contract market IDs
    let contractMarketId = 1;
    
    for (const match of matchesWithin24Hours) {
      try {
        await db.updateMatchContractId(match.id, contractMarketId);
        console.log(`✅ Updated match ${match.id} (${match.home_team} vs ${match.away_team}) with contract market ID ${contractMarketId}`);
        contractMarketId++;
      } catch (error) {
        console.error(`❌ Failed to update match ${match.id}:`, error.message);
      }
    }
    
    // Then update the rest of the matches
    const remainingMatches = matches.filter(match => {
      const startTime = new Date(match.start_time);
      return startTime > next24Hours;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    
    console.log(`Updating ${remainingMatches.length} remaining matches...`);
    
    for (const match of remainingMatches.slice(0, 30 - matchesWithin24Hours.length)) {
      try {
        await db.updateMatchContractId(match.id, contractMarketId);
        console.log(`✅ Updated match ${match.id} (${match.home_team} vs ${match.away_team}) with contract market ID ${contractMarketId}`);
        contractMarketId++;
        
        if (contractMarketId > 30) break; // Only 30 markets were created
      } catch (error) {
        console.error(`❌ Failed to update match ${match.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully linked matches to contract market IDs!`);
    console.log(`Total contract markets available: 30`);
    
  } catch (error) {
    console.error('Error linking contract markets:', error);
  } finally {
    db.close();
  }
}

// Run the function
linkContractMarkets();
