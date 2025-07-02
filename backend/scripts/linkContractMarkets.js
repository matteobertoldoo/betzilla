const database = require('../database');

async function linkContractMarkets() {
  try {
    await database.initialize();
    
    console.log('🔗 Linking database matches to contract market IDs...');
    
    // Get all matches without contract market IDs
    const matches = await database.all(`
      SELECT * FROM matches 
      WHERE contract_market_id IS NULL 
      ORDER BY id ASC
    `);
    
    console.log(`Found ${matches.length} matches without contract market IDs`);
    
    if (matches.length === 0) {
      console.log('✅ All matches already have contract market IDs');
      return;
    }
    
    // Assign contract market IDs sequentially starting from 1
    let contractMarketId = 1;
    
    for (const match of matches) {
      // Update the match with a contract market ID
      await database.run(`
        UPDATE matches 
        SET contract_market_id = ? 
        WHERE id = ?
      `, [contractMarketId, match.id]);
      
      console.log(`✅ Linked match "${match.title}" (ID: ${match.id}) to contract market ${contractMarketId}`);
      contractMarketId++;
    }
    
    console.log(`\n🎉 Successfully linked ${matches.length} matches to contract markets!`);
    
    // Show updated matches
    const updatedMatches = await database.all(`
      SELECT id, title, contract_market_id, start_time 
      FROM matches 
      WHERE contract_market_id IS NOT NULL 
      ORDER BY start_time ASC
      LIMIT 10
    `);
    
    console.log('\n📋 Updated matches:');
    updatedMatches.forEach(match => {
      const startTime = new Date(match.start_time);
      console.log(`  - ${match.title} (Contract Market: ${match.contract_market_id}) - ${startTime.toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error linking contract markets:', error);
  } finally {
    await database.close();
  }
}

// Run the script
linkContractMarkets();
