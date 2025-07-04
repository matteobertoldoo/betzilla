const database = require('../database');
const matchService = require('../services/matchService');
const authService = require('../services/authService');

// Helper function to get future date
const getFutureDate = (daysFromNow, hours = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

// Helper function to get random hour between 12-22
const getRandomHour = () => {
  return Math.floor(Math.random() * (22 - 12 + 1)) + 12;
};

// Sample users data
const usersData = [
  { username: 'alice_bet', email: 'alice@betzilla.com', password: 'password123' },
  { username: 'bob_gambler', email: 'bob@betzilla.com', password: 'password123' },
  { username: 'carol_sports', email: 'carol@betzilla.com', password: 'password123' },
  { username: 'david_fan', email: 'david@betzilla.com', password: 'password123' },
  { username: 'eve_bettor', email: 'eve@betzilla.com', password: 'password123' },
  { username: 'frank_lucky', email: 'frank@betzilla.com', password: 'password123' },
  { username: 'grace_wins', email: 'grace@betzilla.com', password: 'password123' },
  { username: 'henry_odds', email: 'henry@betzilla.com', password: 'password123' }
];

// Helper function to clear all database tables
async function clearDatabase() {
  console.log('🗑️ Clearing database...');
  
  // Delete all data from tables (in correct order due to foreign keys)
  await database.run('DELETE FROM user_bets');
  await database.run('DELETE FROM user_sessions');
  await database.run('DELETE FROM matches');
  await database.run('DELETE FROM users');
  
  // Reset auto-increment counters
  await database.run('DELETE FROM sqlite_sequence WHERE name IN ("users", "matches", "user_bets", "user_sessions")');
  
  console.log('✅ Database cleared successfully');
}

const matchData = [
  // Day 1 - Football
  {
    title: "Real Madrid vs Barcelona - El Clasico",
    description: "The biggest rivalry in Spanish football",
    category: "Sports",
    sport: "Football",
    league: "La Liga",
    homeTeam: "Real Madrid",
    awayTeam: "Barcelona",
    startTime: getFutureDate(1, 14),
    endTime: getFutureDate(1, 16)
  },
  {
    title: "Chelsea vs Arsenal - Premier League",
    description: "London derby in the Premier League",
    category: "Sports",
    sport: "Football",
    league: "Premier League",
    homeTeam: "Chelsea",
    awayTeam: "Arsenal",
    startTime: getFutureDate(1, 18),
    endTime: getFutureDate(1, 20)
  },
  {
    title: "Bayern Munich vs Dortmund - Bundesliga",
    description: "Der Klassiker - Germany's biggest football rivalry",
    category: "Sports",
    sport: "Football",
    league: "Bundesliga",
    homeTeam: "Bayern Munich",
    awayTeam: "Borussia Dortmund",
    startTime: getFutureDate(1, 20),
    endTime: getFutureDate(1, 22)
  },

  // Day 2 - Mixed Sports
  {
    title: "Golden State Warriors vs Boston Celtics - NBA Finals",
    description: "NBA Finals showdown",
    category: "Sports",
    sport: "Basketball",
    league: "NBA",
    homeTeam: "Golden State Warriors",
    awayTeam: "Boston Celtics",
    startTime: getFutureDate(2, 15),
    endTime: getFutureDate(2, 18)
  },
  {
    title: "Rafael Nadal vs Novak Djokovic - Wimbledon Final",
    description: "Tennis legends clash at Wimbledon",
    category: "Sports",
    sport: "Tennis",
    league: "Wimbledon",
    homeTeam: "Rafael Nadal",
    awayTeam: "Novak Djokovic",
    startTime: getFutureDate(2, 17),
    endTime: getFutureDate(2, 20)
  },
  {
    title: "Ferrari vs Mercedes - Formula 1 Monaco GP",
    description: "The most prestigious race in Formula 1",
    category: "Sports",
    sport: "Formula 1",
    league: "F1 World Championship",
    homeTeam: "Scuderia Ferrari",
    awayTeam: "Mercedes-AMG",
    startTime: getFutureDate(2, 19),
    endTime: getFutureDate(2, 21)
  },

  // Day 3 - International
  {
    title: "Brazil vs Argentina - Copa America Final",
    description: "South American football supremacy",
    category: "Sports",
    sport: "Football",
    league: "Copa America",
    homeTeam: "Brazil",
    awayTeam: "Argentina",
    startTime: getFutureDate(3, 16),
    endTime: getFutureDate(3, 18)
  },
  {
    title: "Manchester City vs PSG - Champions League",
    description: "European elite competition",
    category: "Sports",
    sport: "Football",
    league: "UEFA Champions League",
    homeTeam: "Manchester City",
    awayTeam: "Paris Saint-Germain",
    startTime: getFutureDate(3, 20),
    endTime: getFutureDate(3, 22)
  },

  // Day 4 - American Sports
  {
    title: "Kansas City Chiefs vs Buffalo Bills - NFL",
    description: "AFC Championship contenders",
    category: "Sports",
    sport: "American Football",
    league: "NFL",
    homeTeam: "Kansas City Chiefs",
    awayTeam: "Buffalo Bills",
    startTime: getFutureDate(4, 13),
    endTime: getFutureDate(4, 16)
  },
  {
    title: "New York Yankees vs Los Angeles Dodgers - World Series",
    description: "Baseball's biggest stage",
    category: "Sports",
    sport: "Baseball",
    league: "MLB",
    homeTeam: "New York Yankees",
    awayTeam: "Los Angeles Dodgers",
    startTime: getFutureDate(4, 17),
    endTime: getFutureDate(4, 20)
  },
  {
    title: "Toronto Maple Leafs vs Montreal Canadiens - NHL",
    description: "Original Six rivalry",
    category: "Sports",
    sport: "Ice Hockey",
    league: "NHL",
    homeTeam: "Toronto Maple Leafs",
    awayTeam: "Montreal Canadiens",
    startTime: getFutureDate(4, 19),
    endTime: getFutureDate(4, 22)
  },

  // Day 5 - Serie A & More
  {
    title: "AC Milan vs Juventus - Serie A Derby",
    description: "Italian football giants clash",
    category: "Sports",
    sport: "Football",
    league: "Serie A",
    homeTeam: "AC Milan",
    awayTeam: "Juventus",
    startTime: getFutureDate(5, 15),
    endTime: getFutureDate(5, 17)
  },
  {
    title: "Atletico Madrid vs Sevilla - La Liga",
    description: "Spanish football rivalry",
    category: "Sports",
    sport: "Football",
    league: "La Liga",
    homeTeam: "Atletico Madrid",
    awayTeam: "Sevilla",
    startTime: getFutureDate(5, 18),
    endTime: getFutureDate(5, 20)
  },

  // Day 6 - Combat Sports & Esports
  {
    title: "Conor McGregor vs Khabib Nurmagomedov - UFC Championship",
    description: "MMA's biggest rivalry returns",
    category: "Sports",
    sport: "MMA",
    league: "UFC",
    homeTeam: "Conor McGregor",
    awayTeam: "Khabib Nurmagomedov",
    startTime: getFutureDate(6, 16),
    endTime: getFutureDate(6, 19)
  },
  {
    title: "Team Liquid vs FaZe Clan - CS:GO Major Final",
    description: "Counter-Strike's premier tournament",
    category: "Esports",
    sport: "CS:GO",
    league: "Major Championship",
    homeTeam: "Team Liquid",
    awayTeam: "FaZe Clan",
    startTime: getFutureDate(6, 20),
    endTime: getFutureDate(6, 23)
  },

  // Day 7 - Rugby & More
  {
    title: "Australia vs New Zealand - Rugby World Cup",
    description: "Trans-Tasman rugby rivalry",
    category: "Sports",
    sport: "Rugby",
    league: "Rugby World Cup",
    homeTeam: "Australia",
    awayTeam: "New Zealand",
    startTime: getFutureDate(7, 14),
    endTime: getFutureDate(7, 16)
  },

  // Week 2 - Olympics & International
  {
    title: "USA vs Japan - Olympic Basketball Final",
    description: "Olympic gold medal basketball game",
    category: "Sports",
    sport: "Basketball",
    league: "Olympics",
    homeTeam: "USA",
    awayTeam: "Japan",
    startTime: getFutureDate(8, 13),
    endTime: getFutureDate(8, 15)
  },
  {
    title: "Simone Biles - Gymnastics All-Around Competition",
    description: "Olympic gymnastics excellence",
    category: "Sports",
    sport: "Gymnastics",
    league: "Olympics",
    homeTeam: "Simone Biles",
    awayTeam: "Field",
    startTime: getFutureDate(8, 15),
    endTime: getFutureDate(8, 18)
  },
  {
    title: "Kenya vs Ethiopia - Marathon World Record Attempt",
    description: "Distance running supremacy",
    category: "Sports",
    sport: "Athletics",
    league: "World Athletics",
    homeTeam: "Kenya",
    awayTeam: "Ethiopia",
    startTime: getFutureDate(8, 17),
    endTime: getFutureDate(8, 20)
  },

  // Day 9 - Esports
  {
    title: "T1 vs DWG KIA - League of Legends World Championship",
    description: "LoL's biggest tournament",
    category: "Esports",
    sport: "League of Legends",
    league: "World Championship",
    homeTeam: "T1",
    awayTeam: "DWG KIA",
    startTime: getFutureDate(9, 14),
    endTime: getFutureDate(9, 18)
  },
  {
    title: "Ninja vs Shroud - Fortnite Celebrity Tournament",
    description: "Streaming legends compete",
    category: "Esports",
    sport: "Fortnite",
    league: "Celebrity Tournament",
    homeTeam: "Ninja",
    awayTeam: "Shroud",
    startTime: getFutureDate(9, 18),
    endTime: getFutureDate(9, 21)
  },

  // Day 10 - Boxing & Winter Sports
  {
    title: "Canelo Alvarez vs Gennady Golovkin III - Boxing",
    description: "Boxing trilogy conclusion",
    category: "Sports",
    sport: "Boxing",
    league: "Professional Boxing",
    homeTeam: "Canelo Alvarez",
    awayTeam: "Gennady Golovkin",
    startTime: getFutureDate(10, 16),
    endTime: getFutureDate(10, 19)
  },
  {
    title: "Norway vs Sweden - Ski Jumping World Cup",
    description: "Nordic skiing rivalry",
    category: "Sports",
    sport: "Ski Jumping",
    league: "World Cup",
    homeTeam: "Norway",
    awayTeam: "Sweden",
    startTime: getFutureDate(10, 12),
    endTime: getFutureDate(10, 14)
  },

  // Entertainment & Special Events
  {
    title: "Oscars 2024 - Best Picture Winner Prediction",
    description: "Hollywood's biggest night",
    category: "Entertainment",
    sport: "Awards",
    league: "Academy Awards",
    homeTeam: "Nominees",
    awayTeam: "Field",
    startTime: getFutureDate(11, 20),
    endTime: getFutureDate(11, 23)
  },
  {
    title: "Grammy Awards - Album of the Year 2024",
    description: "Music's premier awards ceremony",
    category: "Entertainment",
    sport: "Awards",
    league: "Grammy Awards",
    homeTeam: "Nominees",
    awayTeam: "Field",
    startTime: getFutureDate(12, 20),
    endTime: getFutureDate(12, 23)
  },

  // More International Football
  {
    title: "Boca Juniors vs River Plate - Copa Libertadores",
    description: "Argentine football's greatest rivalry",
    category: "Sports",
    sport: "Football",
    league: "Copa Libertadores",
    homeTeam: "Boca Juniors",
    awayTeam: "River Plate",
    startTime: getFutureDate(13, 15),
    endTime: getFutureDate(13, 17)
  },
  {
    title: "Flamengo vs Palmeiras - Brazilian Championship",
    description: "Brazilian football powerhouses",
    category: "Sports",
    sport: "Football",
    league: "Campeonato Brasileiro",
    homeTeam: "Flamengo",
    awayTeam: "Palmeiras",
    startTime: getFutureDate(13, 17),
    endTime: getFutureDate(13, 19)
  },
  {
    title: "Celtic vs Rangers - Scottish Premier League",
    description: "The Old Firm derby",
    category: "Sports",
    sport: "Football",
    league: "Scottish Premiership",
    homeTeam: "Celtic",
    awayTeam: "Rangers",
    startTime: getFutureDate(13, 19),
    endTime: getFutureDate(13, 21)
  },

  // Cricket & Tennis
  {
    title: "India vs England - Cricket World Cup Final",
    description: "Cricket's ultimate prize",
    category: "Sports",
    sport: "Cricket",
    league: "Cricket World Cup",
    homeTeam: "India",
    awayTeam: "England",
    startTime: getFutureDate(14, 16),
    endTime: getFutureDate(14, 21)
  },
  {
    title: "Novak Djokovic vs Carlos Alcaraz - US Open Final",
    description: "Tennis generations collide",
    category: "Sports",
    sport: "Tennis",
    league: "US Open",
    homeTeam: "Novak Djokovic",
    awayTeam: "Carlos Alcaraz",
    startTime: getFutureDate(14, 18),
    endTime: getFutureDate(14, 21)
  },

  // Motor Sports & Golf
  {
    title: "Red Bull vs Mercedes - Formula 1 Constructors Championship",
    description: "F1 team championship battle",
    category: "Sports",
    sport: "Formula 1",
    league: "F1 World Championship",
    homeTeam: "Red Bull Racing",
    awayTeam: "Mercedes-AMG",
    startTime: getFutureDate(15, 14),
    endTime: getFutureDate(15, 16)
  },
  {
    title: "Tiger Woods vs Phil Mickelson - The Match VII",
    description: "Golf legends exhibition",
    category: "Sports",
    sport: "Golf",
    league: "Exhibition",
    homeTeam: "Tiger Woods",
    awayTeam: "Phil Mickelson",
    startTime: getFutureDate(15, 13),
    endTime: getFutureDate(15, 17)
  },

  // Special Events
  {
    title: "SpaceX - Mars Mission Launch Success Prediction",
    description: "Will the Mars mission launch successfully?",
    category: "Technology",
    sport: "Space",
    league: "SpaceX",
    homeTeam: "Success",
    awayTeam: "Delay/Failure",
    startTime: getFutureDate(16, 10),
    endTime: getFutureDate(16, 12)
  },
  {
    title: "World Chess Championship - Magnus Carlsen Defense",
    description: "Chess world championship match",
    category: "Sports",
    sport: "Chess",
    league: "World Championship",
    homeTeam: "Magnus Carlsen",
    awayTeam: "Challenger",
    startTime: getFutureDate(16, 14),
    endTime: getFutureDate(16, 18)
  }
];

// Aggiungi partite entro 24h
const now = new Date();
const within24h1 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // +2h
const within24h2 = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString(); // +10h

matchData.unshift(
  {
    title: "Napoli vs Roma - Serie A",
    description: "Big match in Serie A",
    category: "Sports",
    sport: "Football",
    league: "Serie A",
    homeTeam: "Napoli",
    awayTeam: "Roma",
    startTime: within24h1,
    endTime: new Date(new Date(within24h1).getTime() + 2 * 60 * 60 * 1000).toISOString()
  },
  {
    title: "Juventus vs Milan - Serie A",
    description: "Classic Italian derby",
    category: "Sports",
    sport: "Football",
    league: "Serie A",
    homeTeam: "Juventus",
    awayTeam: "Milan",
    startTime: within24h2,
    endTime: new Date(new Date(within24h2).getTime() + 2 * 60 * 60 * 1000).toISOString()
  }
);

const CLEAR_DB = false; // Cambia a true solo se vuoi resettare tutto

// Helper to shift a date string by N days/hours in the future
function shiftDateToFuture(originalDate, minHoursAhead = 2) {
  const now = new Date();
  let date = new Date(originalDate);
  // If already in the future, return as is
  if (date > now) return date.toISOString();
  // Otherwise, shift to at least minHoursAhead in the future
  date = new Date(now.getTime() + minHoursAhead * 60 * 60 * 1000);
  return date.toISOString();
}

async function matchExists(title, startTime) {
  const match = await database.get(
    'SELECT id FROM matches WHERE title = ? AND start_time = ?',
    [title, startTime]
  );
  return !!match;
}

async function updateExpiredMatchesToFuture() {
  const now = new Date();
  const matches = await database.all('SELECT id, start_time, end_time FROM matches');
  for (const match of matches) {
    const start = new Date(match.start_time);
    if (start < now) {
      // Sposta la partita nel futuro (es: +2h da ora)
      const newStart = shiftDateToFuture(match.start_time, 2);
      const newEnd = shiftDateToFuture(match.end_time || match.start_time, 4);
      await database.run(
        'UPDATE matches SET start_time = ?, end_time = ?, updated_at = datetime("now") WHERE id = ?',
        [newStart, newEnd, match.id]
      );
      console.log(`🔄 Spostata partita ID ${match.id} nel futuro (${newStart})`);
    }
  }
}

async function populateMatches() {
  try {
    console.log('🚀 Starting database population (safe mode)...');
    await database.initialize();

    // Step 0: Sposta partite scadute nel futuro
    await updateExpiredMatchesToFuture();

    // Step 1: Crea utenti solo se non esistono
    console.log('👥 Creating users (skip if exists)...');
    for (const userData of usersData) {
      try {
        const existing = await database.get('SELECT id FROM users WHERE email = ?', [userData.email]);
        if (!existing) {
          await authService.register(userData.username, userData.email, userData.password);
          console.log(`✅ Created user: ${userData.username}`);
        } else {
          console.log(`⏩ User already exists: ${userData.username}`);
        }
      } catch (error) {
        console.error(`❌ Failed to create user: ${userData.username} - ${error.message}`);
      }
    }

    // Step 2: Crea partite solo se non esistono (con startTime nel futuro)
    console.log('\n⚽ Creating matches (skip if exists)...');
    for (const match of matchData) {
      try {
        // Se la partita esiste già, aggiorna la data se è scaduta
        const existing = await database.get('SELECT id, start_time FROM matches WHERE title = ?', [match.title]);
        if (!existing) {
          await matchService.createMatch(match);
          console.log(`✅ Created match: ${match.title}`);
        } else {
          // Se la partita esiste ma è scaduta, aggiorna la data
          const start = new Date(existing.start_time);
          if (start < new Date()) {
            const newStart = shiftDateToFuture(match.startTime, 2);
            const newEnd = shiftDateToFuture(match.endTime || match.startTime, 4);
            await database.run(
              'UPDATE matches SET start_time = ?, end_time = ?, updated_at = datetime("now") WHERE id = ?',
              [newStart, newEnd, existing.id]
            );
            console.log(`🔄 Updated match "${match.title}" to new start time: ${newStart}`);
          } else {
            console.log(`⏩ Match already exists and is upcoming: ${match.title}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to create/update match: ${match.title} - ${error.message}`);
      }
    }

    console.log('🎉 Database population complete!');

    // Get and display detailed stats
    const stats = await matchService.getMatchStats();
    console.log('\n📈 Final Database Statistics:');
    console.log(`Total matches: ${stats.total}`);
    console.log('By category:', stats.byCategory);
    console.log('By sport:', stats.bySport);
    
    console.log('\n✅ Initial data population complete. Run `addParimutuelTestData.js` to add sample bets.');

    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating database:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  (async () => {
    await populateMatches();
  })();
}

module.exports = { populateMatches, matchData, usersData };
