const database = require('../database');
const bettingService = require('../services/bettingService');

// Helper to get a random element from an array
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate a random bet amount in Wei (e.g., 0.01 to 1.5 ETH)
const getRandomBetAmountWei = () => {
  const eth = Math.random() * 1.49 + 0.01; // Random ETH between 0.01 and 1.5
  return BigInt(Math.round(eth * 1e18)).toString();
};

async function addParimutuelTestData() {
  try {
    console.log('🚀 Starting to add parimutuel test data (bets)...');
    await database.initialize();

    // Step 1: Fetch users e partite future
    const friendUsernames = [
      'alice_bet', 'bob_gambler', 'carol_sports', 'david_fan',
      'eve_bettor', 'frank_lucky', 'grace_wins', 'henry_odds'
    ];
    const users = (await database.all('SELECT id, username FROM users'))
      .filter(u => friendUsernames.includes(u.username));
    const now = new Date().toISOString();
    const matches = await database.all('SELECT id, title, sport, start_time FROM matches WHERE start_time > ?', [now]);

    // Forza le partite desiderate in cima alla lista
    const priorityTitles = [
      "Napoli vs Roma - Serie A",
      "Juventus vs Milan - Serie A"
    ];
    const priorityMatches = matches.filter(m => priorityTitles.includes(m.title));
    const otherMatches = matches.filter(m => !priorityTitles.includes(m.title));
    const matchesToBetOn = [...priorityMatches, ...otherMatches].slice(0, 15); // Le prime 15, ma con priorità alle tue

    if (users.length === 0 || matches.length === 0) {
      console.error('❌ No users or matches found. Please run `populateMatches.js` first.');
      await database.close();
      process.exit(1);
    }
    console.log(`✅ Found ${users.length} users and ${matches.length} future matches.`);

    // Step 2: NON cancellare le scommesse esistenti

    // Step 3: Crea solo nuove scommesse per partite future
    let betsCreatedCount = 0;

    for (const match of matchesToBetOn) {
      console.log(`\n--- Placing bets for: ${match.title} ---`);
      const numBets = Math.floor(Math.random() * (users.length - 2)) + 2; // 2 to user.length bets per match
      const usersWhoWillBet = [...users].sort(() => 0.5 - Math.random()).slice(0, numBets);

      for (const user of usersWhoWillBet) {
        const hasDrawOption = match.sport === 'Football' || match.sport === 'Soccer';
        let outcome;
        if (hasDrawOption) {
          outcome = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        } else {
          outcome = Math.random() > 0.5 ? 1 : 3; // 1 or 3 (no draw)
        }
        const betData = {
          userId: user.id,
          marketId: match.id,
          outcome: outcome,
          amountWei: getRandomBetAmountWei(),
          transactionHash: `0x_test_tx_${Date.now()}_${betsCreatedCount + 1}`,
          status: 'confirmed'
        };

        if (!(await betExists(user.id, match.id))) {
          try {
            await bettingService.saveBet(betData);
            console.log(`  ✅ ${user.username} bet on outcome ${outcome} for ${(Number(betData.amountWei) / 1e18).toFixed(4)} ETH`);
            betsCreatedCount++;
          } catch (error) {
            console.error(`  ❌ Failed to place bet for ${user.username}: ${error.message}`);
          }
        } else {
          console.log(`  ⏩ Bet already exists for ${user.username} on match ${match.title}`);
        }
      }
    }

    // Step 4: Final summary
    console.log('\n🎉 Parimutuel test data creation finished!');
    console.log(`💸 Total bets created: ${betsCreatedCount}`);
    
    const betStats = await database.get('SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as bettors, COUNT(DISTINCT market_id) as markets FROM user_bets');
    console.log(`📈 Final Bet Statistics: ${betStats.total} bets from ${betStats.bettors} unique users across ${betStats.markets} markets.`);

    await database.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding parimutuel test data:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  addParimutuelTestData();
}

module.exports = { addParimutuelTestData };

async function betExists(userId, marketId) {
  const bet = await database.get(
    'SELECT id FROM user_bets WHERE user_id = ? AND market_id = ?',
    [userId, marketId]
  );
  return !!bet;
}
async function betExists(userId, marketId) {
  const bet = await database.get(
    'SELECT id FROM user_bets WHERE user_id = ? AND market_id = ?',
    [userId, marketId]
  );
  return !!bet;
}
