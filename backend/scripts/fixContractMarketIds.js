const database = require('../database');

async function fixContractMarketIds() {
  try {
    await database.initialize();
    
    console.log('🔧 Fixing contract market IDs...');
    
    // Get all matches
    const matches = await database.all('SELECT id, title, contract_market_id FROM matches ORDER BY id');
    
    console.log(`Found ${matches.length} matches to update`);
    
    // Update each match to have contract_market_id = id
    for (const match of matches) {
      await database.run('UPDATE matches SET contract_market_id = ? WHERE id = ?', [match.id, match.id]);
      console.log(`✅ Updated match ${match.id} to contract market ${match.id}`);
    }
    
    console.log('🎉 All contract market IDs fixed!');
    
    // Verify the update
    const updatedMatches = await database.all(`
      SELECT id, title, contract_market_id, start_time 
      FROM matches 
      WHERE datetime(start_time) BETWEEN datetime('now') AND datetime('now', '+24 hours')
      ORDER BY start_time ASC
    `);
    
    console.log('\n📋 Matches within 24 hours:');
    updatedMatches.forEach(match => {
      const startTime = new Date(match.start_time);
      console.log(`  - ${match.title} (DB ID: ${match.id}, Contract Market: ${match.contract_market_id}) - ${startTime.toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await database.close();
  }
}

fixContractMarketIds();
