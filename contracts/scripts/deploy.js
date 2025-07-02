const hre = require("hardhat");
const axios = require('axios');

async function main() {
  console.log("🚀 Deploying BetZilla contract...");

  const BetZilla = await hre.ethers.getContractFactory("BetZilla");
  const betzilla = await BetZilla.deploy();

  await betzilla.waitForDeployment();

  const address = await betzilla.getAddress();
  console.log("✅ BetZilla deployed to:", address);

  // Create markets from database
  console.log("📊 Creating markets from database...");
  
  try {
    // Fetch matches from the backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.get(`${backendUrl}/api/matches?upcoming=true&limit=30`);
    
    if (response.data.success && response.data.data.length > 0) {
      const matches = response.data.data;
      let marketCount = 0;
      
      for (const match of matches) {
        try {
          // Convert start time to Unix timestamp
          const startTimestamp = Math.floor(new Date(match.start_time).getTime() / 1000);
          
          // Create market on blockchain
          await betzilla.createMarket(match.title, startTimestamp);
          
          // Update match with contract market ID
          const marketCountBigInt = await betzilla.marketCount();
          const contractMarketId = Number(marketCountBigInt); // Market ID equals marketCount after creation
          
          try {
            await axios.patch(`${backendUrl}/api/matches/${match.id}/market`, {
              contractMarketId: contractMarketId
            });
          } catch (updateError) {
            console.warn(`⚠️ Failed to update match ${match.id} with market ID: ${updateError.message}`);
          }
          
          console.log(`✅ Created market: ${match.title} (Market ID: ${contractMarketId})`);
          marketCount++;
        } catch (error) {
          console.error(`❌ Failed to create market for: ${match.title} - ${error.message}`);
        }
      }
      
      console.log(`\n🎉 Successfully created ${marketCount} markets from database!`);
    } else {
      console.log("⚠️ No matches found in database, creating sample markets...");
      await createSampleMarkets(betzilla);
    }
  } catch (error) {
    console.warn(`⚠️ Could not connect to backend (${error.message}), creating sample markets...`);
    await createSampleMarkets(betzilla);
  }

  console.log("🎉 Deployment complete!");
  console.log(`📊 Total markets created: ${Number(await betzilla.marketCount())}`);
  console.log("Contract address:", address);
}

// Fallback function to create sample markets if database is not available
async function createSampleMarkets(betzilla) {
  console.log("🔄 Creating fallback sample markets...");
  
  const currentTime = Math.floor(Date.now() / 1000);
  
  const sampleMarkets = [
    { title: "Real Madrid vs Barcelona - El Clasico", time: currentTime + 3600 },
    { title: "Chelsea vs Arsenal - Premier League", time: currentTime + 7200 },
    { title: "Bayern Munich vs Dortmund - Bundesliga", time: currentTime + 10800 },
    { title: "Lakers vs Warriors - NBA Finals", time: currentTime + 14400 },
    { title: "Nadal vs Djokovic - Wimbledon Final", time: currentTime + 18000 }
  ];

  for (const market of sampleMarkets) {
    try {
      await betzilla.createMarket(market.title, market.time);
      console.log(`✅ Created sample market: ${market.title}`);
    } catch (error) {
      console.error(`❌ Failed to create sample market: ${market.title} - ${error.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 