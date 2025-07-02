const database = require('../database');

async function createSmartContractMarkets() {
  try {
    await database.initialize();
    
    console.log('📊 Creating smart contract markets for database matches...');
    
    // For testing purposes, we'll simulate creating contract markets
    // In a real deployment, this would interact with the deployed smart contract
    
    // Get matches that need contract market creation (recent ones within 24 hours)
    const matches = await database.all(`
      SELECT * FROM matches 
      WHERE contract_market_id IS NOT NULL 
      AND datetime(start_time) BETWEEN datetime('now') AND datetime('now', '+24 hours')
      ORDER BY start_time ASC
    `);
    
    console.log(`Found ${matches.length} matches within 24 hours that need contract markets:`);
    
    for (const match of matches) {
      const startTime = new Date(match.start_time);
      console.log(`📋 Match: ${match.title}`);
      console.log(`   - Database ID: ${match.id}`);
      console.log(`   - Contract Market ID: ${match.contract_market_id}`);
      console.log(`   - Start Time: ${startTime.toLocaleString()}`);
      console.log(`   - Sport: ${match.sport} (Has Draw: ${match.sport === 'Football' || match.sport === 'Soccer'})`);
      console.log('');
    }
    
    // For now, we'll assume the contract markets exist with the assigned IDs
    // In production, you would:
    // 1. Deploy the BetZilla contract
    // 2. Call createMarket() for each match
    // 3. Update the database with the actual contract market IDs
    
    console.log('✅ Contract market setup complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Deploy BetZilla contract: cd contracts && npx hardhat run scripts/deploy.js --network localhost');
    console.log('2. Start the backend: cd backend && npm start');
    console.log('3. Start the frontend: cd frontend && npm start');
    console.log('4. Test the parimutuel betting system');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await database.close();
  }
}

createSmartContractMarkets();
