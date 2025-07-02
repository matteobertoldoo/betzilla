const database = require('../database');
const matchService = require('../services/matchService');

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

async function populateMatches() {
  try {
    console.log('🚀 Starting to populate matches database...');
    
    // Initialize database
    await database.initialize();
    
    let successCount = 0;
    let errorCount = 0;

    for (const match of matchData) {
      try {
        await matchService.createMatch(match);
        console.log(`✅ Created: ${match.title}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to create: ${match.title} - ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n🎉 Match population complete!');
    console.log(`✅ Successfully created: ${successCount} matches`);
    console.log(`❌ Failed to create: ${errorCount} matches`);
    console.log(`📊 Total matches in database: ${successCount}`);

    // Get and display stats
    const stats = await matchService.getMatchStats();
    console.log('\n📈 Database Statistics:');
    console.log(`Total matches: ${stats.total}`);
    console.log('By category:', stats.byCategory);
    console.log('By sport:', stats.bySport);

    await database.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating matches:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  populateMatches();
}

module.exports = { populateMatches, matchData };
