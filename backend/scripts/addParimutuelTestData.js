const database = require('../database');

async function addSampleMatchesNext24Hours() {
  try {
    await database.initialize();
    
    const now = new Date();
    
    // Matches for testing parimutuel odds
    const matches = [
      {
        title: "Premier League: Manchester United vs Liverpool",
        description: "Epic clash between two Premier League giants",
        category: "Sports",
        sport: "Football",
        league: "Premier League",
        home_team: "Manchester United",
        away_team: "Liverpool",
        start_time: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        contract_market_id: 1
      },
      {
        title: "La Liga: Real Madrid vs Barcelona",
        description: "El Clasico - The biggest rivalry in football",
        category: "Sports", 
        sport: "Football",
        league: "La Liga",
        home_team: "Real Madrid",
        away_team: "Barcelona",
        start_time: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
        contract_market_id: 2
      },
      {
        title: "NBA: Lakers vs Warriors",
        description: "Western Conference rivalry",
        category: "Sports",
        sport: "Basketball",
        league: "NBA",
        home_team: "Los Angeles Lakers",
        away_team: "Golden State Warriors", 
        start_time: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
        contract_market_id: 3
      },
      {
        title: "Champions League: PSG vs Bayern Munich",
        description: "Champions League knockout stage",
        category: "Sports",
        sport: "Football", 
        league: "Champions League",
        home_team: "Paris Saint-Germain",
        away_team: "Bayern Munich",
        start_time: new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString(), // 18 hours from now
        contract_market_id: 4
      },
      {
        title: "Serie A: Juventus vs AC Milan",
        description: "Italian football rivalry",
        category: "Sports",
        sport: "Football",
        league: "Serie A", 
        home_team: "Juventus",
        away_team: "AC Milan",
        start_time: new Date(now.getTime() + 22 * 60 * 60 * 1000).toISOString(), // 22 hours from now
        contract_market_id: 5
      }
    ];

    // Insert matches
    for (const match of matches) {
      const result = await database.run(`
        INSERT INTO matches (
          title, description, category, sport, league, 
          home_team, away_team, start_time, contract_market_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        match.title, match.description, match.category, match.sport, match.league,
        match.home_team, match.away_team, match.start_time, match.contract_market_id
      ]);
      
      console.log(`✅ Added match: ${match.title} (ID: ${result.id})`);
    }

    // Add some sample bets for parimutuel calculation
    const sampleBets = [
      // Manchester United vs Liverpool (market_id: 1)
      { market_id: 1, outcome: 1, amount_wei: "1000000000000000000", user_id: 1 }, // 1 ETH on Manchester United
      { market_id: 1, outcome: 3, amount_wei: "500000000000000000", user_id: 2 },  // 0.5 ETH on Liverpool
      { market_id: 1, outcome: 1, amount_wei: "750000000000000000", user_id: 3 },  // 0.75 ETH on Manchester United
      { market_id: 1, outcome: 2, amount_wei: "250000000000000000", user_id: 4 },  // 0.25 ETH on Draw

      // Real Madrid vs Barcelona (market_id: 2)
      { market_id: 2, outcome: 1, amount_wei: "2000000000000000000", user_id: 1 }, // 2 ETH on Real Madrid
      { market_id: 2, outcome: 3, amount_wei: "1500000000000000000", user_id: 2 }, // 1.5 ETH on Barcelona
      { market_id: 2, outcome: 2, amount_wei: "500000000000000000", user_id: 3 },  // 0.5 ETH on Draw

      // Lakers vs Warriors (market_id: 3) - No draw option for basketball
      { market_id: 3, outcome: 1, amount_wei: "800000000000000000", user_id: 1 },  // 0.8 ETH on Lakers
      { market_id: 3, outcome: 2, amount_wei: "1200000000000000000", user_id: 2 }, // 1.2 ETH on Warriors
    ];

    // Create a test user if it doesn't exist
    try {
      await database.run(`
        INSERT OR IGNORE INTO users (id, username, email, password_hash) 
        VALUES (1, 'testuser1', 'test1@example.com', 'hash1'),
               (2, 'testuser2', 'test2@example.com', 'hash2'),
               (3, 'testuser3', 'test3@example.com', 'hash3'),
               (4, 'testuser4', 'test4@example.com', 'hash4')
      `);
    } catch (err) {
      console.log('Test users already exist or error creating them:', err.message);
    }

    // Insert sample bets
    for (const bet of sampleBets) {
      try {
        const result = await database.run(`
          INSERT INTO user_bets (user_id, market_id, outcome, amount_wei, status)
          VALUES (?, ?, ?, ?, 'confirmed')
        `, [bet.user_id, bet.market_id, bet.outcome, bet.amount_wei]);
        
        console.log(`✅ Added bet: ${bet.amount_wei} wei on outcome ${bet.outcome} for market ${bet.market_id}`);
      } catch (err) {
        console.log(`⚠️ Error adding bet:`, err.message);
      }
    }

    console.log('\n🎉 Sample matches and bets for next 24 hours added successfully!');
    console.log('These matches will show parimutuel odds in the frontend.\n');

  } catch (error) {
    console.error('❌ Error adding sample data:', error);
  } finally {
    await database.close();
  }
}

// Run the script
addSampleMatchesNext24Hours();
